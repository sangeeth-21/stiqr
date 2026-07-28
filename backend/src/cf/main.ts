import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = { DB: D1Database; JWT_SECRET: string };
type Variables = { userId: string; userRole: string; userEmail: string };

export type { Bindings, Variables };

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Helpers ────────────────────────────────────────────

function base64urlEncode(data: Uint8Array): string {
  let binary = '';
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): Uint8Array {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function encoder(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

async function hmacSign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', encoder(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder(data));
  return base64urlEncode(new Uint8Array(sig));
}

export async function jwtSign(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = base64urlEncode(encoder(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = base64urlEncode(encoder(JSON.stringify(payload)));
  const signature = await hmacSign(secret, `${header}.${body}`);
  return `${header}.${body}.${signature}`;
}

export async function jwtVerify(token: string, secret: string): Promise<Record<string, unknown>> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const [header, body, signature] = parts;
  const expectedSig = await hmacSign(secret, `${header}.${body}`);
  if (signature !== expectedSig) throw new Error('Invalid signature');
  const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(body)));
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) throw new Error('Token expired');
  return payload;
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const data = encoder(`${password}:${salt}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64urlEncode(new Uint8Array(hash));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── Auth Middleware ────────────────────────────────────

export async function requireAuth(c: any, next: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }
  try {
    const payload = await jwtVerify(authHeader.slice(7), c.env.JWT_SECRET);
    c.set('userId', payload.sub as string);
    c.set('userRole', payload.role as string);
    c.set('userEmail', payload.email as string);
    await next();
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
}

// ─── CRUD Factory ──────────────────────────────────────

interface CrudOptions {
  searchable?: string[];
  updatable?: string[];
  required?: string[];
  defaults?: Record<string, any>;
}

export function crud(table: string, options: CrudOptions = {}) {
  const r = new Hono<{ Bindings: Bindings; Variables: Variables }>();
  const { searchable = [], updatable = [], required = [], defaults = {} } = options;

  // LIST
  r.get('/', async (c) => {
    try {
      const db = c.env.DB;
      const search = c.req.query('search') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');

      let query = `SELECT * FROM ${table}`;
      const params: any[] = [];

      if (search && searchable.length > 0) {
        const conditions = searchable.map((col) => `${col} LIKE ?`);
        query += ` WHERE (${conditions.join(' OR ')})`;
        for (let i = 0; i < searchable.length; i++) params.push(`%${search}%`);
      }

      query += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const { results } = await db.prepare(query).bind(...params).all();
      const countQuery = search && searchable.length > 0
        ? `SELECT COUNT(*) as total FROM ${table} WHERE (${searchable.map((c) => `${c} LIKE ?`).join(' OR ')})`
        : `SELECT COUNT(*) as total FROM ${table}`;
      const countParams = search && searchable.length > 0
        ? searchable.map(() => `%${search}%`)
        : [];
      const { results: countResult } = await db.prepare(countQuery).bind(...countParams).all();
      const total = (countResult as any)?.[0]?.total ?? 0;

      return c.json({ data: results, total, limit, offset });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // GET BY ID
  r.get('/:id', async (c) => {
    try {
      const { results } = await c.env.DB
        .prepare(`SELECT * FROM ${table} WHERE id = ?`)
        .bind(c.req.param('id'))
        .all();
      if (!results.length) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: results[0] });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // CREATE
  r.post('/', async (c) => {
    try {
      const body = await c.req.json();
      for (const field of required) {
        if (!body[field]) return c.json({ error: `${field} is required` }, 400);
      }
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const row = { id, ...defaults, ...body, createdAt: now, updatedAt: now };
      const cols = Object.keys(row);
      const placeholders = cols.map(() => '?').join(', ');
      const vals = cols.map((k) => row[k]);

      await c.env.DB
        .prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`)
        .bind(...vals)
        .run();

      return c.json({ data: row }, 201);
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // UPDATE
  r.patch('/:id', async (c) => {
    try {
      const body = await c.req.json();
      const allowed = updatable.length > 0
        ? Object.keys(body).filter((k) => updatable.includes(k))
        : Object.keys(body);

      if (!allowed.length) return c.json({ error: 'No valid fields to update' }, 400);

      const sets = allowed.map((k) => `${k} = ?`).join(', ');
      const vals = allowed.map((k) => body[k]);
      const now = new Date().toISOString();

      const { success } = await c.env.DB
        .prepare(`UPDATE ${table} SET ${sets}, updatedAt = ? WHERE id = ?`)
        .bind(...vals, now, c.req.param('id'))
        .run();

      if (!success) return c.json({ error: 'Not found or no changes' }, 404);

      const { results } = await c.env.DB
        .prepare(`SELECT * FROM ${table} WHERE id = ?`)
        .bind(c.req.param('id'))
        .all();

      return c.json({ data: results[0] });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // DELETE
  r.delete('/:id', async (c) => {
    try {
      const { success } = await c.env.DB
        .prepare(`DELETE FROM ${table} WHERE id = ?`)
        .bind(c.req.param('id'))
        .run();

      if (!success) return c.json({ error: 'Not found' }, 404);
      return c.json({ message: 'Deleted' });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  return r;
}

export default app;
