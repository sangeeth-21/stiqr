function randomSuffix() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}

export function financeRoutes(app: any) {

  // ==================== EXPENSES ====================

  app.post('/api/expenses', async (c) => {
    try {
      const { branchId, category, description, amount, date, paymentMethod, reference, receipt } = await c.req.json();
      if (!category || !description || amount === undefined) return c.json({ error: 'category, description, amount required' }, 400);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await c.env.DB.prepare(
        'INSERT INTO expenses (id, shopId, branchId, category, description, amount, date, paymentMethod, reference, receipt, createdBy, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
      ).bind(id, c.var.shopId, branchId || null, category, description, amount, date || now, paymentMethod || 'CASH', reference || null, receipt || null, c.var.userId, now, now).run();
      return c.json({ data: { id, branchId: branchId || null, category, description, amount, date: date || now, paymentMethod: paymentMethod || 'CASH', reference: reference || null, receipt: receipt || null } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/expenses', async (c) => {
    try {
      const db = c.env.DB;
      const search = c.req.query('search') || '';
      const category = c.req.query('category') || '';
      const fromDate = c.req.query('fromDate') || '';
      const toDate = c.req.query('toDate') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const shopId = c.var.shopId;
      let where = 'WHERE shopId = ? AND deletedAt IS NULL';
      const params: any[] = [shopId];
      if (search) { where += ' AND (description LIKE ? OR category LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
      if (category) { where += ' AND category = ?'; params.push(category); }
      if (fromDate) { where += ' AND date >= ?'; params.push(fromDate); }
      if (toDate) { where += ' AND date <= ?'; params.push(toDate); }
      const { results } = await db.prepare(`SELECT * FROM expenses ${where} ORDER BY date DESC, createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM expenses ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/expenses/report', async (c) => {
    try {
      const { results } = await c.env.DB.prepare(
        'SELECT category, SUM(amount) as total, COUNT(*) as count FROM expenses WHERE shopId = ? AND deletedAt IS NULL GROUP BY category ORDER BY total DESC'
      ).bind(c.var.shopId).all();
      return c.json({ data: results });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/expenses/:id', async (c) => {
    try {
      const body = await c.req.json();
      const allowed = ['category', 'description', 'amount', 'date', 'paymentMethod', 'reference', 'receipt'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) { if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); } }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      vals.push(new Date().toISOString(), c.req.param('id'), c.var.shopId);
      await c.env.DB.prepare(`UPDATE expenses SET ${sets.join(', ')}, updatedAt = ? WHERE id = ? AND shopId = ?`).bind(...vals).run();
      const expense = await c.env.DB.prepare('SELECT * FROM expenses WHERE id = ? AND shopId = ?').bind(c.req.param('id'), c.var.shopId).first();
      return c.json({ data: expense });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/expenses/:id', async (c) => {
    try {
      const now = new Date().toISOString();
      await c.env.DB.prepare('UPDATE expenses SET deletedAt = ?, updatedAt = ? WHERE id = ? AND shopId = ?').bind(now, now, c.req.param('id'), c.var.shopId).run();
      return c.json({ message: 'Deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== INCOME ====================

  app.post('/api/income', async (c) => {
    try {
      const { branchId, source, description, amount, date, paymentMethod, reference } = await c.req.json();
      if (!source || !description || amount === undefined) return c.json({ error: 'source, description, amount required' }, 400);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await c.env.DB.prepare(
        'INSERT INTO income (id, shopId, branchId, source, description, amount, date, paymentMethod, reference, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
      ).bind(id, c.var.shopId, branchId || null, source, description, amount, date || now, paymentMethod || 'CASH', reference || null, now, now).run();
      return c.json({ data: { id, branchId: branchId || null, source, description, amount, date: date || now, paymentMethod: paymentMethod || 'CASH', reference: reference || null } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/income/report', async (c) => {
    try {
      const { results } = await c.env.DB.prepare(
        'SELECT source, SUM(amount) as total, COUNT(*) as count FROM income WHERE shopId = ? AND deletedAt IS NULL GROUP BY source ORDER BY total DESC'
      ).bind(c.var.shopId).all();
      return c.json({ data: results });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/income', async (c) => {
    try {
      const db = c.env.DB;
      const search = c.req.query('search') || '';
      const source = c.req.query('source') || '';
      const fromDate = c.req.query('fromDate') || '';
      const toDate = c.req.query('toDate') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const shopId = c.var.shopId;
      let where = 'WHERE shopId = ? AND deletedAt IS NULL';
      const params: any[] = [shopId];
      if (search) { where += ' AND (description LIKE ? OR source LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
      if (source) { where += ' AND source = ?'; params.push(source); }
      if (fromDate) { where += ' AND date >= ?'; params.push(fromDate); }
      if (toDate) { where += ' AND date <= ?'; params.push(toDate); }
      const { results } = await db.prepare(`SELECT * FROM income ${where} ORDER BY date DESC, createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM income ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== COUPONS ====================

  app.post('/api/coupons', async (c) => {
    try {
      const { code, type, value, minPurchase, maxDiscount, usageLimit, startDate, endDate, productIds } = await c.req.json();
      if (!code || !type || value === undefined) return c.json({ error: 'code, type, value required' }, 400);
      if (!['PERCENTAGE', 'FIXED', 'FREE_SHIPPING'].includes(type)) return c.json({ error: 'type must be PERCENTAGE, FIXED, or FREE_SHIPPING' }, 400);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const finalCode = code.trim().toUpperCase();
      const existing = await c.env.DB.prepare('SELECT id FROM coupons WHERE shopId = ? AND code = ?').bind(c.var.shopId, finalCode).first();
      if (existing) return c.json({ error: 'Coupon code already exists' }, 409);
      await c.env.DB.prepare(
        'INSERT INTO coupons (id, shopId, code, type, value, minPurchase, maxDiscount, usageLimit, startDate, endDate, isActive, productIds, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,1,?,?,?)'
      ).bind(id, c.var.shopId, finalCode, type, value, minPurchase ?? 0, maxDiscount ?? null, usageLimit ?? null, startDate || null, endDate || null, productIds ? JSON.stringify(productIds) : null, now, now).run();
      return c.json({ data: { id, code: finalCode, type, value, minPurchase: minPurchase ?? 0, maxDiscount: maxDiscount ?? null, usageLimit: usageLimit ?? null, startDate: startDate || null, endDate: endDate || null, isActive: true, productIds: productIds || null } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/coupons', async (c) => {
    try {
      const db = c.env.DB;
      const search = c.req.query('search') || '';
      const isActive = c.req.query('isActive') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const shopId = c.var.shopId;
      let where = 'WHERE shopId = ?';
      const params: any[] = [shopId];
      if (search) { where += ' AND code LIKE ?'; params.push(`%${search.toUpperCase()}%`); }
      if (isActive !== '') { where += ' AND isActive = ?'; params.push(isActive === 'true' ? 1 : 0); }
      const { results } = await db.prepare(`SELECT * FROM coupons ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM coupons ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/coupons/:id', async (c) => {
    try {
      const body = await c.req.json();
      const allowed = ['code', 'type', 'value', 'minPurchase', 'maxDiscount', 'usageLimit', 'startDate', 'endDate', 'isActive', 'productIds'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) {
        if (body[k] !== undefined) {
          if (k === 'code') { sets.push('code = ?'); vals.push(String(body[k]).trim().toUpperCase()); }
          else if (k === 'productIds') { sets.push('productIds = ?'); vals.push(JSON.stringify(body[k])); }
          else if (k === 'isActive') { sets.push('isActive = ?'); vals.push(body[k] ? 1 : 0); }
          else { sets.push(`${k} = ?`); vals.push(body[k]); }
        }
      }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      vals.push(new Date().toISOString(), c.req.param('id'), c.var.shopId);
      await c.env.DB.prepare(`UPDATE coupons SET ${sets.join(', ')}, updatedAt = ? WHERE id = ? AND shopId = ?`).bind(...vals).run();
      const coupon = await c.env.DB.prepare('SELECT * FROM coupons WHERE id = ? AND shopId = ?').bind(c.req.param('id'), c.var.shopId).first();
      return c.json({ data: coupon });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/coupons/:id', async (c) => {
    try {
      await c.env.DB.prepare('UPDATE coupons SET isActive = 0, updatedAt = ? WHERE id = ? AND shopId = ?').bind(new Date().toISOString(), c.req.param('id'), c.var.shopId).run();
      return c.json({ message: 'Deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== DISCOUNTS ====================

  app.post('/api/discounts', async (c) => {
    try {
      const { name, type, value, minPurchase, maxDiscount, applicableTo, productIds, categoryId, startDate, endDate, isActive } = await c.req.json();
      if (!name || !type || value === undefined) return c.json({ error: 'name, type, value required' }, 400);
      if (!['PERCENTAGE', 'FIXED'].includes(type)) return c.json({ error: 'type must be PERCENTAGE or FIXED' }, 400);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const code = `DSC-${name.toUpperCase().replace(/\s+/g, '_')}-${randomSuffix()}`;
      const extra = JSON.stringify({ name, applicableTo: applicableTo || 'ALL', categoryId: categoryId || null });
      const productIdsValue = (productIds && Array.isArray(productIds) && productIds.length > 0)
        ? JSON.stringify(productIds)
        : extra;
      await c.env.DB.prepare(
        'INSERT INTO coupons (id, shopId, code, type, value, minPurchase, maxDiscount, startDate, endDate, isActive, productIds, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
      ).bind(id, c.var.shopId, code, type, value, minPurchase ?? 0, maxDiscount ?? null, startDate || null, endDate || null, isActive !== undefined ? (isActive ? 1 : 0) : 1, productIdsValue, now, now).run();
      return c.json({ data: { id, code, name, type, value, minPurchase: minPurchase ?? 0, maxDiscount: maxDiscount ?? null, applicableTo: applicableTo || 'ALL', categoryId: categoryId || null, productIds: productIds || null, startDate: startDate || null, endDate: endDate || null, isActive: isActive !== undefined ? isActive : true } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/discounts', async (c) => {
    try {
      const db = c.env.DB;
      const search = c.req.query('search') || '';
      const isActive = c.req.query('isActive') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const shopId = c.var.shopId;
      let where = 'WHERE shopId = ? AND code LIKE ?';
      const params: any[] = [shopId, 'DSC-%'];
      if (search) { where += ' AND code LIKE ?'; params.push(`%${search.toUpperCase()}%`); }
      if (isActive !== '') { where += ' AND isActive = ?'; params.push(isActive === 'true' ? 1 : 0); }
      const { results } = await db.prepare(`SELECT * FROM coupons ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM coupons ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });
}
