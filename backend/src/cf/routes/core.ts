export function coreRoutes(app: any) {
  // Users
  app.get('/api/users', async (c) => {
    try {
      const db = c.env.DB;
      const search = c.req.query('search') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const shopId = c.var.shopId;
      let query = 'SELECT id, email, name, phone, role, status, avatar, shopId, createdAt, updatedAt FROM users WHERE shopId = ?';
      const params: any[] = [shopId];
      if (search) { query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
      query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?'; params.push(limit, offset);
      const { results } = await db.prepare(query).bind(...params).all();
      const { results: countRes } = await db.prepare('SELECT COUNT(*) as total FROM users WHERE shopId = ?').bind(shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/users', async (c) => {
    try {
      const { name, email, phone, password, role } = await c.req.json();
      if (!name || !email || !password) return c.json({ error: 'Name, email, password required' }, 400);
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      const { hashPassword } = await import('../main');
      const hashed = await hashPassword(password);
      await c.env.DB.prepare('INSERT INTO users (id, email, name, phone, password, display_password, role, status, shopId, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(id, email, name, phone || null, hashed, password, role || 'STAFF', 'ACTIVE', c.var.shopId, now, now).run();
      return c.json({ data: { id, email, name, phone, role: role || 'STAFF', shopId: c.var.shopId } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/users/:id', async (c) => {
    try {
      const user = await c.env.DB.prepare('SELECT id, email, name, phone, role, status, avatar, shopId, createdAt, updatedAt FROM users WHERE id = ? AND shopId = ?').bind(c.req.param('id'), c.var.shopId).first();
      if (!user) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: user });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/users/:id', async (c) => {
    try {
      const body = await c.req.json();
      const allowed = ['name', 'email', 'phone', 'role'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) { if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); } }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      vals.push(new Date().toISOString(), c.req.param('id'), c.var.shopId);
      await c.env.DB.prepare(`UPDATE users SET ${sets.join(', ')}, updatedAt = ? WHERE id = ? AND shopId = ?`).bind(...vals).run();
      const user = await c.env.DB.prepare('SELECT id, email, name, phone, role, status FROM users WHERE id = ?').bind(c.req.param('id')).first();
      return c.json({ data: user });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/users/:id', async (c) => {
    try {
      await c.env.DB.prepare("UPDATE users SET status = 'DELETED', deletedAt = ? WHERE id = ? AND shopId = ?").bind(new Date().toISOString(), c.req.param('id'), c.var.shopId).run();
      return c.json({ message: 'Deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/users/:id/activate', async (c) => {
    try { await c.env.DB.prepare("UPDATE users SET status = 'ACTIVE' WHERE id = ? AND shopId = ?").bind(c.req.param('id'), c.var.shopId).run(); return c.json({ message: 'Activated' }); }
    catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/users/:id/suspend', async (c) => {
    try { await c.env.DB.prepare("UPDATE users SET status = 'SUSPENDED' WHERE id = ? AND shopId = ?").bind(c.req.param('id'), c.var.shopId).run(); return c.json({ message: 'Suspended' }); }
    catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // Roles
  app.get('/api/roles', async (c) => {
    try { const { results } = await c.env.DB.prepare('SELECT * FROM roles').all(); return c.json({ data: results }); }
    catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/roles', async (c) => {
    try {
      const { name, description } = await c.req.json();
      if (!name) return c.json({ error: 'Name required' }, 400);
      const id = crypto.randomUUID();
      await c.env.DB.prepare('INSERT INTO roles (id, name, description, createdAt, updatedAt) VALUES (?,?,?,?,?)').bind(id, name, description || null, new Date().toISOString(), new Date().toISOString()).run();
      return c.json({ data: { id, name, description } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/roles/:id', async (c) => {
    try {
      const role = await c.env.DB.prepare('SELECT r.*, GROUP_CONCAT(p.resource||":"||p.action) as permissions FROM roles r LEFT JOIN role_permissions rp ON r.id = rp.roleId LEFT JOIN permissions p ON rp.permissionId = p.id WHERE r.id = ? GROUP BY r.id').bind(c.req.param('id')).first();
      if (!role) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: role });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/roles/:id', async (c) => {
    try {
      const { name, description } = await c.req.json();
      await c.env.DB.prepare('UPDATE roles SET name = COALESCE(?, name), description = COALESCE(?, description), updatedAt = ? WHERE id = ?').bind(name || null, description || null, new Date().toISOString(), c.req.param('id')).run();
      return c.json({ message: 'Updated' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/roles/:id', async (c) => {
    try { await c.env.DB.prepare('DELETE FROM roles WHERE id = ?').bind(c.req.param('id')).run(); return c.json({ message: 'Deleted' }); }
    catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/roles/:id/permissions', async (c) => {
    try { const { results } = await c.env.DB.prepare('SELECT p.* FROM permissions p JOIN role_permissions rp ON p.id = rp.permissionId WHERE rp.roleId = ?').bind(c.req.param('id')).all(); return c.json({ data: results }); }
    catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/roles/:id/permissions', async (c) => {
    try {
      const { permissionIds } = await c.req.json();
      if (!permissionIds?.length) return c.json({ error: 'permissionIds required' }, 400);
      const now = new Date().toISOString();
      const inserts = permissionIds.map((pid: string) => c.env.DB.prepare('INSERT OR IGNORE INTO role_permissions (id, roleId, permissionId, createdAt) VALUES (?,?,?,?)').bind(crypto.randomUUID(), c.req.param('id'), pid, now));
      await c.env.DB.batch(inserts);
      return c.json({ message: 'Permissions assigned' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // Permissions
  app.get('/api/permissions', async (c) => {
    try { const { results } = await c.env.DB.prepare('SELECT * FROM permissions ORDER BY resource, action').all(); return c.json({ data: results }); }
    catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/permissions', async (c) => {
    try {
      const { resource, action, description } = await c.req.json();
      if (!resource || !action) return c.json({ error: 'resource and action required' }, 400);
      const id = crypto.randomUUID();
      await c.env.DB.prepare('INSERT INTO permissions (id, resource, action, description, createdAt) VALUES (?,?,?,?,?)').bind(id, resource, action, description || null, new Date().toISOString()).run();
      return c.json({ data: { id, resource, action } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/permissions/seed', async (c) => {
    try {
      const resources = ['products', 'customers', 'inventory', 'sales', 'repairs', 'reports', 'settings', 'staff'];
      const actions = ['create', 'read', 'update', 'delete', 'manage'];
      const now = new Date().toISOString();
      const inserts = [];
      for (const resource of resources) {
        for (const action of actions) {
          const existing = await c.env.DB.prepare('SELECT id FROM permissions WHERE resource = ? AND action = ?').bind(resource, action).first();
          if (!existing) inserts.push(c.env.DB.prepare('INSERT INTO permissions (id, resource, action, description, createdAt) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(), resource, action, `${resource}:${action}`, now));
        }
      }
      if (inserts.length) await c.env.DB.batch(inserts);
      return c.json({ message: `${inserts.length} permissions seeded` });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // Notifications
  app.get('/api/notifications', async (c) => {
    try {
      const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await c.env.DB.prepare('SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?').bind(c.var.userId, limit, offset).all();
      const { results: countRes } = await c.env.DB.prepare('SELECT COUNT(*) as total FROM notifications WHERE userId = ?').bind(c.var.userId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0 });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/notifications/read', async (c) => {
    try { await c.env.DB.prepare('UPDATE notifications SET isRead = 1 WHERE userId = ?').bind(c.var.userId).run(); return c.json({ message: 'All marked as read' }); }
    catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/notifications/:id/read', async (c) => {
    try { await c.env.DB.prepare('UPDATE notifications SET isRead = 1 WHERE id = ? AND userId = ?').bind(c.req.param('id'), c.var.userId).run(); return c.json({ message: 'Marked as read' }); }
    catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/notifications/:id', async (c) => {
    try { await c.env.DB.prepare('DELETE FROM notifications WHERE id = ? AND userId = ?').bind(c.req.param('id'), c.var.userId).run(); return c.json({ message: 'Deleted' }); }
    catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // Audit
  app.get('/api/audit', async (c) => {
    try {
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await c.env.DB.prepare('SELECT * FROM audit_logs WHERE userId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?').bind(c.var.userId, limit, offset).all();
      const { results: countRes } = await c.env.DB.prepare('SELECT COUNT(*) as total FROM audit_logs WHERE userId = ?').bind(c.var.userId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0 });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/audit/:id', async (c) => {
    try {
      const entry = await c.env.DB.prepare('SELECT * FROM audit_logs WHERE id = ?').bind(c.req.param('id')).first();
      if (!entry) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: entry });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // Activity
  app.get('/api/activity', async (c) => {
    try {
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await c.env.DB.prepare('SELECT * FROM api_logs WHERE userId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?').bind(c.var.userId, limit, offset).all();
      const { results: countRes } = await c.env.DB.prepare('SELECT COUNT(*) as total FROM api_logs WHERE userId = ?').bind(c.var.userId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0 });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // Settings
  app.get('/api/settings', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT * FROM settings WHERE shopId = ? OR shopId IS NULL').bind(c.var.shopId).all();
      return c.json({ data: results });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/settings', async (c) => {
    try {
      const body = await c.req.json();
      const updates = [];
      for (const [key, value] of Object.entries(body)) {
        const existing = await c.env.DB.prepare('SELECT id FROM settings WHERE shopId = ? AND key = ?').bind(c.var.shopId, key).first();
        if (existing) {
          updates.push(c.env.DB.prepare('UPDATE settings SET value = ?, updatedAt = ? WHERE id = ?').bind(String(value), new Date().toISOString(), (existing as any).id));
        } else {
          updates.push(c.env.DB.prepare('INSERT INTO settings (id, shopId, key, value, createdAt, updatedAt) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(), c.var.shopId, key, String(value), new Date().toISOString(), new Date().toISOString()));
        }
      }
      if (updates.length) await c.env.DB.batch(updates);
      return c.json({ message: 'Settings updated' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // Shop endpoints
  app.get('/api/shop', async (c) => {
    try {
      const shop = await c.env.DB.prepare('SELECT * FROM shops WHERE id = ?').bind(c.var.shopId).first();
      if (!shop) return c.json({ error: 'Shop not found' }, 404);
      return c.json({ data: shop });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/shop', async (c) => {
    try {
      const body = await c.req.json();
      const allowed = ['name', 'description', 'address', 'phone', 'email', 'gstNumber', 'panNumber'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) { if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); } }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      vals.push(new Date().toISOString(), c.var.shopId);
      await c.env.DB.prepare(`UPDATE shops SET ${sets.join(', ')}, updatedAt = ? WHERE id = ?`).bind(...vals).run();
      const shop = await c.env.DB.prepare('SELECT * FROM shops WHERE id = ?').bind(c.var.shopId).first();
      return c.json({ data: shop });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/shop/logo', async (c) => {
    try {
      const fd = await c.req.formData();
      const file = fd.get('file') as File;
      if (!file) return c.json({ error: 'File required' }, 400);
      if (!file.type.startsWith('image/')) return c.json({ error: 'Must be an image' }, 400);
      if (file.size > 5 * 1024 * 1024) return c.json({ error: 'Max 5MB' }, 400);
      const url = `https://stiqr-backend.ksangeeth76.workers.dev/uploads/${file.name}`;
      await c.env.DB.prepare('UPDATE shops SET logo = ? WHERE id = ?').bind(url, c.var.shopId).run();
      return c.json({ data: { url } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/shop/settings', async (c) => {
    try {
      const body = await c.req.json();
      await c.env.DB.prepare('UPDATE shops SET taxConfig = ?, invoiceTemplate = ?, businessHours = ?, updatedAt = ? WHERE id = ?').bind(JSON.stringify(body.tax || body), JSON.stringify(body.invoice || body), JSON.stringify(body.hours || body), new Date().toISOString(), c.var.shopId).run();
      return c.json({ message: 'Settings updated' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/shop/business-hours', async (c) => {
    try {
      const body = await c.req.json();
      await c.env.DB.prepare('UPDATE shops SET businessHours = ?, updatedAt = ? WHERE id = ?').bind(JSON.stringify(body), new Date().toISOString(), c.var.shopId).run();
      return c.json({ message: 'Business hours updated' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/shop/tax', async (c) => {
    try {
      const body = await c.req.json();
      await c.env.DB.prepare('UPDATE shops SET taxConfig = ?, updatedAt = ? WHERE id = ?').bind(JSON.stringify(body), new Date().toISOString(), c.var.shopId).run();
      return c.json({ message: 'Tax config updated' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/shop/invoice', async (c) => {
    try {
      const body = await c.req.json();
      await c.env.DB.prepare('UPDATE shops SET invoiceTemplate = ?, updatedAt = ? WHERE id = ?').bind(JSON.stringify(body), new Date().toISOString(), c.var.shopId).run();
      return c.json({ message: 'Invoice template updated' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/shop/printer', async (c) => {
    try {
      const body = await c.req.json();
      await c.env.DB.prepare('UPDATE shops SET printerConfig = ?, updatedAt = ? WHERE id = ?').bind(JSON.stringify(body), new Date().toISOString(), c.var.shopId).run();
      return c.json({ message: 'Printer config updated' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

}
