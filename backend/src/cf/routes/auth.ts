import { Hono } from 'hono';
import { jwtSign, jwtVerify, hashPassword, requireAuth } from '../main';

type Bindings = { DB: D1Database; JWT_SECRET: string };
type Variables = { userId: string; userRole: string; userEmail: string };

export function authRoutes(app: Hono<{ Bindings: Bindings; Variables: Variables }>) {

  // ─── Register ──────────────────────────────────────

  app.post('/api/auth/register', async (c) => {
    try {
      const { email, password, name, role } = await c.req.json();
      if (!email || !password) return c.json({ error: 'Email and password required' }, 400);

      const { results: existing } = await c.env.DB
        .prepare('SELECT id FROM users WHERE email = ? ')
        .bind(email)
        .all();
      if (existing.length) return c.json({ error: 'Email already registered' }, 409);

      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const hashedPassword = await hashPassword(password, email);

      await c.env.DB
        .prepare(
          'INSERT INTO users (id, email, password, name, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(id, email, hashedPassword, name || '', role || 'user', now, now)
        .run();

      const token = await jwtSign(
        { sub: id, email, role: role || 'user', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 },
        c.env.JWT_SECRET,
      );

      return c.json({ data: { id, email, name, role: role || 'user', token } }, 201);
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // ─── Login ─────────────────────────────────────────

  app.post('/api/auth/login', async (c) => {
    try {
      const { email, password } = await c.req.json();
      if (!email || !password) return c.json({ error: 'Email and password required' }, 400);

      const { results } = await c.env.DB
        .prepare('SELECT * FROM users WHERE email = ? ')
        .bind(email)
        .all();
      if (!results.length) return c.json({ error: 'Invalid credentials' }, 401);

      const user = results[0] as any;
      const hashedInput = await hashPassword(password, email);
      if (hashedInput !== user.password) return c.json({ error: 'Invalid credentials' }, 401);

      const token = await jwtSign(
        { sub: user.id, email: user.email, role: user.role, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 },
        c.env.JWT_SECRET,
      );

      return c.json({ data: { id: user.id, email: user.email, name: user.name, role: user.role, token } });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // ─── Profile ───────────────────────────────────────

  app.get('/api/auth/profile', requireAuth, async (c) => {
    try {
      const { results } = await c.env.DB
        .prepare('SELECT id, email, name, role, createdAt FROM users WHERE id = ? ')
        .bind(c.get('userId'))
        .all();
      if (!results.length) return c.json({ error: 'User not found' }, 404);
      return c.json({ data: results[0] });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // ─── Logout (blacklist token) ──────────────────────

  app.post('/api/auth/logout', requireAuth, async (c) => {
    try {
      const authHeader = c.req.header('Authorization');
      const token = authHeader!.slice(7);
      const payload = await jwtVerify(token, c.env.JWT_SECRET);
      const now = new Date().toISOString();

      await c.env.DB
        .prepare('INSERT INTO token_blacklist (token, userId, expiresAt, createdAt) VALUES (?, ?, ?, ?)')
        .bind(token, c.get('userId'), new Date((payload.exp as number) * 1000).toISOString(), now)
        .run();

      return c.json({ message: 'Logged out' });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // ─── Refresh Token ─────────────────────────────────

  app.post('/api/auth/refresh', requireAuth, async (c) => {
    try {
      const authHeader = c.req.header('Authorization');
      const oldToken = authHeader!.slice(7);

      // Blacklist old token
      const payload = await jwtVerify(oldToken, c.env.JWT_SECRET);
      const now = new Date().toISOString();
      await c.env.DB
        .prepare('INSERT INTO token_blacklist (token, userId, expiresAt, createdAt) VALUES (?, ?, ?, ?)')
        .bind(oldToken, c.get('userId'), new Date((payload.exp as number) * 1000).toISOString(), now)
        .run();

      // Issue new token
      const newToken = await jwtSign(
        {
          sub: payload.sub,
          email: payload.email,
          role: payload.role,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 86400,
        },
        c.env.JWT_SECRET,
      );

      return c.json({ data: { token: newToken } });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // ─── Forgot Password (generate OTP) ────────────────

  app.post('/api/auth/forgot-password', async (c) => {
    try {
      const { email } = await c.req.json();
      if (!email) return c.json({ error: 'Email required' }, 400);

      const { results } = await c.env.DB
        .prepare('SELECT id FROM users WHERE email = ? ')
        .bind(email)
        .all();
      if (!results.length) return c.json({ message: 'If the email exists, an OTP has been sent' });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      await c.env.DB
        .prepare('INSERT INTO otps (id, email, otp, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), email, otp, expiresAt, now)
        .run();

      // In production: send OTP via email service
      return c.json({ message: 'If the email exists, an OTP has been sent', ...(process.env.NODE_ENV !== 'production' && { otp }) });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // ─── Reset Password ────────────────────────────────

  app.post('/api/auth/reset-password', async (c) => {
    try {
      const { email, otp, newPassword } = await c.req.json();
      if (!email || !otp || !newPassword) return c.json({ error: 'Email, OTP, and new password required' }, 400);

      const { results } = await c.env.DB
        .prepare('SELECT * FROM otps WHERE email = ? AND otp = ? AND expiresAt > ? ORDER BY createdAt DESC LIMIT 1')
        .bind(email, otp, new Date().toISOString())
        .all();

      if (!results.length) return c.json({ error: 'Invalid or expired OTP' }, 400);

      const now = new Date().toISOString();
      const hashedPassword = await hashPassword(newPassword, email);

      await c.env.DB
        .prepare('UPDATE users SET password = ?, updatedAt = ? WHERE email = ? ')
        .bind(hashedPassword, now, email)
        .run();

      // Delete used OTPs for this email
      await c.env.DB
        .prepare('DELETE FROM otps WHERE email = ?')
        .bind(email)
        .run();

      return c.json({ message: 'Password reset successfully' });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });
}
