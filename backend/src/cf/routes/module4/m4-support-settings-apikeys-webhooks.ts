async function ensureModule4Tables(db: any) {
  const tables = [
    `CREATE TABLE IF NOT EXISTS support_tickets (id TEXT PRIMARY KEY, shopId TEXT NOT NULL, userId TEXT, subject TEXT NOT NULL, description TEXT, priority TEXT DEFAULT 'MEDIUM', status TEXT DEFAULT 'OPEN', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS support_replies (id TEXT PRIMARY KEY, ticketId TEXT NOT NULL, userId TEXT, message TEXT NOT NULL, createdAt TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS shop_api_keys (id TEXT PRIMARY KEY, shopId TEXT NOT NULL, name TEXT NOT NULL, key TEXT NOT NULL, permissions TEXT, lastUsedAt TEXT, status TEXT DEFAULT 'ACTIVE', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS api_key_logs (id TEXT PRIMARY KEY, shopId TEXT NOT NULL, apiKeyId TEXT, endpoint TEXT, method TEXT, ip TEXT, createdAt TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS webhooks (id TEXT PRIMARY KEY, shopId TEXT NOT NULL, name TEXT NOT NULL, url TEXT NOT NULL, events TEXT, secret TEXT, status TEXT DEFAULT 'ACTIVE', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS webhook_logs (id TEXT PRIMARY KEY, webhookId TEXT, event TEXT, status TEXT, response TEXT, createdAt TEXT NOT NULL)`
  ];
  for (const sql of tables) { await db.prepare(sql).run(); }
}

