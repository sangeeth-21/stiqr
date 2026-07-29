export function staffRoutes(app: any) {
  app.get('/api/staff', async (c) => {
    try {
      const db = c.env.DB;
      const search = c.req.query('search') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      let query = `SELECT u.id, u.email, u.name, u.phone, u.role, u.status, u.avatar, u.createdAt, u.updatedAt,
        e.designation, e.salary, e.shiftStart, e.shiftEnd
        FROM users u LEFT JOIN employees e ON u.id = e.userId WHERE u.shopId = ? AND u.role != 'OWNER'`;
      const params: any[] = [c.var.shopId];
      if (search) { query += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
      query += ' ORDER BY u.createdAt DESC LIMIT ? OFFSET ?'; params.push(limit, offset);
      const { results } = await db.prepare(query).bind(...params).all();
      const { results: countRes } = await db.prepare('SELECT COUNT(*) as total FROM users WHERE shopId = ? AND role != ?').bind(c.var.shopId, 'OWNER').all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/staff', async (c) => {
    try {
      const { name, email, phone, password, role, designation, salary } = await c.req.json();
      if (!name || !email || !password) return c.json({ error: 'name, email, password required' }, 400);
      const userId = crypto.randomUUID(); const empId = crypto.randomUUID(); const now = new Date().toISOString();
      const { hashPassword } = await import('../main');
      const hashed = await hashPassword(password);
      await c.env.DB.batch([
        c.env.DB.prepare('INSERT INTO users (id, email, name, phone, password, role, status, shopId, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(userId, email, name, phone || null, hashed, role || 'STAFF', 'ACTIVE', c.var.shopId, now, now),
        c.env.DB.prepare('INSERT INTO employees (id, userId, shopId, name, email, phone, designation, salary, status, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(empId, userId, c.var.shopId, name, email, phone || null, designation || null, salary || null, 'ACTIVE', now),
      ]);
      return c.json({ data: { id: userId, email, name, role: role || 'STAFF' } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/staff/:id', async (c) => {
    try {
      const user = await c.env.DB.prepare(`SELECT u.id, u.email, u.name, u.phone, u.role, u.status, u.avatar,
        e.designation, e.salary, e.shiftStart, e.shiftEnd, e.joinDate
        FROM users u LEFT JOIN employees e ON u.id = e.userId WHERE u.id = ? AND u.shopId = ?`).bind(c.req.param('id'), c.var.shopId).first();
      if (!user) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: user });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/staff/:id', async (c) => {
    try {
      const body = await c.req.json();
      const userSets: string[] = []; const empSets: string[] = []; const vals: any[] = [];
      for (const k of ['name', 'email', 'phone']) { if (body[k] !== undefined) { userSets.push(`${k} = ?`); vals.push(body[k]); } }
      for (const k of ['designation', 'salary', 'shiftStart', 'shiftEnd']) { if (body[k] !== undefined) { empSets.push(`${k} = ?`); vals.push(body[k]); } }
      if (userSets.length) {
        vals.push(new Date().toISOString(), c.req.param('id'), c.var.shopId);
        await c.env.DB.prepare(`UPDATE users SET ${userSets.join(', ')}, updatedAt = ? WHERE id = ? AND shopId = ?`).bind(...vals.slice(0, userSets.length + 3 - (empSets.length > 0 ? 0 : vals.length))).run();
      }
      if (empSets.length) {
        const empVals = [...vals.slice(userSets.length > 0 ? userSets.length + 3 : 0), new Date().toISOString(), c.req.param('id')];
        await c.env.DB.prepare(`UPDATE employees SET ${empSets.join(', ')}, updatedAt = ? WHERE userId = ?`).bind(...empVals).run();
      }
      return c.json({ message: 'Updated' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/staff/:id', async (c) => {
    try {
      const now = new Date().toISOString();
      await c.env.DB.batch([
        c.env.DB.prepare("UPDATE users SET status = 'DELETED', deletedAt = ? WHERE id = ? AND shopId = ?").bind(now, c.req.param('id'), c.var.shopId),
        c.env.DB.prepare("UPDATE employees SET status = 'INACTIVE', deletedAt = ? WHERE userId = ?").bind(now, c.req.param('id')),
      ]);
      return c.json({ message: 'Deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/staff/:id/activate', async (c) => {
    try {
      await c.env.DB.batch([
        c.env.DB.prepare("UPDATE users SET status = 'ACTIVE' WHERE id = ? AND shopId = ?").bind(c.req.param('id'), c.var.shopId),
        c.env.DB.prepare("UPDATE employees SET status = 'ACTIVE' WHERE userId = ?").bind(c.req.param('id')),
      ]);
      return c.json({ message: 'Activated' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/staff/:id/suspend', async (c) => {
    try {
      await c.env.DB.batch([
        c.env.DB.prepare("UPDATE users SET status = 'SUSPENDED' WHERE id = ? AND shopId = ?").bind(c.req.param('id'), c.var.shopId),
        c.env.DB.prepare("UPDATE employees SET status = 'INACTIVE' WHERE userId = ?").bind(c.req.param('id')),
      ]);
      return c.json({ message: 'Suspended' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/staff/:id/password', async (c) => {
    try {
      const { password } = await c.req.json();
      if (!password || password.length < 6) return c.json({ error: 'Password must be at least 6 characters' }, 400);
      const { hashPassword } = await import('../main');
      const hashed = await hashPassword(password);
      await c.env.DB.prepare('UPDATE users SET password = ?, updatedAt = ? WHERE id = ? AND shopId = ?').bind(hashed, new Date().toISOString(), c.req.param('id'), c.var.shopId).run();
      return c.json({ message: 'Password reset' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });
}
