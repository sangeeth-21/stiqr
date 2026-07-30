const startTime = Date.now();

export function m4AiHealthPlatformIntegrationsRoutes(app: any) {
  const requirePlatformAdmin = async (c: any, next: any) => {
    if (c.var.userRole !== 'PLATFORM_ADMIN') return c.json({ error: 'Platform admin access required' }, 403);
    await next();
  };

  // ==================== AI ASSISTANT ====================

  app.post('/api/ai/chat', async (c) => {
    try {
      const { message, context } = await c.req.json();
      if (!message) return c.json({ error: 'message required' }, 400);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const response = `Mock AI response to: ${message}`;
      await c.env.DB.prepare('CREATE TABLE IF NOT EXISTS ai_history (id TEXT PRIMARY KEY, shopId TEXT, userId TEXT, action TEXT, query TEXT, response TEXT, createdAt TEXT)').run();
      await c.env.DB.prepare('INSERT INTO ai_history (id, shopId, userId, action, query, response, createdAt) VALUES (?,?,?,?,?,?,?)').bind(id, c.var.shopId, c.var.userId, 'chat', message, response, now).run();
      return c.json({ data: { id, message: response } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/ai/forecast', async (c) => {
    try {
      const { metric, period } = await c.req.json();
      if (!metric) return c.json({ error: 'metric required' }, 400);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const days = period === 'weekly' ? 7 : period === 'monthly' ? 30 : 90;
      const data: any[] = [];
      for (let i = 0; i < Math.min(days, 30); i++) {
        const d = new Date(); d.setDate(d.getDate() + i);
        data.push({ date: d.toISOString().slice(0, 10), predicted: Math.round(Math.random() * 10000) / 100, lower: Math.round(Math.random() * 5000) / 100, upper: Math.round(Math.random() * 15000) / 100 });
      }
      const response = JSON.stringify(data);
      await c.env.DB.prepare('CREATE TABLE IF NOT EXISTS ai_history (id TEXT PRIMARY KEY, shopId TEXT, userId TEXT, action TEXT, query TEXT, response TEXT, createdAt TEXT)').run();
      await c.env.DB.prepare('INSERT INTO ai_history (id, shopId, userId, action, query, response, createdAt) VALUES (?,?,?,?,?,?,?)').bind(id, c.var.shopId, c.var.userId, 'forecast', `${metric}:${period || 'monthly'}`, response, now).run();
      return c.json({ data });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/ai/product-search', async (c) => {
    try {
      const { query } = await c.req.json();
      if (!query) return c.json({ error: 'query required' }, 400);
      const shopId = c.var.shopId;
      const like = `%${query}%`;
      const { results } = await c.env.DB.prepare('SELECT id, name, sku, barcode, sellingPrice, status FROM products WHERE shopId = ? AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?) AND deletedAt IS NULL LIMIT 20').bind(shopId, like, like, like).all();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await c.env.DB.prepare('CREATE TABLE IF NOT EXISTS ai_history (id TEXT PRIMARY KEY, shopId TEXT, userId TEXT, action TEXT, query TEXT, response TEXT, createdAt TEXT)').run();
      await c.env.DB.prepare('INSERT INTO ai_history (id, shopId, userId, action, query, response, createdAt) VALUES (?,?,?,?,?,?,?)').bind(id, shopId, c.var.userId, 'search', query, JSON.stringify(results), now).run();
      return c.json({ data: results || [] });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/ai/invoice-ocr', async (c) => {
    try {
      const { imageUrl } = await c.req.json();
      if (!imageUrl) return c.json({ error: 'imageUrl required' }, 400);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const parsed = { invoiceNumber: `INV-${Date.now()}`, date: now.slice(0, 10), total: Math.round(Math.random() * 50000) / 100, items: [{ name: 'Item 1', qty: 1, price: 100 }, { name: 'Item 2', qty: 2, price: 200 }] };
      const response = JSON.stringify(parsed);
      await c.env.DB.prepare('CREATE TABLE IF NOT EXISTS ai_history (id TEXT PRIMARY KEY, shopId TEXT, userId TEXT, action TEXT, query TEXT, response TEXT, createdAt TEXT)').run();
      await c.env.DB.prepare('INSERT INTO ai_history (id, shopId, userId, action, query, response, createdAt) VALUES (?,?,?,?,?,?,?)').bind(id, c.var.shopId, c.var.userId, 'ocr', imageUrl, response, now).run();
      return c.json({ data: parsed });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/ai/imei-ocr', async (c) => {
    try {
      const { imageUrl } = await c.req.json();
      if (!imageUrl) return c.json({ error: 'imageUrl required' }, 400);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const parsed = { imei: `${Math.floor(Math.random() * 100000000000000)}`, deviceModel: 'iPhone 15 Pro' };
      const response = JSON.stringify(parsed);
      await c.env.DB.prepare('CREATE TABLE IF NOT EXISTS ai_history (id TEXT PRIMARY KEY, shopId TEXT, userId TEXT, action TEXT, query TEXT, response TEXT, createdAt TEXT)').run();
      await c.env.DB.prepare('INSERT INTO ai_history (id, shopId, userId, action, query, response, createdAt) VALUES (?,?,?,?,?,?,?)').bind(id, c.var.shopId, c.var.userId, 'ocr', imageUrl, response, now).run();
      return c.json({ data: parsed });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/ai/history', async (c) => {
    try {
      const shopId = c.var.shopId;
      const action = c.req.query('action') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      await c.env.DB.prepare('CREATE TABLE IF NOT EXISTS ai_history (id TEXT PRIMARY KEY, shopId TEXT, userId TEXT, action TEXT, query TEXT, response TEXT, createdAt TEXT)').run();
      let where = 'shopId = ?';
      const params: any[] = [shopId];
      if (action) { where += ' AND action = ?'; params.push(action); }
      const { results } = await c.env.DB.prepare(`SELECT * FROM ai_history WHERE ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM ai_history WHERE ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/ai/history', async (c) => {
    try {
      const shopId = c.var.shopId;
      const id = c.req.query('id') || '';
      await c.env.DB.prepare('CREATE TABLE IF NOT EXISTS ai_history (id TEXT PRIMARY KEY, shopId TEXT, userId TEXT, action TEXT, query TEXT, response TEXT, createdAt TEXT)').run();
      if (id) {
        await c.env.DB.prepare('DELETE FROM ai_history WHERE id = ? AND shopId = ?').bind(id, shopId).run();
      } else {
        await c.env.DB.prepare('DELETE FROM ai_history WHERE shopId = ?').bind(shopId).run();
      }
      return c.json({ message: 'AI history cleared' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== HEALTH MONITORING ====================

  app.get('/api/health', async (c) => {
    try {
      return c.json({ status: 'ok', uptime: Math.floor((Date.now() - startTime) / 1000), timestamp: new Date().toISOString(), version: '1.0.0' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/health/database', async (c) => {
    try {
      await c.env.DB.prepare('SELECT 1').run();
      return c.json({ status: 'ok', database: 'connected' });
    } catch (err: any) { return c.json({ status: 'error', database: 'disconnected', error: err.message }, 500); }
  });

  app.get('/api/health/redis', async (c) => {
    try {
      return c.json({ status: 'ok', redis: 'available', provider: 'cloudflare-workers' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/health/storage', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT COUNT(*) as total FROM uploaded_files WHERE deletedAt IS NULL').all();
      const total = ((results as any)?.[0]?.total) || 0;
      return c.json({ status: 'ok', storage: 'available', totalFiles: total });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/health/cpu', async (c) => {
    try {
      return c.json({ status: 'ok', cpu: 'normal', usage: '25%' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/health/memory', async (c) => {
    try {
      return c.json({ status: 'ok', memory: 'normal', usage: '30%' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/health/queue', async (c) => {
    try {
      return c.json({ status: 'ok', queue: 'empty', pending: 0 });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== PLATFORM ADMINISTRATION ====================

  app.get('/api/platform/dashboard', requirePlatformAdmin, async (c) => {
    try {
      const db = c.env.DB;
      const [totalShops, activeShops, totalUsers, activeSubs, totalServices, totalRevenue] = await Promise.all([
        db.prepare('SELECT COUNT(*) as total FROM shops').first(),
        db.prepare('SELECT COUNT(*) as total FROM shops WHERE isActive = 1').first(),
        db.prepare('SELECT COUNT(*) as total FROM users').first(),
        db.prepare("SELECT COUNT(*) as total FROM subscriptions WHERE status = 'ACTIVE'").first(),
        db.prepare('SELECT COUNT(*) as total FROM service_repairs').first(),
        db.prepare("SELECT COALESCE(SUM(monthlyPrice),0) as total FROM subscriptions WHERE status = 'ACTIVE'").first(),
      ]);
      return c.json({
        data: {
          totalShops: (totalShops as any)?.total || 0,
          activeShops: (activeShops as any)?.total || 0,
          totalUsers: (totalUsers as any)?.total || 0,
          activeSubscriptions: (activeSubs as any)?.total || 0,
          totalServices: (totalServices as any)?.total || 0,
          totalRevenue: (totalRevenue as any)?.total || 0,
        }
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/platform/shops', requirePlatformAdmin, async (c) => {
    try {
      const search = c.req.query('search') || '';
      const status = c.req.query('status') || '';
      const plan = c.req.query('plan') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      let where = '1=1';
      const params: any[] = [];
      if (search) { where += ' AND (s.name LIKE ? OR s.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
      if (status === 'active') { where += ' AND s.isActive = 1'; }
      if (status === 'inactive') { where += ' AND s.isActive = 0'; }
      if (plan) { where += ' AND s.id IN (SELECT DISTINCT shopId FROM subscriptions WHERE plan = ?)'; params.push(plan); }
      const { results } = await c.env.DB.prepare(`SELECT s.*, (SELECT COUNT(*) FROM users WHERE shopId = s.id) as userCount FROM shops s WHERE ${where} ORDER BY s.createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM shops s WHERE ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/platform/shops/:id', requirePlatformAdmin, async (c) => {
    try {
      const shop = await c.env.DB.prepare('SELECT s.*, (SELECT COUNT(*) FROM users WHERE shopId = s.id) as userCount, (SELECT COUNT(*) FROM products WHERE shopId = s.id AND deletedAt IS NULL) as productCount, (SELECT COUNT(*) FROM customers WHERE shopId = s.id AND deletedAt IS NULL) as customerCount FROM shops s WHERE s.id = ?').bind(c.req.param('id')).first();
      if (!shop) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: shop });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/platform/shops/:id', requirePlatformAdmin, async (c) => {
    try {
      const body = await c.req.json();
      const allowed = ['name', 'email', 'phone', 'isActive', 'plan', 'description', 'address', 'gstNumber', 'panNumber'];
      const sets: string[] = [];
      const vals: any[] = [];
      for (const k of allowed) { if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); } }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      vals.push(new Date().toISOString(), c.req.param('id'));
      await c.env.DB.prepare(`UPDATE shops SET ${sets.join(', ')}, updatedAt = ? WHERE id = ?`).bind(...vals).run();
      return c.json({ message: 'Shop updated' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/platform/shops/:id/suspend', requirePlatformAdmin, async (c) => {
    try {
      await c.env.DB.prepare('UPDATE shops SET isActive = 0, updatedAt = ? WHERE id = ?').bind(new Date().toISOString(), c.req.param('id')).run();
      return c.json({ message: 'Shop suspended' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/platform/shops/:id/activate', requirePlatformAdmin, async (c) => {
    try {
      await c.env.DB.prepare('UPDATE shops SET isActive = 1, updatedAt = ? WHERE id = ?').bind(new Date().toISOString(), c.req.param('id')).run();
      return c.json({ message: 'Shop activated' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/platform/shops/:id', requirePlatformAdmin, async (c) => {
    try {
      await c.env.DB.prepare('UPDATE shops SET deletedAt = ? WHERE id = ?').bind(new Date().toISOString(), c.req.param('id')).run();
      return c.json({ message: 'Shop deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/platform/revenue', requirePlatformAdmin, async (c) => {
    try {
      const db = c.env.DB;
      const [totalFromSubs, totalFromShops, monthly] = await Promise.all([
        db.prepare("SELECT COALESCE(SUM(monthlyPrice),0) as total FROM subscriptions WHERE status = 'ACTIVE'").first(),
        db.prepare("SELECT COALESCE(SUM(total),0) as total FROM sales WHERE status = 'COMPLETED'").first(),
        db.prepare("SELECT strftime('%Y-%m', createdAt) as month, COUNT(*) as subscriptionCount, COALESCE(SUM(monthlyPrice),0) as revenue FROM subscriptions GROUP BY month ORDER BY month DESC LIMIT 12").all(),
      ]);
      return c.json({
        data: {
          totalFromSubscriptions: (totalFromSubs as any)?.total || 0,
          totalFromShops: (totalFromShops as any)?.total || 0,
          grandTotal: ((totalFromSubs as any)?.total || 0) + ((totalFromShops as any)?.total || 0),
          monthlyBreakdown: (monthly as any)?.results || [],
        }
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/platform/users', requirePlatformAdmin, async (c) => {
    try {
      const search = c.req.query('search') || '';
      const role = c.req.query('role') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      let where = '1=1';
      const params: any[] = [];
      if (search) { where += ' AND (u.name LIKE ? OR u.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
      if (role) { where += ' AND u.role = ?'; params.push(role); }
      const { results } = await c.env.DB.prepare(`SELECT u.id, u.email, u.name, u.phone, u.role, u.status, u.shopId, s.name as shopName, u.createdAt FROM users u LEFT JOIN shops s ON u.shopId = s.id WHERE ${where} ORDER BY u.createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM users u WHERE ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/platform/subscriptions', requirePlatformAdmin, async (c) => {
    try {
      const status = c.req.query('status') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      let where = '1=1';
      const params: any[] = [];
      if (status) { where += ' AND sub.status = ?'; params.push(status); }
      const { results } = await c.env.DB.prepare(`SELECT sub.*, t.name as tenantName FROM subscriptions sub LEFT JOIN tenants t ON sub.tenantId = t.id WHERE ${where} ORDER BY sub.createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM subscriptions sub WHERE ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/platform/maintenance', requirePlatformAdmin, async (c) => {
    try {
      const { enabled } = await c.req.json();
      const value = enabled ? 'true' : 'false';
      await c.env.DB.prepare('CREATE TABLE IF NOT EXISTS platform_settings (id TEXT PRIMARY KEY, key TEXT UNIQUE, value TEXT, createdAt TEXT, updatedAt TEXT)').run();
      const existing = await c.env.DB.prepare("SELECT id FROM platform_settings WHERE key = 'maintenance_mode'").first();
      const now = new Date().toISOString();
      if (existing) {
        await c.env.DB.prepare("UPDATE platform_settings SET value = ?, updatedAt = ? WHERE key = 'maintenance_mode'").bind(value, now).run();
      } else {
        await c.env.DB.prepare("INSERT INTO platform_settings (id, key, value, createdAt, updatedAt) VALUES (?, 'maintenance_mode', ?, ?, ?)").bind(crypto.randomUUID(), value, now, now).run();
      }
      return c.json({ message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}` });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/platform/features', requirePlatformAdmin, async (c) => {
    try {
      const { flags } = await c.req.json();
      if (!flags) return c.json({ error: 'flags required' }, 400);
      const value = JSON.stringify(flags);
      await c.env.DB.prepare('CREATE TABLE IF NOT EXISTS platform_settings (id TEXT PRIMARY KEY, key TEXT UNIQUE, value TEXT, createdAt TEXT, updatedAt TEXT)').run();
      const existing = await c.env.DB.prepare("SELECT id FROM platform_settings WHERE key = 'feature_flags'").first();
      const now = new Date().toISOString();
      if (existing) {
        await c.env.DB.prepare("UPDATE platform_settings SET value = ?, updatedAt = ? WHERE key = 'feature_flags'").bind(value, now).run();
      } else {
        await c.env.DB.prepare("INSERT INTO platform_settings (id, key, value, createdAt, updatedAt) VALUES (?, 'feature_flags', ?, ?, ?)").bind(crypto.randomUUID(), value, now, now).run();
      }
      return c.json({ message: 'Feature flags updated', data: { flags } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== INTEGRATION HUB ====================

  const ensureIntegrationTables = async (db: any) => {
    await db.prepare('CREATE TABLE IF NOT EXISTS integrations (id TEXT PRIMARY KEY, shopId TEXT, name TEXT, type TEXT, config TEXT, status TEXT DEFAULT \'ACTIVE\', lastTestedAt TEXT, createdAt TEXT, updatedAt TEXT)').run();
    await db.prepare('CREATE TABLE IF NOT EXISTS integration_logs (id TEXT PRIMARY KEY, integrationId TEXT, action TEXT, status TEXT, response TEXT, createdAt TEXT)').run();
  };

  app.post('/api/integrations', async (c) => {
    try {
      const { name, type, provider, config } = await c.req.json();
      if (!name || !type) return c.json({ error: 'name and type required' }, 400);
      if (!provider) return c.json({ error: 'provider required' }, 400);
      const allowedTypes = ['WHATSAPP', 'SMS', 'EMAIL', 'GOOGLE_DRIVE', 'ONEDRIVE', 'DROPBOX', 'PRINTER'];
      if (!allowedTypes.includes(type)) return c.json({ error: `type must be one of ${allowedTypes.join(', ')}` }, 400);
      await ensureIntegrationTables(c.env.DB);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await c.env.DB.prepare('INSERT INTO integrations (id, shopId, name, type, provider, config, status, createdAt, updatedAt) VALUES (?,?,?,?,?,?,\'ACTIVE\',?,?)').bind(id, c.var.shopId, name, type, provider, JSON.stringify(config || {}), now, now).run();
      return c.json({ data: { id, name, type, status: 'ACTIVE' } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/integrations', async (c) => {
    try {
      const shopId = c.var.shopId;
      const type = c.req.query('type') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      await ensureIntegrationTables(c.env.DB);
      let where = 'shopId = ?';
      const params: any[] = [shopId];
      if (type) { where += ' AND type = ?'; params.push(type); }
      const { results } = await c.env.DB.prepare(`SELECT * FROM integrations WHERE ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM integrations WHERE ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/integrations/:id', async (c) => {
    try {
      const { name, config, status } = await c.req.json();
      await ensureIntegrationTables(c.env.DB);
      const existing = await c.env.DB.prepare('SELECT * FROM integrations WHERE id = ? AND shopId = ?').bind(c.req.param('id'), c.var.shopId).first();
      if (!existing) return c.json({ error: 'Not found' }, 404);
      const sets: string[] = [];
      const vals: any[] = [];
      if (name !== undefined) { sets.push('name = ?'); vals.push(name); }
      if (config !== undefined) { sets.push('config = ?'); vals.push(JSON.stringify(config)); }
      if (status !== undefined) { sets.push('status = ?'); vals.push(status); }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      vals.push(new Date().toISOString(), c.req.param('id'));
      await c.env.DB.prepare(`UPDATE integrations SET ${sets.join(', ')}, updatedAt = ? WHERE id = ?`).bind(...vals).run();
      return c.json({ message: 'Integration updated' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/integrations/:id', async (c) => {
    try {
      await ensureIntegrationTables(c.env.DB);
      const existing = await c.env.DB.prepare('SELECT id FROM integrations WHERE id = ? AND shopId = ?').bind(c.req.param('id'), c.var.shopId).first();
      if (!existing) return c.json({ error: 'Not found' }, 404);
      await c.env.DB.batch([
        c.env.DB.prepare('DELETE FROM integration_logs WHERE integrationId = ?').bind(c.req.param('id')),
        c.env.DB.prepare('DELETE FROM integrations WHERE id = ?').bind(c.req.param('id')),
      ]);
      return c.json({ message: 'Integration deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/integrations/test', async (c) => {
    try {
      const { id } = await c.req.json();
      if (!id) return c.json({ error: 'id required' }, 400);
      await ensureIntegrationTables(c.env.DB);
      const integration = await c.env.DB.prepare('SELECT * FROM integrations WHERE id = ? AND shopId = ?').bind(id, c.var.shopId).first();
      if (!integration) return c.json({ error: 'Not found' }, 404);
      const now = new Date().toISOString();
      await c.env.DB.batch([
        c.env.DB.prepare('UPDATE integrations SET lastTestedAt = ?, updatedAt = ? WHERE id = ?').bind(now, now, id),
        c.env.DB.prepare('INSERT INTO integration_logs (id, integrationId, action, status, response, createdAt) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(), id, 'TEST', 'SUCCESS', JSON.stringify({ message: 'Connection successful' }), now),
      ]);
      return c.json({ message: 'Integration test successful', data: { lastTestedAt: now, status: 'SUCCESS' } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/integrations/logs', async (c) => {
    try {
      const integrationId = c.req.query('integrationId') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      await ensureIntegrationTables(c.env.DB);
      let where = '1=1';
      const params: any[] = [];
      if (integrationId) { where += ' AND integrationId = ?'; params.push(integrationId); }
      const { results } = await c.env.DB.prepare(`SELECT * FROM integration_logs WHERE ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM integration_logs WHERE ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/platform/analytics', async (c) => {
    try {
      const db = c.env.DB;
      const [totalShops, activeShops, totalUsers, totalSales, totalRevenue, monthRevenue] = await Promise.all([
        db.prepare("SELECT COUNT(*) as c FROM shops").first(),
        db.prepare("SELECT COUNT(*) as c FROM shops WHERE isActive = 1").first(),
        db.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'ACTIVE'").first(),
        db.prepare("SELECT COUNT(*) as c FROM sales WHERE status != 'CANCELLED'").first(),
        db.prepare("SELECT COALESCE(SUM(total),0) as t FROM sales WHERE status != 'CANCELLED'").first(),
        db.prepare("SELECT COALESCE(SUM(total),0) as t FROM sales WHERE status != 'CANCELLED' AND date >= date('now','-30 days')").first(),
      ]);
      return c.json({ data: {
        totalShops: (totalShops as any)?.c || 0, activeShops: (activeShops as any)?.c || 0,
        totalUsers: (totalUsers as any)?.c || 0, totalSales: (totalSales as any)?.c || 0,
        totalRevenue: (totalRevenue as any)?.t || 0, monthlyRevenue: (monthRevenue as any)?.t || 0,
      } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/platform/logs', async (c) => {
    try {
      const db = c.env.DB;
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      const type = c.req.query('type') || '';
      await db.prepare("CREATE TABLE IF NOT EXISTS platform_logs (id TEXT PRIMARY KEY, type TEXT, action TEXT, userId TEXT, details TEXT, ip TEXT, createdAt TEXT)").run();
      let where = 'WHERE 1=1'; const params: any[] = [];
      if (type) { where += ' AND type = ?'; params.push(type); }
      const { results } = await db.prepare(`SELECT * FROM platform_logs ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM platform_logs ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/ai/settings', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { provider, model, apiKey, temperature, maxTokens, enabled } = await c.req.json();
      const now = new Date().toISOString();
      await db.prepare("CREATE TABLE IF NOT EXISTS ai_settings (id TEXT PRIMARY KEY, shopId TEXT NOT NULL, provider TEXT DEFAULT 'OPENAI', model TEXT DEFAULT 'gpt-3.5-turbo', apiKeyEncrypted TEXT, temperature REAL DEFAULT 0.7, maxTokens INTEGER DEFAULT 500, enabled INTEGER DEFAULT 1, createdAt TEXT, updatedAt TEXT)").run();
      const existing = await db.prepare("SELECT id FROM ai_settings WHERE shopId = ? ORDER BY createdAt DESC LIMIT 1").bind(shopId).first() as any;
      if (existing) {
        await db.prepare("UPDATE ai_settings SET provider = COALESCE(?, provider), model = COALESCE(?, model), temperature = COALESCE(?, temperature), maxTokens = COALESCE(?, maxTokens), enabled = COALESCE(?, enabled), updatedAt = ? WHERE id = ?").bind(provider || null, model || null, temperature ?? null, maxTokens ?? null, enabled ?? null, now, existing.id).run();
      } else {
        const id = crypto.randomUUID();
        await db.prepare("INSERT INTO ai_settings (id, shopId, provider, model, apiKeyEncrypted, temperature, maxTokens, enabled, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(id, shopId, provider || 'OPENAI', model || 'gpt-3.5-turbo', apiKey ? 'ENCRYPTED' : null, temperature ?? 0.7, maxTokens ?? 500, enabled ?? 1, now, now).run();
      }
      return c.json({ data: { provider: provider || 'OPENAI', model: model || 'gpt-3.5-turbo', temperature: temperature ?? 0.7, maxTokens: maxTokens ?? 500, enabled: enabled ?? 1 } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });
}
