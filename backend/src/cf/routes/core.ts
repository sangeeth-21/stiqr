import { Hono } from 'hono';
import { crud } from '../main';

export function coreRoutes(app: Hono) {
  // ==================== USERS ====================
  app.route('/api/users', crud('users', {
    searchable: ['name', 'email', 'phone'],
    updatable: ['name', 'email', 'phone', 'role', 'status', 'avatar'],
  }));

  app.get('/api/users/:id/status', async (c) => {
    try {
      const user = await c.env.DB.prepare('SELECT id, status, failedAttempts, lockedUntil FROM users WHERE id = ?').bind(c.req.param('id')).first();
      if (!user) return c.json({ statusCode: 404, message: 'User not found' }, 404);
      return c.json({ statusCode: 200, data: user });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  app.patch('/api/users/:id/status', async (c) => {
    try {
      const { status } = await c.req.json();
      await c.env.DB.prepare("UPDATE users SET status = ?, updatedAt = datetime('now') WHERE id = ?").bind(status, c.req.param('id')).run();
      return c.json({ statusCode: 200, message: 'Status updated' });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  // ==================== SHOPS ====================
  app.route('/api/shops', crud('shops', {
    searchable: ['name', 'email', 'phone'],
    updatable: ['name', 'description', 'logo', 'address', 'phone', 'email', 'gstNumber', 'panNumber', 'businessHours', 'bankDetails', 'isActive'],
  }));

  app.get('/api/shops/:id/stats', async (c) => {
    try {
      const id = c.req.param('id');
      const [products, orders, employees] = await Promise.all([
        c.env.DB.prepare('SELECT COUNT(*) as count FROM products WHERE shopId = ? ').bind(id).first() as any,
        c.env.DB.prepare('SELECT COUNT(*) as count FROM sales WHERE shopId = ?').bind(id).first() as any,
        c.env.DB.prepare('SELECT COUNT(*) as count FROM employees WHERE shopId = ?').bind(id).first() as any,
      ]);
      return c.json({ statusCode: 200, data: { products: products?.count || 0, orders: orders?.count || 0, employees: employees?.count || 0 } });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  // ==================== ROLES ====================
  app.route('/api/roles', crud('roles', { searchable: ['name'], updatable: ['name', 'description'] }));

  app.get('/api/roles/:id/permissions', async (c) => {
    try {
      const { results } = await c.env.DB.prepare(
        'SELECT p.* FROM permissions p INNER JOIN role_permissions rp ON rp.permissionId = p.id WHERE rp.roleId = ?'
      ).bind(c.req.param('id')).all();
      return c.json({ statusCode: 200, data: results });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  app.post('/api/roles/:id/permissions', async (c) => {
    try {
      const { permissionIds } = await c.req.json();
      const roleId = c.req.param('id');
      await c.env.DB.prepare('DELETE FROM role_permissions WHERE roleId = ?').bind(roleId).run();
      for (const pid of permissionIds) {
        await c.env.DB.prepare('INSERT INTO role_permissions (id, roleId, permissionId, createdAt) VALUES (?, ?, ?, datetime(\'now\'))').bind(crypto.randomUUID(), roleId, pid).run();
      }
      return c.json({ statusCode: 200, message: 'Permissions updated' });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  // ==================== PERMISSIONS ====================
  app.route('/api/permissions', crud('permissions', { searchable: ['name', 'module'], updatable: ['name', 'description', 'module'] }));

  // ==================== TENANTS ====================
  app.route('/api/tenants', crud('tenants', { searchable: ['name', 'domain'], updatable: ['name', 'domain', 'status', 'config'] }));

  // ==================== SETTINGS ====================
  app.get('/api/settings', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT * FROM settings ORDER BY key').all();
      return c.json({ statusCode: 200, data: results });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  app.get('/api/settings/:key', async (c) => {
    try {
      const setting = await c.env.DB.prepare('SELECT * FROM settings WHERE key = ?').bind(c.req.param('key')).first();
      if (!setting) return c.json({ statusCode: 404, message: 'Setting not found' }, 404);
      return c.json({ statusCode: 200, data: setting });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  app.patch('/api/settings/:key', async (c) => {
    try {
      const { value } = await c.req.json();
      await c.env.DB.prepare("UPDATE settings SET value = ?, updatedAt = datetime('now') WHERE key = ?").bind(value, c.req.param('key')).run();
      return c.json({ statusCode: 200, message: 'Setting updated' });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  app.post('/api/settings', async (c) => {
    try {
      const { key, value, description } = await c.req.json();
      await c.env.DB.prepare("INSERT INTO settings (id, key, value, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))").bind(crypto.randomUUID(), key, value, description || null).run();
      return c.json({ statusCode: 201, message: 'Setting created' }, 201);
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  // ==================== NOTIFICATIONS ====================
  app.get('/api/notifications', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50').bind(c.get('userId')).all();
      return c.json({ statusCode: 200, data: results });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  app.patch('/api/notifications/:id/read', async (c) => {
    try {
      await c.env.DB.prepare("UPDATE notifications SET isRead = 1, readAt = datetime('now') WHERE id = ?").bind(c.req.param('id')).run();
      return c.json({ statusCode: 200, message: 'Marked as read' });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  app.delete('/api/notifications/:id', async (c) => {
    try {
      await c.env.DB.prepare('DELETE FROM notifications WHERE id = ?').bind(c.req.param('id')).run();
      return c.json({ statusCode: 200, message: 'Deleted' });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  // ==================== ACTIVITY LOGS ====================
  app.get('/api/activity-logs', async (c) => {
    try {
      const userId = c.req.query('userId');
      let sql = 'SELECT * FROM activity_logs';
      const params: any[] = [];
      if (userId) { sql += ' WHERE userId = ?'; params.push(userId); }
      sql += ' LIMIT 100';
      const { results } = params.length ? await c.env.DB.prepare(sql).bind(...params).all() : await c.env.DB.prepare(sql).all();
      return c.json({ statusCode: 200, data: results });
    } catch { return c.json({ statusCode: 200, data: [] }); }
  });

  app.get('/api/activity-logs/:id', async (c) => {
    try {
      const log = await c.env.DB.prepare('SELECT * FROM activity_logs WHERE id = ?').bind(c.req.param('id')).first();
      if (!log) return c.json({ statusCode: 404, message: 'Not found' }, 404);
      return c.json({ statusCode: 200, data: log });
    } catch { return c.json({ statusCode: 200, data: null }); }
  });

  // ==================== OTP ====================
  app.post('/api/otp/generate', async (c) => {
    try {
      const { target, type = 'SMS' } = await c.req.json();
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await c.env.DB.prepare("INSERT INTO otps (id, target, code, type, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?, datetime('now'))").bind(crypto.randomUUID(), target, code, type, expiresAt).run();
      return c.json({ statusCode: 200, message: 'OTP sent', data: { target, expiresAt } });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  app.post('/api/otp/verify', async (c) => {
    try {
      const { target, code } = await c.req.json();
      const otp = await c.env.DB.prepare('SELECT * FROM otps WHERE target = ? AND code = ? AND used = 0 AND expiresAt > datetime(\'now\') ORDER BY createdAt DESC LIMIT 1').bind(target, code).first() as any;
      if (!otp) return c.json({ statusCode: 400, message: 'Invalid or expired OTP' }, 400);
      await c.env.DB.prepare('UPDATE otps SET used = 1 WHERE id = ?').bind(otp.id).run();
      return c.json({ statusCode: 200, message: 'OTP verified' });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });
}
