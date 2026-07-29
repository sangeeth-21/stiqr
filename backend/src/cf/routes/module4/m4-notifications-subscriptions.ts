export function m4NotificationsSubscriptionsRoutes(app: any) {

  // ─── NOTIFICATION ENDPOINTS ───────────────────────────────

  app.post('/api/notifications/send', async (c) => {
    try {
      const db = c.env.DB;
      const { userId, title, message, type } = await c.req.json();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.prepare(
        `INSERT INTO notifications (id, userId, type, title, body, createdAt) VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(id, userId, type || 'MANUAL', title, message, now).run();
      return c.json({ data: { id, userId, title, message, type: type || 'MANUAL' } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/notifications/sms', async (c) => {
    try {
      const db = c.env.DB;
      const { recipient, message } = await c.req.json();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.prepare(
        `INSERT INTO notifications (id, type, title, body, createdAt) VALUES (?, ?, ?, ?, ?)`
      ).bind(id, 'SMS', `SMS to ${recipient}`, message, now).run();
      return c.json({ data: { id, recipient, message, type: 'SMS' } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/notifications/email', async (c) => {
    try {
      const db = c.env.DB;
      const { recipient, subject, message } = await c.req.json();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.prepare(
        `INSERT INTO notifications (id, type, title, body, createdAt) VALUES (?, ?, ?, ?, ?)`
      ).bind(id, 'EMAIL', subject || `Email to ${recipient}`, message, now).run();
      return c.json({ data: { id, recipient, subject, message, type: 'EMAIL' } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/notifications/whatsapp', async (c) => {
    try {
      const db = c.env.DB;
      const { recipient, message } = await c.req.json();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.prepare(
        `INSERT INTO notifications (id, type, title, body, createdAt) VALUES (?, ?, ?, ?, ?)`
      ).bind(id, 'WHATSAPP', `WhatsApp to ${recipient}`, message, now).run();
      return c.json({ data: { id, recipient, message, type: 'WHATSAPP' } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/notifications/push', async (c) => {
    try {
      const db = c.env.DB;
      const { userId, title, message } = await c.req.json();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.prepare(
        `INSERT INTO notifications (id, userId, type, title, body, createdAt) VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(id, userId, 'PUSH', title, message, now).run();
      return c.json({ data: { id, userId, title, message, type: 'PUSH' } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/notifications/:id', async (c) => {
    try {
      const db = c.env.DB;
      const { id } = c.req.param();
      const notification = await db.prepare('SELECT * FROM notifications WHERE id = ?').bind(id).first();
      if (!notification) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: notification });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/notifications/broadcast', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const { title, message, type } = await c.req.json();
      const now = new Date().toISOString();
      const { results: users } = await db.prepare("SELECT id FROM users WHERE shopId = ? AND status = 'ACTIVE'").bind(shopId).all();
      const rows = (users as any)?.results || [];
      const created: any[] = [];
      for (const user of rows) {
        const id = crypto.randomUUID();
        await db.prepare('INSERT INTO notifications (id, userId, type, title, body, createdAt) VALUES (?, ?, ?, ?, ?, ?)').bind(id, user.id, type || 'BROADCAST', title, message, now).run();
        created.push({ id, userId: user.id });
      }
      return c.json({ data: { count: created.length, notifications: created } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/notifications/schedule', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const { userId, title, message, type, scheduledAt } = await c.req.json();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      await db.prepare(
        `CREATE TABLE IF NOT EXISTS scheduled_notifications (id TEXT PRIMARY KEY, shopId TEXT, userId TEXT, title TEXT, message TEXT, type TEXT, scheduledAt TEXT, status TEXT DEFAULT 'PENDING', createdAt TEXT)`
      ).run();

      await db.prepare(
        `INSERT INTO scheduled_notifications (id, shopId, userId, title, message, type, scheduledAt, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`
      ).bind(id, shopId, userId, title, message, type || 'SCHEDULED', scheduledAt, now).run();

      return c.json({ data: { id, userId, title, message, type: type || 'SCHEDULED', scheduledAt, status: 'PENDING' } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ─── SUBSCRIPTION ENDPOINTS ──────────────────────────────

  app.get('/api/subscriptions', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const limit = Math.min(parseInt(c.req.query('limit') || '10'), 100);
      const offset = parseInt(c.req.query('offset') || '0');

      const { results } = await db.prepare(
        `SELECT * FROM subscriptions WHERE tenantId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?`
      ).bind(shopId, limit, offset).all();

      const { results: countRes } = await db.prepare(
        `SELECT COUNT(*) as total FROM subscriptions WHERE tenantId = ?`
      ).bind(shopId).all();

      return c.json({
        data: results,
        total: (countRes as any)[0]?.total || 0,
        limit,
        offset,
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/subscriptions/current', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;

      const subscription = await db.prepare(
        `SELECT * FROM subscriptions WHERE tenantId = ? AND status = 'ACTIVE' ORDER BY createdAt DESC LIMIT 1`
      ).bind(shopId).first();

      if (!subscription) return c.json({ error: 'No active subscription found' }, 404);

      return c.json({ data: subscription });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/subscriptions/history', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;

      const { results } = await db.prepare(
        `SELECT * FROM subscriptions WHERE tenantId = ? ORDER BY createdAt DESC`
      ).bind(shopId).all();

      return c.json({ data: results || [] });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/subscriptions/create', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const { plan, amount, startDate, endDate } = await c.req.json();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      await db.prepare(
        `INSERT INTO subscriptions (id, tenantId, plan, status, startDate, endDate, monthlyPrice, createdAt, updatedAt) VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?)`
      ).bind(id, shopId, plan, startDate || now, endDate || null, amount || 0, now, now).run();

      return c.json({ data: { id, plan, status: 'ACTIVE', startDate: startDate || now, endDate: endDate || null, amount: amount || 0 } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/subscriptions/upgrade', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const { plan, amount, endDate } = await c.req.json();
      const now = new Date().toISOString();

      const current = await db.prepare(
        `SELECT id, plan, endDate FROM subscriptions WHERE tenantId = ? AND status = 'ACTIVE' ORDER BY createdAt DESC LIMIT 1`
      ).bind(shopId).first() as any;

      if (current) {
        await db.prepare(
          `UPDATE subscriptions SET status = 'UPGRADED', updatedAt = ? WHERE id = ?`
        ).bind(now, current.id).run();

        await db.prepare(
          `INSERT INTO subscription_history (id, subscriptionId, action, oldPlan, newPlan, oldEndDate, newEndDate, amount, createdAt) VALUES (?, ?, 'UPGRADED', ?, ?, ?, ?, ?, ?)`
        ).bind(crypto.randomUUID(), current.id, current.plan, plan, current.endDate, endDate || null, amount || 0, now).run();
      }

      const id = crypto.randomUUID();
      await db.prepare(
        `INSERT INTO subscriptions (id, tenantId, plan, status, startDate, endDate, monthlyPrice, createdAt, updatedAt) VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?)`
      ).bind(id, shopId, plan, now, endDate || null, amount || 0, now, now).run();

      return c.json({ data: { id, plan, status: 'ACTIVE', amount: amount || 0, previousId: current?.id || null } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/subscriptions/downgrade', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const { plan, amount } = await c.req.json();
      const now = new Date().toISOString();

      const current = await db.prepare(
        `SELECT id, plan, endDate FROM subscriptions WHERE tenantId = ? AND status = 'ACTIVE' ORDER BY createdAt DESC LIMIT 1`
      ).bind(shopId).first() as any;

      if (!current) return c.json({ error: 'No active subscription found' }, 404);

      await db.prepare(
        `UPDATE subscriptions SET plan = ?, monthlyPrice = ?, updatedAt = ? WHERE id = ?`
      ).bind(plan, amount || 0, now, current.id).run();

      await db.prepare(
        `INSERT INTO subscription_history (id, subscriptionId, action, oldPlan, newPlan, amount, notes, createdAt) VALUES (?, ?, 'DOWNGRADED', ?, ?, ?, ?, ?)`
      ).bind(crypto.randomUUID(), current.id, current.plan, plan, amount || 0, 'Downgraded', now).run();

      return c.json({ data: { id: current.id, plan, amount: amount || 0, status: 'ACTIVE' } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/subscriptions/renew', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const { amount, endDate } = await c.req.json();
      const now = new Date().toISOString();

      const current = await db.prepare(
        `SELECT id, plan, endDate FROM subscriptions WHERE tenantId = ? AND status = 'ACTIVE' ORDER BY createdAt DESC LIMIT 1`
      ).bind(shopId).first() as any;

      if (current) {
        await db.prepare(
          `UPDATE subscriptions SET endDate = ?, monthlyPrice = ?, updatedAt = ? WHERE id = ?`
        ).bind(endDate || null, amount || 0, now, current.id).run();

        await db.prepare(
          `INSERT INTO subscription_history (id, subscriptionId, action, oldEndDate, newEndDate, amount, createdAt) VALUES (?, ?, 'RENEWED', ?, ?, ?, ?)`
        ).bind(crypto.randomUUID(), current.id, current.endDate, endDate || null, amount || 0, now).run();

        return c.json({ data: { id: current.id, endDate: endDate || null, amount: amount || 0, status: 'ACTIVE' } });
      }

      const id = crypto.randomUUID();
      await db.prepare(
        `INSERT INTO subscriptions (id, tenantId, plan, status, startDate, endDate, monthlyPrice, createdAt, updatedAt) VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?)`
      ).bind(id, shopId, 'RENEWED', now, endDate || null, amount || 0, now, now).run();

      return c.json({ data: { id, endDate: endDate || null, amount: amount || 0, status: 'ACTIVE' } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/subscriptions/cancel', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const { reason } = await c.req.json();
      const now = new Date().toISOString();

      const current = await db.prepare(
        `SELECT id, plan FROM subscriptions WHERE tenantId = ? AND status = 'ACTIVE' ORDER BY createdAt DESC LIMIT 1`
      ).bind(shopId).first() as any;

      if (!current) return c.json({ error: 'No active subscription found' }, 404);

      await db.prepare(
        `UPDATE subscriptions SET status = 'CANCELLED', updatedAt = ? WHERE id = ?`
      ).bind(now, current.id).run();

      await db.prepare(
        `INSERT INTO subscription_history (id, subscriptionId, action, amount, notes, createdAt) VALUES (?, ?, 'CANCELLED', 0, ?, ?)`
      ).bind(crypto.randomUUID(), current.id, reason || 'Cancelled', now).run();

      return c.json({ data: { id: current.id, status: 'CANCELLED', reason: reason || null } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/subscriptions/invoices', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;

      const { results } = await db.prepare(
        `SELECT * FROM payments WHERE shopId = ? AND entityType = 'SUBSCRIPTION' ORDER BY createdAt DESC`
      ).bind(shopId).all();

      return c.json({ data: results || [] });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/subscriptions/features', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;

      await db.prepare(
        `CREATE TABLE IF NOT EXISTS subscription_features (id TEXT PRIMARY KEY, shopId TEXT, plan TEXT, featureKey TEXT, featureValue TEXT, createdAt TEXT)`
      ).run();

      const current = await db.prepare(
        `SELECT plan FROM subscriptions WHERE tenantId = ? AND status = 'ACTIVE' ORDER BY createdAt DESC LIMIT 1`
      ).bind(shopId).first() as any;

      if (!current) return c.json({ data: [] });

      const { results } = await db.prepare(
        `SELECT * FROM subscription_features WHERE shopId = ? AND plan = ? ORDER BY featureKey ASC`
      ).bind(shopId, current.plan).all();

      return c.json({ data: results || [] });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });
}
