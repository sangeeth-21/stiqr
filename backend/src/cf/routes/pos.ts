import { Hono } from 'hono';
import { crud } from '../main';

type Bindings = { DB: D1Database; JWT_SECRET: string };
type Variables = { userId: string; userRole: string; userEmail: string };

export function posRoutes(app: Hono<{ Bindings: Bindings; Variables: Variables }>) {

  // ─── 1. Sales ───────────────────────────────────────
  app.route('/api/sales', crud('sales', {
    searchable: ['invoiceNumber'],
    updatable: ['status', 'paymentMethod', 'notes'],
  }));

  app.get('/api/sales/:id/items', async (c) => {
    try {
      const { results } = await c.env.DB
        .prepare('SELECT * FROM sale_items WHERE saleId = ? ')
        .bind(c.req.param('id'))
        .all();
      return c.json({ statusCode: 200, data: results });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  // ─── 2. Sale Items ──────────────────────────────────
  app.get('/api/sale-items', async (c) => {
    try {
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await c.env.DB
        .prepare('SELECT * FROM sale_items LIMIT ? OFFSET ?')
        .bind(limit, offset)
        .all();
      return c.json({ statusCode: 200, data: results });
    } catch { return c.json({ statusCode: 200, data: [] }); }
  });

  app.get('/api/sale-items/:id', async (c) => {
    try {
      const row = await c.env.DB
        .prepare('SELECT * FROM sale_items WHERE id = ? ')
        .bind(c.req.param('id'))
        .first();
      if (!row) return c.json({ statusCode: 404, error: 'Not found' }, 404);
      return c.json({ statusCode: 200, data: row });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  app.post('/api/sale-items', async (c) => {
    try {
      const body = await c.req.json();
      const { saleId, productId, quantity, unitPrice, total } = body;
      if (!saleId || !productId || quantity == null || unitPrice == null) {
        return c.json({ statusCode: 400, error: 'saleId, productId, quantity, unitPrice are required' }, 400);
      }
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await c.env.DB
        .prepare(
          'INSERT INTO sale_items (id, saleId, productId, quantity, unitPrice, total, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(id, saleId, productId, quantity, unitPrice, total || quantity * unitPrice, now, now)
        .run();
      const row = await c.env.DB.prepare('SELECT * FROM sale_items WHERE id = ?').bind(id).first();
      return c.json({ statusCode: 201, data: row }, 201);
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  // ─── 3. Purchases ───────────────────────────────────
  app.route('/api/purchases', crud('purchases', {
    updatable: ['status', 'notes'],
  }));

  app.get('/api/purchases/:id/items', async (c) => {
    try {
      const { results } = await c.env.DB
        .prepare('SELECT * FROM purchase_items WHERE purchaseId = ? ')
        .bind(c.req.param('id'))
        .all();
      return c.json({ statusCode: 200, data: results });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  // ─── 4. Purchase Items ──────────────────────────────
  app.get('/api/purchase-items', async (c) => {
    try {
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await c.env.DB
        .prepare('SELECT * FROM purchase_items LIMIT ? OFFSET ?')
        .bind(limit, offset)
        .all();
      return c.json({ statusCode: 200, data: results });
    } catch { return c.json({ statusCode: 200, data: [] }); }
  });

  app.get('/api/purchase-items/:id', async (c) => {
    try {
      const row = await c.env.DB
        .prepare('SELECT * FROM purchase_items WHERE id = ? ')
        .bind(c.req.param('id'))
        .first();
      if (!row) return c.json({ statusCode: 404, error: 'Not found' }, 404);
      return c.json({ statusCode: 200, data: row });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  app.post('/api/purchase-items', async (c) => {
    try {
      const body = await c.req.json();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const row = { id, ...body, createdAt: now, updatedAt: now };
      const cols = Object.keys(row);
      const placeholders = cols.map(() => '?').join(', ');
      const vals = cols.map((k) => row[k]);
      await c.env.DB
        .prepare(`INSERT INTO purchase_items (${cols.join(', ')}) VALUES (${placeholders})`)
        .bind(...vals)
        .run();
      const created = await c.env.DB.prepare('SELECT * FROM purchase_items WHERE id = ?').bind(id).first();
      return c.json({ statusCode: 201, data: created }, 201);
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  // ─── 5. Invoices ────────────────────────────────────
  app.route('/api/invoices', crud('invoices', {
    searchable: ['invoiceNumber'],
    updatable: ['status', 'dueDate', 'notes'],
  }));

  // ─── 6. POS Sessions ────────────────────────────────
  app.route('/api/pos/sessions', crud('pos_sessions', {
    updatable: ['status', 'closingBalance'],
  }));

  app.post('/api/pos/sessions/:id/close', async (c) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();
      const { closingBalance } = body;
      const now = new Date().toISOString();
      await c.env.DB
        .prepare(
          "UPDATE pos_sessions SET status = 'CLOSED', closingBalance = ?, closedAt = ?, closedBy = ?, updatedAt = ? WHERE id = ? "
        )
        .bind(closingBalance || 0, now, c.get('userId'), now, id)
        .run();
      const row = await c.env.DB.prepare('SELECT * FROM pos_sessions WHERE id = ?').bind(id).first();
      return c.json({ statusCode: 200, data: row });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  // ─── 7. Payments ────────────────────────────────────
  app.route('/api/payments', crud('payments', {
    searchable: ['reference'],
    updatable: ['status'],
  }));

  // ─── 8. Expenses ────────────────────────────────────
  app.route('/api/expenses', crud('expenses', {
    searchable: ['description'],
    updatable: ['category', 'amount', 'description', 'date'],
  }));

  // ─── 9. Income ──────────────────────────────────────
  app.route('/api/income', crud('income', {
    searchable: ['description'],
  }));

  // ─── 10. Service Repairs ────────────────────────────
  app.route('/api/service-repair', crud('service_repairs', {
    searchable: ['trackingId'],
    updatable: ['status', 'estimatedCost', 'actualCost', 'notes'],
  }));

  app.get('/api/service-repair/:id/items', async (c) => {
    try {
      const { results } = await c.env.DB
        .prepare('SELECT * FROM service_repair_items WHERE serviceRepairId = ? ')
        .bind(c.req.param('id'))
        .all();
      return c.json({ statusCode: 200, data: results });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  // ─── 11. Service Repair Items ───────────────────────
  app.route('/api/service-repair-items', crud('service_repair_items'));
}