export function m4SupportSettingsApiKeysWebhooksRoutes(app: any) {

  // ==================== SUPPORT TICKET SYSTEM ====================

  app.post('/api/support', async (c) => {
    try {
      await ensureModule4Tables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const { subject, description, priority } = await c.req.json();
      if (!subject) return c.json({ error: 'subject required' }, 400);
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      await db.prepare('INSERT INTO support_tickets (id, shopId, userId, subject, description, priority, status, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?)').bind(id, shopId, c.var.userId, subject, description || null, priority || 'MEDIUM', 'OPEN', now, now).run();
      return c.json({ data: { id, subject, description, priority: priority || 'MEDIUM', status: 'OPEN', createdAt: now } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/support', async (c) => {
    try {
      await ensureModule4Tables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const status = c.req.query('status') || ''; const priority = c.req.query('priority') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      let where = 'WHERE shopId = ?'; const params: any[] = [shopId];
      if (status) { where += ' AND status = ?'; params.push(status); }
      if (priority) { where += ' AND priority = ?'; params.push(priority); }
      const { results } = await db.prepare(`SELECT * FROM support_tickets ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM support_tickets ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/support/categories', async (c) => {
    try {
      await ensureModule4Tables(c.env.DB);
      const db = c.env.DB;
      await db.prepare("CREATE TABLE IF NOT EXISTS support_categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, sortOrder INTEGER DEFAULT 0, createdAt TEXT)").run();
      const { results } = await db.prepare("SELECT * FROM support_categories ORDER BY sortOrder ASC, name ASC").all();
      return c.json({ data: results });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/support/:id', async (c) => {
    try {
      await ensureModule4Tables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const ticket = await db.prepare('SELECT * FROM support_tickets WHERE id = ? AND shopId = ?').bind(c.req.param('id'), shopId).first();
      if (!ticket) return c.json({ error: 'Not found' }, 404);
      const { results: replies } = await db.prepare('SELECT * FROM support_replies WHERE ticketId = ? ORDER BY createdAt ASC').bind((ticket as any).id).all();
      return c.json({ data: { ...(ticket as any), replies } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/support/:id', async (c) => {
    try {
      await ensureModule4Tables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const body = await c.req.json();
      const allowed = ['subject', 'description', 'priority', 'status'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) { if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); } }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      vals.push(new Date().toISOString(), c.req.param('id'), shopId);
      await db.prepare(`UPDATE support_tickets SET ${sets.join(', ')}, updatedAt = ? WHERE id = ? AND shopId = ?`).bind(...vals).run();
      const ticket = await db.prepare('SELECT * FROM support_tickets WHERE id = ?').bind(c.req.param('id')).first();
      return c.json({ data: ticket });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/support/reply', async (c) => {
    try {
      await ensureModule4Tables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const { ticketId, message } = await c.req.json();
      if (!ticketId || !message) return c.json({ error: 'ticketId and message required' }, 400);
      const ticket = await db.prepare('SELECT * FROM support_tickets WHERE id = ? AND shopId = ?').bind(ticketId, shopId).first();
      if (!ticket) return c.json({ error: 'Ticket not found' }, 404);
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      await db.prepare('INSERT INTO support_replies (id, ticketId, userId, message, createdAt) VALUES (?,?,?,?,?)').bind(id, ticketId, c.var.userId, message, now).run();
      await db.prepare('UPDATE support_tickets SET updatedAt = ? WHERE id = ?').bind(now, ticketId).run();
      return c.json({ data: { id, ticketId, message, createdAt: now } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/support/close', async (c) => {
    try {
      await ensureModule4Tables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const { id } = await c.req.json();
      if (!id) return c.json({ error: 'id required' }, 400);
      const now = new Date().toISOString();
      await db.prepare("UPDATE support_tickets SET status = 'CLOSED', updatedAt = ? WHERE id = ? AND shopId = ?").bind(now, id, shopId).run();
      return c.json({ data: { id, status: 'CLOSED' } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/support/history', async (c) => {
    try {
      await ensureModule4Tables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const fromDate = c.req.query('fromDate') || ''; const toDate = c.req.query('toDate') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      let where = 'WHERE shopId = ? AND status = ?'; const params: any[] = [shopId, 'CLOSED'];
      if (fromDate) { where += ' AND createdAt >= ?'; params.push(fromDate); }
      if (toDate) { where += ' AND createdAt <= ?'; params.push(toDate); }
      const { results } = await db.prepare(`SELECT * FROM support_tickets ${where} ORDER BY updatedAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM support_tickets ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== SYSTEM SETTINGS ====================

  async function upsertSetting(db: any, shopId: string, key: string, value: any) {
    const now = new Date().toISOString();
    await db.prepare("INSERT INTO settings (id, shopId, key, value, type, group, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'json', 'system', ?, ?) ON CONFLICT(shopId, key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt").bind(crypto.randomUUID(), shopId, key, JSON.stringify(value), now, now).run();
  }

  app.patch('/api/settings/invoice', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const body = await c.req.json();
      await upsertSetting(db, shopId, 'invoice_settings', body);
      return c.json({ data: { key: 'invoice_settings', value: body } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/settings/printer', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const body = await c.req.json();
      await upsertSetting(db, shopId, 'printer_settings', body);
      return c.json({ data: { key: 'printer_settings', value: body } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/settings/barcode', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const body = await c.req.json();
      await upsertSetting(db, shopId, 'barcode_settings', body);
      return c.json({ data: { key: 'barcode_settings', value: body } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/settings/receipt', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const body = await c.req.json();
      await upsertSetting(db, shopId, 'receipt_settings', body);
      return c.json({ data: { key: 'receipt_settings', value: body } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/settings/theme', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const body = await c.req.json();
      await upsertSetting(db, shopId, 'theme_settings', body);
      return c.json({ data: { key: 'theme_settings', value: body } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/settings/language', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const body = await c.req.json();
      await upsertSetting(db, shopId, 'language_settings', body);
      return c.json({ data: { key: 'language_settings', value: body } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/settings/gst', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const body = await c.req.json();
      await upsertSetting(db, shopId, 'gst_settings', body);
      return c.json({ data: { key: 'gst_settings', value: body } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== API KEY MANAGEMENT ====================

  app.post('/api/api-keys', async (c) => {
    try {
      await ensureModule4Tables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const { name, permissions } = await c.req.json();
      if (!name) return c.json({ error: 'name required' }, 400);
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      const rawKey = crypto.randomUUID() + '-' + Date.now().toString(16);
      const keyHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawKey)).then(h => Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join(''));
      await db.prepare('INSERT INTO shop_api_keys (id, shopId, name, key, permissions, status, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)').bind(id, shopId, name, keyHash, permissions ? JSON.stringify(permissions) : null, 'ACTIVE', now, now).run();
      return c.json({ data: { id, name, key: rawKey, permissions, status: 'ACTIVE' } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/api-keys', async (c) => {
    try {
      await ensureModule4Tables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await db.prepare("SELECT id, shopId, name, CASE WHEN length(key) > 8 THEN substr('****', 1, 4) || substr(key, length(key) - 3, 4) ELSE '****' END as maskedKey, permissions, lastUsedAt, status, createdAt, updatedAt FROM shop_api_keys WHERE shopId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?").bind(shopId, limit, offset).all();
      const { results: countRes } = await db.prepare('SELECT COUNT(*) as total FROM shop_api_keys WHERE shopId = ?').bind(shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/api-keys/:id', async (c) => {
    try {
      await ensureModule4Tables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const body = await c.req.json();
      const allowed = ['name', 'permissions', 'status'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) { if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); } }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      if (body.permissions) { sets[sets.length - 1] = 'permissions = ?'; vals[vals.length - 1] = JSON.stringify(body.permissions); }
      vals.push(new Date().toISOString(), c.req.param('id'), shopId);
      await db.prepare(`UPDATE shop_api_keys SET ${sets.join(', ')}, updatedAt = ? WHERE id = ? AND shopId = ?`).bind(...vals).run();
      const key = await db.prepare('SELECT id, shopId, name, permissions, status, createdAt, updatedAt FROM shop_api_keys WHERE id = ?').bind(c.req.param('id')).first();
      return c.json({ data: key });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/api-keys/:id', async (c) => {
    try {
      await ensureModule4Tables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const now = new Date().toISOString();
      await db.prepare("UPDATE shop_api_keys SET status = 'REVOKED', updatedAt = ? WHERE id = ? AND shopId = ?").bind(now, c.req.param('id'), shopId).run();
      return c.json({ message: 'Revoked' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/api-keys/logs', async (c) => {
    try {
      await ensureModule4Tables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await db.prepare('SELECT * FROM api_key_logs WHERE shopId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?').bind(shopId, limit, offset).all();
      const { results: countRes } = await db.prepare('SELECT COUNT(*) as total FROM api_key_logs WHERE shopId = ?').bind(shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== WEBHOOK MANAGEMENT ====================

  app.post('/api/webhooks', async (c) => {
    try {
      await ensureModule4Tables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const { name, url, events } = await c.req.json();
      if (!name || !url) return c.json({ error: 'name and url required' }, 400);
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      const secret = crypto.randomUUID() + '-' + crypto.randomUUID();
      await db.prepare('INSERT INTO webhooks (id, shopId, name, url, events, secret, isActive, createdAt, updatedAt) VALUES (?,?,?,?,?,?,1,?,?)').bind(id, shopId, name, url, events ? JSON.stringify(events) : '[]', secret, now, now).run();
      return c.json({ data: { id, name, url, events, secret, isActive: true } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/webhooks', async (c) => {
    try {
      await ensureModule4Tables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await db.prepare('SELECT * FROM webhooks WHERE shopId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?').bind(shopId, limit, offset).all();
      const { results: countRes } = await db.prepare('SELECT COUNT(*) as total FROM webhooks WHERE shopId = ?').bind(shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/webhooks/:id', async (c) => {
    try {
      await ensureModule4Tables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const body = await c.req.json();
      const allowed = ['name', 'url', 'events'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) { if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); } }
      if (body.status !== undefined) { sets.push('isActive = ?'); vals.push(body.status === 'ACTIVE' ? 1 : 0); }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      if (body.events) { sets[sets.length - 1] = 'events = ?'; vals[vals.length - 1] = JSON.stringify(body.events); }
      vals.push(new Date().toISOString(), c.req.param('id'), shopId);
      await db.prepare(`UPDATE webhooks SET ${sets.join(', ')}, updatedAt = ? WHERE id = ? AND shopId = ?`).bind(...vals).run();
      const wh = await db.prepare('SELECT * FROM webhooks WHERE id = ?').bind(c.req.param('id')).first();
      return c.json({ data: wh });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/webhooks/:id', async (c) => {
    try {
      await ensureModule4Tables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      await db.prepare('DELETE FROM webhooks WHERE id = ? AND shopId = ?').bind(c.req.param('id'), shopId).run();
      return c.json({ message: 'Deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/webhooks/logs', async (c) => {
    try {
      await ensureModule4Tables(c.env.DB);
      const db = c.env.DB;
      const webhookId = c.req.query('webhookId') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      let where = 'WHERE 1=1'; const params: any[] = [];
      if (webhookId) { where += ' AND webhookId = ?'; params.push(webhookId); }
      const { results } = await db.prepare(`SELECT * FROM webhook_logs ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM webhook_logs ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/support/escalate', async (c) => {
    try {
      await ensureModule4Tables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const { ticketId, reason, priority } = await c.req.json();
      if (!ticketId || !reason) return c.json({ error: 'ticketId and reason required' }, 400);
      const now = new Date().toISOString();
      await db.prepare("UPDATE support_tickets SET priority = ?, status = 'ESCALATED', updatedAt = ? WHERE id = ? AND shopId = ?").bind(priority || 'HIGH', now, ticketId, shopId).run();
      return c.json({ message: 'Escalated', data: { id: ticketId, priority: priority || 'HIGH', status: 'ESCALATED' } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/webhooks/events', async (c) => {
    try {
      const events = [
        { key: 'order.created', label: 'Order Created', category: 'orders' },
        { key: 'order.updated', label: 'Order Updated', category: 'orders' },
        { key: 'order.cancelled', label: 'Order Cancelled', category: 'orders' },
        { key: 'payment.received', label: 'Payment Received', category: 'payments' },
        { key: 'payment.refunded', label: 'Payment Refunded', category: 'payments' },
        { key: 'customer.created', label: 'Customer Created', category: 'customers' },
        { key: 'customer.updated', label: 'Customer Updated', category: 'customers' },
        { key: 'product.low_stock', label: 'Low Stock Alert', category: 'products' },
        { key: 'service.created', label: 'Service Created', category: 'services' },
        { key: 'service.status_change', label: 'Service Status Changed', category: 'services' },
        { key: 'service.completed', label: 'Service Completed', category: 'services' },
        { key: 'warranty.claimed', label: 'Warranty Claimed', category: 'warranty' },
      ];
      return c.json({ data: events });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });
}
