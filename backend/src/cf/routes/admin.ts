export function adminRoutes(app: any) {
  const requireAdmin = async (c: any, next: any) => {
    if (c.var.userRole !== 'SUPER_ADMIN') return c.json({ error: 'Admin access required' }, 403);
    await next();
  };

  app.get('/api/admin/dashboard', requireAdmin, async (c) => {
    try {
      const db = c.env.DB;
      const [shops, activeShops, users, totalSales] = await Promise.all([
        db.prepare('SELECT COUNT(*) as total FROM shops').first(),
        db.prepare('SELECT COUNT(*) as total FROM shops WHERE isActive = 1').first(),
        db.prepare('SELECT COUNT(*) as total FROM users').first(),
        db.prepare('SELECT COUNT(*) as total, COALESCE(SUM(total),0) as revenue FROM sales').first(),
      ]);
      return c.json({
        data: {
          totalShops: (shops as any)?.total || 0,
          activeShops: (activeShops as any)?.total || 0,
          totalUsers: (users as any)?.total || 0,
          totalSales: (totalSales as any)?.total || 0,
          totalRevenue: (totalSales as any)?.revenue || 0,
        }
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/admin/shops', requireAdmin, async (c) => {
    try {
      const search = c.req.query('search') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      let query = 'SELECT s.*, (SELECT COUNT(*) FROM users WHERE shopId = s.id) as userCount FROM shops s';
      const params: any[] = [];
      if (search) { query += ' WHERE s.name LIKE ? OR s.email LIKE ?'; params.push(`%${search}%`, `%${search}%`); }
      query += ' ORDER BY s.createdAt DESC LIMIT ? OFFSET ?'; params.push(limit, offset);
      const { results } = await c.env.DB.prepare(query).bind(...params).all();
      const countQuery = search ? 'SELECT COUNT(*) as total FROM shops WHERE name LIKE ? OR email LIKE ?' : 'SELECT COUNT(*) as total FROM shops';
      const countParams = search ? [`%${search}%`, `%${search}%`] : [];
      const { results: countRes } = await c.env.DB.prepare(countQuery).bind(...countParams).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/admin/shops', requireAdmin, async (c) => {
    try {
      const { name, email, phone, ownerName, ownerEmail, ownerPassword } = await c.req.json();
      if (!name || !ownerEmail || !ownerPassword) return c.json({ error: 'name, ownerEmail, ownerPassword required' }, 400);
      const shopId = crypto.randomUUID(); const userId = crypto.randomUUID(); const now = new Date().toISOString();
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const { hashPassword } = await import('../main');
      const hashed = await hashPassword(ownerPassword);
      await c.env.DB.batch([
        c.env.DB.prepare('INSERT INTO shops (id, name, slug, phone, email, isActive, createdAt, updatedAt) VALUES (?,?,?,?,?,1,?,?)').bind(shopId, name, `${slug}-${shopId.slice(0,8)}`, phone || null, email || null, now, now),
        c.env.DB.prepare('INSERT INTO users (id, email, name, password, display_password, role, status, shopId, createdAt, updatedAt) VALUES (?,?,?,?,?,\'OWNER\',\'ACTIVE\',?,?,?)').bind(userId, ownerEmail, ownerName || name, hashed, ownerPassword, shopId, now, now),
      ]);
      return c.json({ data: { id: shopId, name } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/admin/shops/:id', requireAdmin, async (c) => {
    try {
      const shop = await c.env.DB.prepare('SELECT s.*, (SELECT COUNT(*) FROM users WHERE shopId = s.id) as userCount FROM shops s WHERE s.id = ?').bind(c.req.param('id')).first();
      if (!shop) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: shop });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/admin/shops/:id', requireAdmin, async (c) => {
    try {
      const body = await c.req.json();
      const allowed = ['name', 'description', 'address', 'phone', 'email', 'gstNumber', 'panNumber'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) { if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); } }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      vals.push(new Date().toISOString(), c.req.param('id'));
      await c.env.DB.prepare(`UPDATE shops SET ${sets.join(', ')}, updatedAt = ? WHERE id = ?`).bind(...vals).run();
      return c.json({ message: 'Updated' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/admin/shops/:id', requireAdmin, async (c) => {
    try {
      await c.env.DB.prepare("UPDATE shops SET isActive = 0, deletedAt = ? WHERE id = ?").bind(new Date().toISOString(), c.req.param('id')).run();
      return c.json({ message: 'Shop deactivated' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/admin/shops/:id/suspend', requireAdmin, async (c) => {
    try { await c.env.DB.prepare('UPDATE shops SET isActive = 0 WHERE id = ?').bind(c.req.param('id')).run(); return c.json({ message: 'Suspended' }); }
    catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/admin/shops/:id/activate', requireAdmin, async (c) => {
    try { await c.env.DB.prepare('UPDATE shops SET isActive = 1 WHERE id = ?').bind(c.req.param('id')).run(); return c.json({ message: 'Activated' }); }
    catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // Subscription Plans (admin)
  app.get('/api/admin/subscriptions', requireAdmin, async (c) => {
    try { const { results } = await c.env.DB.prepare('SELECT sp.*, (SELECT COUNT(*) FROM subscriptions WHERE subscriptionPlanId = sp.id) as subscriberCount FROM subscription_plans sp ORDER BY sp.monthlyPrice').all(); return c.json({ data: results }); }
    catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/admin/subscriptions', requireAdmin, async (c) => {
    try {
      const { name, code, monthlyPrice, yearlyPrice, maxUsers, maxShops, maxProducts, maxStaff, trialDays, features } = await c.req.json();
      if (!name || !code) return c.json({ error: 'name and code required' }, 400);
      const id = crypto.randomUUID();
      await c.env.DB.prepare('INSERT INTO subscription_plans (id, name, code, description, monthlyPrice, yearlyPrice, maxUsers, maxShops, maxProducts, maxStaff, trialDays, features, isActive, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)').bind(id, name, code, '', monthlyPrice || 0, yearlyPrice || 0, maxUsers || 5, maxShops || 1, maxProducts || 500, maxStaff || 10, trialDays || 14, features || '{}', new Date().toISOString(), new Date().toISOString()).run();
      return c.json({ data: { id, name, code } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/admin/subscriptions/:id', requireAdmin, async (c) => {
    try {
      const body = await c.req.json();
      const allowed = ['name', 'monthlyPrice', 'yearlyPrice', 'maxUsers', 'maxShops', 'maxProducts', 'maxStaff', 'trialDays', 'features', 'isActive'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) { if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); } }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      vals.push(new Date().toISOString(), c.req.param('id'));
      await c.env.DB.prepare(`UPDATE subscription_plans SET ${sets.join(', ')}, updatedAt = ? WHERE id = ?`).bind(...vals).run();
      return c.json({ message: 'Updated' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/admin/subscriptions/:id', requireAdmin, async (c) => {
    try { await c.env.DB.prepare('DELETE FROM subscription_plans WHERE id = ?').bind(c.req.param('id')).run(); return c.json({ message: 'Deleted' }); }
    catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // Login Credentials
  app.get('/api/admin/login-credentials', requireAdmin, async (c) => {
    try {
      const search = c.req.query('search') || '';
      const role = c.req.query('role') || '';
      const status = c.req.query('status') || '';
      const isLocked = c.req.query('locked') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      let query = "SELECT u.id, u.email, u.name, u.phone, u.role, u.status, u.shopId, u.tenantId, u.emailVerified, u.phoneVerified, u.failedAttempts, u.lockedUntil, u.lastLoginAt, u.createdAt, u.updatedAt, u.display_password as password, COALESCE(s.name, '') as shopName, COALESCE(t.name, '') as tenantName FROM users u LEFT JOIN shops s ON u.shopId = s.id LEFT JOIN tenants t ON u.tenantId = t.id WHERE u.deletedAt IS NULL";
      const params: any[] = [];
      if (search) { query += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
      if (role) { query += ' AND u.role = ?'; params.push(role); }
      if (status) { query += ' AND u.status = ?'; params.push(status); }
      if (isLocked === 'true') { query += ' AND u.failedAttempts >= 5'; }
      else if (isLocked === 'false') { query += ' AND u.failedAttempts < 5'; }
      query += ' ORDER BY u.createdAt DESC LIMIT ? OFFSET ?'; params.push(limit, offset);
      const { results } = await c.env.DB.prepare(query).bind(...params).all();
      let countQuery = "SELECT COUNT(*) as total FROM users u WHERE u.deletedAt IS NULL";
      const countParams: any[] = [];
      if (search) { countQuery += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)'; countParams.push(`%${search}%`, `%${search}%`, `%${search}%`); }
      if (role) { countQuery += ' AND u.role = ?'; countParams.push(role); }
      if (status) { countQuery += ' AND u.status = ?'; countParams.push(status); }
      if (isLocked === 'true') { countQuery += ' AND u.failedAttempts >= 5'; }
      else if (isLocked === 'false') { countQuery += ' AND u.failedAttempts < 5'; }
      const { results: countRes } = await c.env.DB.prepare(countQuery).bind(...countParams).all();
      const masked = (results as any[]).map((u: any) => ({
        ...u,
        lockedUntil: u.lockedUntil || null,
        locked: u.failedAttempts >= 5 && (!u.lockedUntil || new Date(u.lockedUntil) > new Date()),
      }));
      return c.json({ data: masked, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // Payments
  app.get('/api/admin/payments', requireAdmin, async (c) => {
    try {
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const search = c.req.query('search') || '';
      let query = 'SELECT p.*, s.name as shopName FROM payments p LEFT JOIN shops s ON p.shopId = s.id';
      const params: any[] = [];
      if (search) { query += ' WHERE s.name LIKE ?'; params.push(`%${search}%`); }
      query += ' ORDER BY p.createdAt DESC LIMIT ? OFFSET ?'; params.push(limit, offset);
      const { results } = await c.env.DB.prepare(query).bind(...params).all();
      const { results: countRes } = await c.env.DB.prepare(search ? 'SELECT COUNT(*) as total FROM payments p LEFT JOIN shops s ON p.shopId = s.id WHERE s.name LIKE ?' : 'SELECT COUNT(*) as total FROM payments').bind(...(search ? [`%${search}%`] : [])).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0 });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/admin/payments/:id', requireAdmin, async (c) => {
    try {
      const payment = await c.env.DB.prepare('SELECT p.*, s.name as shopName FROM payments p LEFT JOIN shops s ON p.shopId = s.id WHERE p.id = ?').bind(c.req.param('id')).first();
      if (!payment) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: payment });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });
}
