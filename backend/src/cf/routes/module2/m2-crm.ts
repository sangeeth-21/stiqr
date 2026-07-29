export function crmRoutes(app: any) {
  // ─── Customer: Create ──────────────────────────────────────────
  app.post('/api/customers', async (c) => {
    try {
      const { name, email, phone, address, groupId, creditLimit } = await c.req.json();
      if (!name) return c.json({ error: 'name is required' }, 400);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await c.env.DB.prepare(
        'INSERT INTO customers (id, shopId, name, email, phone, address, groupId, creditLimit, walletBalance, loyaltyPoints, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
      ).bind(id, c.var.shopId, name, email || null, phone || null, address || null, groupId || null, creditLimit || 0, 0, 0, now, now).run();
      return c.json({ data: { id, name, email, phone } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ─── Customer: List ────────────────────────────────────────────
  app.get('/api/customers', async (c) => {
    try {
      const db = c.env.DB;
      const search = c.req.query('search') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      let query = 'SELECT * FROM customers WHERE shopId = ? AND deletedAt IS NULL';
      const params: any[] = [c.var.shopId];
      if (search) {
        query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      const { results } = await db.prepare(query).bind(...params).all();
      const { results: countRes } = await db.prepare(
        'SELECT COUNT(*) as total FROM customers WHERE shopId = ? AND deletedAt IS NULL'
      ).bind(c.var.shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ─── Customer: Activity History ────────────────────────────────
  app.get('/api/customers/history', async (c) => {
    try {
      const customerId = c.req.query('customerId');
      if (!customerId) return c.json({ error: 'customerId query param required' }, 400);
      const { results } = await c.env.DB.prepare(`
        SELECT 'sale' as type, id, invoiceNumber as ref, total, createdAt FROM sales
          WHERE customerId = ? AND shopId = ?
        UNION ALL
        SELECT 'payment' as type, id, reference as ref, amount as total, createdAt FROM payments
          WHERE entityId = ? AND entityType = 'CUSTOMER' AND shopId = ?
        UNION ALL
        SELECT 'service' as type, id, ticketNumber as ref, actualCost as total, createdAt FROM service_repairs
          WHERE customerId = ? AND shopId = ?
        ORDER BY createdAt DESC LIMIT 50
      `).bind(customerId, c.var.shopId, customerId, c.var.shopId, customerId, c.var.shopId).all();
      return c.json({ data: results });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ─── Customer: Purchase History ────────────────────────────────
  app.get('/api/customers/purchases', async (c) => {
    try {
      const customerId = c.req.query('customerId');
      if (!customerId) return c.json({ error: 'customerId query param required' }, 400);
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await c.env.DB.prepare(
        'SELECT * FROM sales WHERE customerId = ? AND shopId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?'
      ).bind(customerId, c.var.shopId, limit, offset).all();
      const { results: countRes } = await c.env.DB.prepare(
        'SELECT COUNT(*) as total FROM sales WHERE customerId = ? AND shopId = ?'
      ).bind(customerId, c.var.shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ─── Customer: Service History ─────────────────────────────────
  app.get('/api/customers/services', async (c) => {
    try {
      const customerId = c.req.query('customerId');
      if (!customerId) return c.json({ error: 'customerId query param required' }, 400);
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await c.env.DB.prepare(
        'SELECT * FROM service_repairs WHERE customerId = ? AND shopId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?'
      ).bind(customerId, c.var.shopId, limit, offset).all();
      const { results: countRes } = await c.env.DB.prepare(
        'SELECT COUNT(*) as total FROM service_repairs WHERE customerId = ? AND shopId = ?'
      ).bind(customerId, c.var.shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ─── Customer: Credit Info ─────────────────────────────────────
  app.get('/api/customers/credit', async (c) => {
    try {
      const customerId = c.req.query('customerId');
      if (!customerId) return c.json({ error: 'customerId query param required' }, 400);
      const customer: any = await c.env.DB.prepare(
        'SELECT creditLimit, outstandingBalance, walletBalance FROM customers WHERE id = ? AND shopId = ? AND deletedAt IS NULL'
      ).bind(customerId, c.var.shopId).first();
      if (!customer) return c.json({ error: 'Customer not found' }, 404);
      const availableCredit = customer.creditLimit - customer.outstandingBalance;
      return c.json({ data: { outstandingBalance: customer.outstandingBalance, creditLimit: customer.creditLimit, availableCredit } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ─── Customer: Loyalty Info ────────────────────────────────────
  app.get('/api/customers/loyalty', async (c) => {
    try {
      const customerId = c.req.query('customerId');
      if (!customerId) return c.json({ error: 'customerId query param required' }, 400);
      const { results: earned } = await c.env.DB.prepare(
        "SELECT COALESCE(SUM(points), 0) as total FROM loyalty_transactions WHERE customerId = ? AND shopId = ? AND type = 'EARNED'"
      ).bind(customerId, c.var.shopId).all();
      const { results: redeemed } = await c.env.DB.prepare(
        "SELECT COALESCE(SUM(points), 0) as total FROM loyalty_transactions WHERE customerId = ? AND shopId = ? AND type = 'REDEEMED'"
      ).bind(customerId, c.var.shopId).all();
      const customer: any = await c.env.DB.prepare(
        'SELECT loyaltyPoints FROM customers WHERE id = ? AND shopId = ? AND deletedAt IS NULL'
      ).bind(customerId, c.var.shopId).first();
      return c.json({
        data: {
          points: customer?.loyaltyPoints || 0,
          totalEarned: (earned as any)[0]?.total || 0,
          totalRedeemed: (redeemed as any)[0]?.total || 0,
        }
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ─── Customer: Record Payment ──────────────────────────────────
  app.post('/api/customers/payment', async (c) => {
    try {
      const { customerId, amount, method, reference } = await c.req.json();
      if (!customerId || !amount || !method) return c.json({ error: 'customerId, amount, method required' }, 400);
      const customer: any = await c.env.DB.prepare(
        'SELECT id, walletBalance FROM customers WHERE id = ? AND shopId = ? AND deletedAt IS NULL'
      ).bind(customerId, c.var.shopId).first();
      if (!customer) return c.json({ error: 'Customer not found' }, 404);
      const now = new Date().toISOString();
      const paymentId = crypto.randomUUID();
      await c.env.DB.batch([
        c.env.DB.prepare(
          'INSERT INTO payments (id, shopId, entityType, entityId, method, amount, reference, processedAt, createdBy, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)'
        ).bind(paymentId, c.var.shopId, 'CUSTOMER', customerId, method, amount, reference || null, now, c.var.userId, now),
        c.env.DB.prepare(
          'UPDATE customers SET walletBalance = walletBalance + ?, updatedAt = ? WHERE id = ? AND shopId = ?'
        ).bind(amount, now, customerId, c.var.shopId),
      ]);
      return c.json({ data: { id: paymentId, customerId, amount, method } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ─── Customer: Add Address ─────────────────────────────────────
  app.post('/api/customers/address', async (c) => {
    try {
      const { customerId, type, address, city, state, pincode, isDefault } = await c.req.json();
      if (!customerId || !type || !address) return c.json({ error: 'customerId, type, address required' }, 400);
      const customer: any = await c.env.DB.prepare(
        'SELECT id, kycDocuments FROM customers WHERE id = ? AND shopId = ? AND deletedAt IS NULL'
      ).bind(customerId, c.var.shopId).first();
      if (!customer) return c.json({ error: 'Customer not found' }, 404);
      const addresses = customer.kycDocuments ? (JSON.parse(customer.kycDocuments).addresses || []) : [];
      const addrId = crypto.randomUUID();
      addresses.push({ id: addrId, type, address, city, cityState: state, pincode, country: 'India', isDefault: isDefault || false, createdAt: new Date().toISOString() });
      const kycData = customer.kycDocuments ? { ...JSON.parse(customer.kycDocuments), addresses } : { addresses };
      await c.env.DB.prepare('UPDATE customers SET kycDocuments = ?, updatedAt = ? WHERE id = ? AND shopId = ?')
        .bind(JSON.stringify(kycData), new Date().toISOString(), customerId, c.var.shopId).run();
      return c.json({ data: { id: addrId, type, address } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ─── Customer: Update Address ──────────────────────────────────
  app.patch('/api/customers/address/:id', async (c) => {
    try {
      const addrId = c.req.param('id');
      const body = await c.req.json();
      const customerId = c.req.query('customerId');
      if (!customerId) return c.json({ error: 'customerId query param required' }, 400);
      const customer: any = await c.env.DB.prepare(
        'SELECT id, kycDocuments FROM customers WHERE id = ? AND shopId = ? AND deletedAt IS NULL'
      ).bind(customerId, c.var.shopId).first();
      if (!customer) return c.json({ error: 'Customer not found' }, 404);
      const kycData = customer.kycDocuments ? JSON.parse(customer.kycDocuments) : {};
      const addresses: any[] = kycData.addresses || [];
      const idx = addresses.findIndex((a: any) => a.id === addrId);
      if (idx === -1) return c.json({ error: 'Address not found' }, 404);
      for (const k of ['type', 'address', 'city', 'state', 'pincode', 'isDefault']) {
        if (body[k] !== undefined) addresses[idx][k] = body[k];
      }
      addresses[idx].updatedAt = new Date().toISOString();
      kycData.addresses = addresses;
      await c.env.DB.prepare('UPDATE customers SET kycDocuments = ?, updatedAt = ? WHERE id = ? AND shopId = ?')
        .bind(JSON.stringify(kycData), new Date().toISOString(), customerId, c.var.shopId).run();
      return c.json({ data: addresses[idx] });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ─── Customer: Delete Address ──────────────────────────────────
  app.delete('/api/customers/address/:id', async (c) => {
    try {
      const addrId = c.req.param('id');
      const customerId = c.req.query('customerId');
      if (!customerId) return c.json({ error: 'customerId query param required' }, 400);
      const customer: any = await c.env.DB.prepare(
        'SELECT id, kycDocuments FROM customers WHERE id = ? AND shopId = ? AND deletedAt IS NULL'
      ).bind(customerId, c.var.shopId).first();
      if (!customer) return c.json({ error: 'Customer not found' }, 404);
      const kycData = customer.kycDocuments ? JSON.parse(customer.kycDocuments) : {};
      const addresses: any[] = (kycData.addresses || []).filter((a: any) => a.id !== addrId);
      kycData.addresses = addresses;
      await c.env.DB.prepare('UPDATE customers SET kycDocuments = ?, updatedAt = ? WHERE id = ? AND shopId = ?')
        .bind(JSON.stringify(kycData), new Date().toISOString(), customerId, c.var.shopId).run();
      return c.json({ message: 'Address deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ─── Customer: Get By ID (MUST be after static /api/customers/* routes) ─
  app.get('/api/customers/:id', async (c) => {
    try {
      const { id } = c.req.param();
      const customer: any = await c.env.DB.prepare(
        'SELECT * FROM customers WHERE id = ? AND shopId = ? AND deletedAt IS NULL'
      ).bind(id, c.var.shopId).first();
      if (!customer) return c.json({ error: 'Not found' }, 404);
      const { results: purchases } = await c.env.DB.prepare(
        'SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE customerId = ? AND shopId = ?'
      ).bind(id, c.var.shopId).all();
      const { results: earned } = await c.env.DB.prepare(
        "SELECT COALESCE(SUM(points), 0) as total FROM loyalty_transactions WHERE customerId = ? AND shopId = ? AND type = 'EARNED'"
      ).bind(id, c.var.shopId).all();
      const { results: redeemed } = await c.env.DB.prepare(
        "SELECT COALESCE(SUM(points), 0) as total FROM loyalty_transactions WHERE customerId = ? AND shopId = ? AND type = 'REDEEMED'"
      ).bind(id, c.var.shopId).all();
      return c.json({
        data: {
          ...customer,
          totalPurchases: (purchases as any)[0]?.total || 0,
          loyalty: { totalEarned: (earned as any)[0]?.total || 0, totalRedeemed: (redeemed as any)[0]?.total || 0 }
        }
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ─── Customer: Update ──────────────────────────────────────────
  app.patch('/api/customers/:id', async (c) => {
    try {
      const { id } = c.req.param();
      const body = await c.req.json();
      const sets: string[] = [];
      const vals: any[] = [];
      for (const k of ['name', 'email', 'phone', 'address', 'groupId', 'creditLimit', 'kycVerified', 'kycDocuments']) {
        if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); }
      }
      if (!sets.length) return c.json({ error: 'No fields to update' }, 400);
      vals.push(new Date().toISOString(), id, c.var.shopId);
      await c.env.DB.prepare(`UPDATE customers SET ${sets.join(', ')}, updatedAt = ? WHERE id = ? AND shopId = ? AND deletedAt IS NULL`).bind(...vals).run();
      return c.json({ message: 'Updated' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ─── Customer: Soft Delete ─────────────────────────────────────
  app.delete('/api/customers/:id', async (c) => {
    try {
      const { id } = c.req.param();
      const now = new Date().toISOString();
      await c.env.DB.prepare('UPDATE customers SET deletedAt = ?, updatedAt = ? WHERE id = ? AND shopId = ?')
        .bind(now, now, id, c.var.shopId).run();
      return c.json({ message: 'Deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ═══════════════════════════════════════════════════════════════
  // SUPPLIER ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  // ─── Supplier: Create ──────────────────────────────────────────
  app.post('/api/suppliers', async (c) => {
    try {
      const { name, email, phone, address, contactPerson, paymentTerms, bankDetails } = await c.req.json();
      if (!name) return c.json({ error: 'name is required' }, 400);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await c.env.DB.prepare(
        'INSERT INTO suppliers (id, shopId, name, email, phone, address, contactPerson, paymentTerms, bankDetails, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
      ).bind(id, c.var.shopId, name, email || null, phone || null, address || null, contactPerson || null, paymentTerms || null, bankDetails || null, now, now).run();
      return c.json({ data: { id, name, email, phone } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ─── Supplier: List ────────────────────────────────────────────
  app.get('/api/suppliers', async (c) => {
    try {
      const db = c.env.DB;
      const search = c.req.query('search') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      let query = 'SELECT * FROM suppliers WHERE shopId = ? AND deletedAt IS NULL';
      const params: any[] = [c.var.shopId];
      if (search) {
        query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      const { results } = await db.prepare(query).bind(...params).all();
      const { results: countRes } = await db.prepare(
        'SELECT COUNT(*) as total FROM suppliers WHERE shopId = ? AND deletedAt IS NULL'
      ).bind(c.var.shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ─── Supplier: Purchase History ────────────────────────────────
  app.get('/api/suppliers/purchases', async (c) => {
    try {
      const supplierId = c.req.query('supplierId');
      if (!supplierId) return c.json({ error: 'supplierId query param required' }, 400);
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await c.env.DB.prepare(
        'SELECT * FROM purchases WHERE supplierId = ? AND shopId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?'
      ).bind(supplierId, c.var.shopId, limit, offset).all();
      const { results: countRes } = await c.env.DB.prepare(
        'SELECT COUNT(*) as total FROM purchases WHERE supplierId = ? AND shopId = ?'
      ).bind(supplierId, c.var.shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ─── Supplier: Payment History ─────────────────────────────────
  app.get('/api/suppliers/payment-history', async (c) => {
    try {
      const supplierId = c.req.query('supplierId');
      if (!supplierId) return c.json({ error: 'supplierId query param required' }, 400);
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await c.env.DB.prepare(`
        SELECT p.id, p.invoiceNumber, p.total, p.paidAmount, p.status as purchaseStatus,
               pm.id as paymentId, pm.amount as paymentAmount, pm.method, pm.reference, pm.processedAt, pm.createdAt as paymentDate
        FROM purchases p
        LEFT JOIN payments pm ON pm.entityId = p.id AND pm.entityType = 'PURCHASE'
        WHERE p.supplierId = ? AND p.shopId = ?
        ORDER BY COALESCE(pm.processedAt, p.createdAt) DESC LIMIT ? OFFSET ?
      `).bind(supplierId, c.var.shopId, limit, offset).all();
      const { results: countRes } = await c.env.DB.prepare(
        'SELECT COUNT(*) as total FROM purchases WHERE supplierId = ? AND shopId = ?'
      ).bind(supplierId, c.var.shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ─── Supplier: Pay Supplier ────────────────────────────────────
  app.post('/api/suppliers/payment', async (c) => {
    try {
      const { supplierId, amount, method, reference, purchaseId } = await c.req.json();
      if (!supplierId || !amount || !method) return c.json({ error: 'supplierId, amount, method required' }, 400);
      const supplier: any = await c.env.DB.prepare(
        'SELECT id FROM suppliers WHERE id = ? AND shopId = ? AND deletedAt IS NULL'
      ).bind(supplierId, c.var.shopId).first();
      if (!supplier) return c.json({ error: 'Supplier not found' }, 404);
      const now = new Date().toISOString();
      const paymentId = crypto.randomUUID();
      const ops: any[] = [
        c.env.DB.prepare(
          'INSERT INTO payments (id, shopId, entityType, entityId, method, amount, reference, processedAt, createdBy, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)'
        ).bind(paymentId, c.var.shopId, 'SUPPLIER', supplierId, method, amount, reference || null, now, c.var.userId, now),
        c.env.DB.prepare(
          'UPDATE suppliers SET outstandingBalance = outstandingBalance - ?, updatedAt = ? WHERE id = ? AND shopId = ?'
        ).bind(amount, now, supplierId, c.var.shopId),
      ];
      if (purchaseId) {
        ops.push(c.env.DB.prepare(
          'UPDATE purchases SET paidAmount = paidAmount + ?, paymentStatus = CASE WHEN paidAmount + ? >= total THEN ? ELSE ? END, updatedAt = ? WHERE id = ? AND shopId = ?'
        ).bind(amount, amount, 'PAID', 'PARTIAL', now, purchaseId, c.var.shopId));
        ops.push(c.env.DB.prepare(
          'UPDATE payments SET saleId = ? WHERE id = ?'
        ).bind(purchaseId, paymentId));
      }
      await c.env.DB.batch(ops);
      return c.json({ data: { id: paymentId, supplierId, amount, method } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ─── Supplier: Get By ID (MUST be after static /api/suppliers/* routes) ─
  app.get('/api/suppliers/:id', async (c) => {
    try {
      const { id } = c.req.param();
      const supplier: any = await c.env.DB.prepare(
        'SELECT * FROM suppliers WHERE id = ? AND shopId = ? AND deletedAt IS NULL'
      ).bind(id, c.var.shopId).first();
      if (!supplier) return c.json({ error: 'Not found' }, 404);
      const { results: purchases } = await c.env.DB.prepare(
        'SELECT COALESCE(SUM(total), 0) as total FROM purchases WHERE supplierId = ? AND shopId = ?'
      ).bind(id, c.var.shopId).all();
      return c.json({ data: { ...supplier, totalPurchases: (purchases as any)[0]?.total || 0 } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ─── Supplier: Update ──────────────────────────────────────────
  app.patch('/api/suppliers/:id', async (c) => {
    try {
      const { id } = c.req.param();
      const body = await c.req.json();
      const sets: string[] = [];
      const vals: any[] = [];
      for (const k of ['name', 'email', 'phone', 'address', 'contactPerson', 'paymentTerms', 'bankDetails']) {
        if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); }
      }
      if (!sets.length) return c.json({ error: 'No fields to update' }, 400);
      vals.push(new Date().toISOString(), id, c.var.shopId);
      await c.env.DB.prepare(`UPDATE suppliers SET ${sets.join(', ')}, updatedAt = ? WHERE id = ? AND shopId = ? AND deletedAt IS NULL`).bind(...vals).run();
      return c.json({ message: 'Updated' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ─── Supplier: Soft Delete ─────────────────────────────────────
  app.delete('/api/suppliers/:id', async (c) => {
    try {
      const { id } = c.req.param();
      const now = new Date().toISOString();
      await c.env.DB.prepare('UPDATE suppliers SET deletedAt = ?, updatedAt = ? WHERE id = ? AND shopId = ?')
        .bind(now, now, id, c.var.shopId).run();
      return c.json({ message: 'Deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });
}
