const posCarts = new Map<string, any>();

function genInvoice(prefix: string): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const r = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}-${y}${m}${day}-${r}`;
}

export function transactionRoutes(app: any) {

  // ==================== PURCHASE MANAGEMENT ====================

  app.post('/api/purchases', async (c) => {
    try {
      const { supplierId, warehouseId, date, items, discount, notes } = await c.req.json();
      if (!supplierId || !items || !items.length) return c.json({ error: 'supplierId and items required' }, 400);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const invoiceNumber = genInvoice('PO');
      let subtotal = 0, taxAmount = 0;
      const batchItems = [];
      for (const item of items) {
        const qty = item.quantity || 1;
        const price = item.unitPrice || 0;
        const rate = item.taxRate || 0;
        const lineTotal = qty * price;
        subtotal += lineTotal;
        const lineTax = lineTotal * (rate / 100);
        taxAmount += lineTax;
        const itemId = crypto.randomUUID();
        batchItems.push(c.env.DB.prepare(
          'INSERT INTO purchase_items (id, purchaseId, productId, variantId, quantity, unitPrice, taxRate, taxAmount, total, received, batch, expiryDate) VALUES (?,?,?,?,?,?,?,?,?,0,?,?)'
        ).bind(itemId, id, item.productId, item.variantId || null, qty, price, rate, lineTax, lineTotal + lineTax, item.batch || null, item.expiryDate || null));
      }
      const totalDiscount = discount || 0;
      const total = subtotal + taxAmount - totalDiscount;
      await c.env.DB.batch([
        c.env.DB.prepare(
          'INSERT INTO purchases (id, shopId, supplierId, warehouseId, invoiceNumber, date, subtotal, taxAmount, discount, total, paidAmount, status, paymentStatus, notes, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,0,?,?,?,?,?)'
        ).bind(id, c.var.shopId, supplierId, warehouseId || null, invoiceNumber, date || now, subtotal, taxAmount, totalDiscount, total, 'PENDING', 'UNPAID', notes || null, now, now),
        ...batchItems
      ]);
      return c.json({ data: { id, invoiceNumber, total, status: 'PENDING' } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/purchases', async (c) => {
    try {
      const db = c.env.DB;
      const search = c.req.query('search') || '';
      const status = c.req.query('status') || '';
      const fromDate = c.req.query('fromDate') || '';
      const toDate = c.req.query('toDate') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const shopId = c.var.shopId;
      let where = 'WHERE p.shopId = ? AND p.deletedAt IS NULL';
      const params: any[] = [shopId];
      if (search) { where += ' AND (p.invoiceNumber LIKE ? OR s.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
      if (status) { where += ' AND p.status = ?'; params.push(status); }
      if (fromDate) { where += ' AND p.date >= ?'; params.push(fromDate); }
      if (toDate) { where += ' AND p.date <= ?'; params.push(toDate); }
      const { results } = await db.prepare(`SELECT p.*, s.name as supplierName FROM purchases p LEFT JOIN suppliers s ON s.id = p.supplierId ${where} ORDER BY p.createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM purchases p LEFT JOIN suppliers s ON s.id = p.supplierId ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/purchases/:id', async (c) => {
    try {
      const db = c.env.DB;
      const purchase = await db.prepare('SELECT p.*, s.name as supplierName FROM purchases p LEFT JOIN suppliers s ON s.id = p.supplierId WHERE p.id = ? AND p.shopId = ?').bind(c.req.param('id'), c.var.shopId).first() as any;
      if (!purchase) return c.json({ error: 'Not found' }, 404);
      const { results: items } = await db.prepare(
        'SELECT pi.*, pr.name as productName, pr.sku as productSku FROM purchase_items pi LEFT JOIN products pr ON pr.id = pi.productId WHERE pi.purchaseId = ?'
      ).bind(purchase.id).all();
      purchase.items = items;
      return c.json({ data: purchase });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/purchases/:id', async (c) => {
    try {
      const body = await c.req.json();
      const allowed = ['status', 'notes', 'discount'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) { if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); } }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      if (body.discount !== undefined) {
        const existing = await c.env.DB.prepare('SELECT subtotal, taxAmount FROM purchases WHERE id = ? AND shopId = ?').bind(c.req.param('id'), c.var.shopId).first() as any;
        if (existing) {
          const newTotal = existing.subtotal + existing.taxAmount - body.discount;
          sets.push('total = ?'); vals.push(newTotal);
        }
      }
      vals.push(new Date().toISOString(), c.req.param('id'), c.var.shopId);
      await c.env.DB.prepare(`UPDATE purchases SET ${sets.join(', ')}, updatedAt = ? WHERE id = ? AND shopId = ?`).bind(...vals).run();
      const updated = await c.env.DB.prepare('SELECT * FROM purchases WHERE id = ?').bind(c.req.param('id')).first();
      return c.json({ data: updated });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/purchases/:id', async (c) => {
    try {
      const now = new Date().toISOString();
      await c.env.DB.prepare('UPDATE purchases SET deletedAt = ?, updatedAt = ? WHERE id = ? AND shopId = ?').bind(now, now, c.req.param('id'), c.var.shopId).run();
      return c.json({ message: 'Deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/purchases/receive', async (c) => {
    try {
      const { purchaseId, items } = await c.req.json();
      if (!purchaseId || !items || !items.length) return c.json({ error: 'purchaseId and items required' }, 400);
      const db = c.env.DB;
      const purchase = await db.prepare('SELECT * FROM purchases WHERE id = ? AND shopId = ?').bind(purchaseId, c.var.shopId).first() as any;
      if (!purchase) return c.json({ error: 'Purchase not found' }, 404);
      const now = new Date().toISOString();
      const batch: any[] = [];
      for (const item of items) {
        batch.push(db.prepare('UPDATE purchase_items SET received = ? WHERE id = ? AND purchaseId = ?').bind(item.received, item.id, purchaseId));
        const pi = await db.prepare('SELECT * FROM purchase_items WHERE id = ? AND purchaseId = ?').bind(item.id, purchaseId).first() as any;
        if (!pi) continue;
        const existingStock = await db.prepare(
          'SELECT * FROM stock WHERE productId = ? AND (variantId IS ? OR variantId = ?) AND warehouseId IS ? AND (batch IS ? OR batch = ?)'
        ).bind(pi.productId, pi.variantId || null, pi.variantId || null, purchase.warehouseId || null, pi.batch || null, pi.batch || null).first() as any;
        if (existingStock) {
          batch.push(db.prepare('UPDATE stock SET quantity = quantity + ?, updatedAt = ? WHERE id = ?').bind(item.received, now, existingStock.id));
        } else {
          batch.push(db.prepare(
            'INSERT INTO stock (id, productId, variantId, warehouseId, quantity, reserved, damaged, batch, expiryDate, createdAt, updatedAt) VALUES (?,?,?,?,?,0,0,?,?,?,?)'
          ).bind(crypto.randomUUID(), pi.productId, pi.variantId || null, purchase.warehouseId || null, item.received, pi.batch || null, pi.expiryDate || null, now, now));
        }
        batch.push(db.prepare(
          'INSERT INTO stock_movements (id, productId, variantId, warehouseId, type, quantity, reference, notes, createdBy, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)'
        ).bind(crypto.randomUUID(), pi.productId, pi.variantId || null, purchase.warehouseId || null, 'IN', item.received, purchase.invoiceNumber, 'Purchase receive', c.var.userId, now));
      }
      const allReceived = await db.prepare(
        'SELECT COUNT(*) as total, SUM(received) as rec, SUM(quantity) as qty FROM purchase_items WHERE purchaseId = ?'
      ).bind(purchaseId).first() as any;
      if (allReceived && allReceived.rec >= allReceived.qty) {
        batch.push(db.prepare("UPDATE purchases SET status = 'RECEIVED', updatedAt = ? WHERE id = ?").bind(now, purchaseId));
      } else {
        batch.push(db.prepare("UPDATE purchases SET status = 'PARTIAL', updatedAt = ? WHERE id = ?").bind(now, purchaseId));
      }
      await db.batch(batch);
      return c.json({ message: 'Items received' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/purchases/return', async (c) => {
    try {
      const { purchaseId, items } = await c.req.json();
      if (!purchaseId || !items || !items.length) return c.json({ error: 'purchaseId and items required' }, 400);
      const db = c.env.DB;
      const purchase = await db.prepare('SELECT * FROM purchases WHERE id = ? AND shopId = ?').bind(purchaseId, c.var.shopId).first() as any;
      if (!purchase) return c.json({ error: 'Purchase not found' }, 404);
      const now = new Date().toISOString();
      const batch: any[] = [];
      for (const item of items) {
        const existingStock = await db.prepare(
          'SELECT * FROM stock WHERE productId = ? AND (variantId IS ? OR variantId = ?) AND warehouseId IS ?'
        ).bind(item.productId, item.variantId || null, item.variantId || null, purchase.warehouseId || null).first() as any;
        if (existingStock) {
          batch.push(db.prepare('UPDATE stock SET quantity = quantity - ?, updatedAt = ? WHERE id = ?').bind(item.quantity, now, existingStock.id));
        }
        if (item.purchaseItemId) {
          batch.push(db.prepare('UPDATE purchase_items SET received = MAX(0, received - ?) WHERE id = ?').bind(item.quantity, item.purchaseItemId));
        }
        batch.push(db.prepare(
          'INSERT INTO stock_movements (id, productId, variantId, warehouseId, type, quantity, reference, notes, createdBy, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)'
        ).bind(crypto.randomUUID(), item.productId, item.variantId || null, purchase.warehouseId || null, 'RETURN', item.quantity, purchase.invoiceNumber, item.reason || 'Purchase return', c.var.userId, now));
      }
      await db.batch(batch);
      return c.json({ message: 'Items returned' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/purchases/history', async (c) => {
    try {
      const db = c.env.DB;
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const shopId = c.var.shopId;
      const { results } = await db.prepare(
        'SELECT p.*, s.name as supplierName FROM purchases p LEFT JOIN suppliers s ON s.id = p.supplierId WHERE p.shopId = ? ORDER BY p.createdAt DESC LIMIT ? OFFSET ?'
      ).bind(shopId, limit, offset).all();
      const { results: countRes } = await db.prepare('SELECT COUNT(*) as total FROM purchases WHERE shopId = ?').bind(shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/purchases/pending', async (c) => {
    try {
      const db = c.env.DB;
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const shopId = c.var.shopId;
      const { results } = await db.prepare(
        `SELECT p.*, s.name as supplierName FROM purchases p LEFT JOIN suppliers s ON s.id = p.supplierId WHERE p.shopId = ? AND p.status IN ('PENDING','APPROVED') AND p.deletedAt IS NULL ORDER BY p.createdAt DESC LIMIT ? OFFSET ?`
      ).bind(shopId, limit, offset).all();
      const { results: countRes } = await db.prepare(
        `SELECT COUNT(*) as total FROM purchases WHERE shopId = ? AND status IN ('PENDING','APPROVED') AND deletedAt IS NULL`
      ).bind(shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/purchases/payment', async (c) => {
    try {
      const { purchaseId, amount, method, reference } = await c.req.json();
      if (!purchaseId || !amount || !method) return c.json({ error: 'purchaseId, amount, method required' }, 400);
      const db = c.env.DB;
      const purchase = await db.prepare('SELECT * FROM purchases WHERE id = ? AND shopId = ?').bind(purchaseId, c.var.shopId).first() as any;
      if (!purchase) return c.json({ error: 'Purchase not found' }, 404);
      const now = new Date().toISOString();
      const paymentId = crypto.randomUUID();
      const newPaid = (purchase.paidAmount || 0) + amount;
      const paymentStatus = newPaid >= purchase.total ? 'PAID' : 'PARTIAL';
      await db.batch([
        db.prepare(
          'INSERT INTO payments (id, shopId, entityType, entityId, method, amount, reference, notes, processedAt, createdBy, createdAt) VALUES (?,?,?,?,?,?,?,NULL,?,?,?)'
        ).bind(paymentId, c.var.shopId, 'PURCHASE', purchaseId, method, amount, reference || null, now, c.var.userId, now),
        db.prepare('UPDATE purchases SET paidAmount = ?, paymentStatus = ?, updatedAt = ? WHERE id = ?').bind(newPaid, paymentStatus, now, purchaseId)
      ]);
      return c.json({ data: { id: paymentId, amount, method, paymentStatus } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/purchases/invoice', async (c) => {
    try {
      const db = c.env.DB;
      const purchaseId = c.req.query('purchaseId') || '';
      if (!purchaseId) return c.json({ error: 'purchaseId query param required' }, 400);
      const purchase = await db.prepare(
        'SELECT p.*, s.name as supplierName, s.email as supplierEmail, s.phone as supplierPhone, sh.name as shopName, sh.address as shopAddress, sh.gstNumber as shopGst FROM purchases p LEFT JOIN suppliers s ON s.id = p.supplierId LEFT JOIN shops sh ON sh.id = p.shopId WHERE p.id = ? AND p.shopId = ?'
      ).bind(purchaseId, c.var.shopId).first() as any;
      if (!purchase) return c.json({ error: 'Not found' }, 404);
      const { results: items } = await db.prepare(
        'SELECT pi.*, pr.name as productName, pr.sku as productSku FROM purchase_items pi LEFT JOIN products pr ON pr.id = pi.productId WHERE pi.purchaseId = ?'
      ).bind(purchaseId).all();
      purchase.items = items;
      const { results: payments } = await db.prepare("SELECT * FROM payments WHERE entityType = 'PURCHASE' AND entityId = ?").bind(purchaseId).all();
      purchase.payments = payments;
      return c.json({ data: purchase });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== SALES MANAGEMENT ====================

  app.post('/api/sales', async (c) => {
    try {
      const { customerId, branchId, items, discount, paymentMethod, paymentAmount, notes } = await c.req.json();
      if (!items || !items.length) return c.json({ error: 'items required' }, 400);
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const invoiceNumber = genInvoice('INV');
      let subtotal = 0, taxAmount = 0;
      const batchItems: any[] = [];
      const stockUpdates: any[] = [];
      const imeiUpdates: any[] = [];
      for (const item of items) {
        const product = await db.prepare('SELECT id, sellingPrice, purchasePrice, taxRate FROM products WHERE id = ? AND shopId = ?').bind(item.productId, shopId).first() as any;
        if (!product) return c.json({ error: `Product ${item.productId} not found` }, 400);
        const qty = item.quantity || 1;
        const price = item.unitPrice || product.sellingPrice || 0;
        const rate = item.taxRate ?? product.taxRate ?? 0;
        const lineTotal = qty * price;
        subtotal += lineTotal;
        const lineTax = lineTotal * (rate / 100);
        taxAmount += lineTax;
        const itemId = crypto.randomUUID();
        batchItems.push(db.prepare(
          'INSERT INTO sale_items (id, saleId, productId, variantId, quantity, unitPrice, discount, taxRate, taxAmount, total, imeiIds) VALUES (?,?,?,?,?,?,0,?,?,?,?)'
        ).bind(itemId, id, item.productId, item.variantId || null, qty, price, rate, lineTax, lineTotal + lineTax, item.imeiIds ? JSON.stringify(item.imeiIds) : null));
        const stockRows = await db.prepare(
          'SELECT id, quantity, reserved FROM stock WHERE productId = ? AND (variantId IS ? OR variantId = ?) AND quantity > reserved ORDER BY createdAt ASC'
        ).bind(item.productId, item.variantId || null, item.variantId || null).all() as any;
        let toDeduct = qty;
        for (const row of (stockRows.results || [])) {
          if (toDeduct <= 0) break;
          const available = row.quantity - row.reserved;
          const deduct = Math.min(toDeduct, available);
          stockUpdates.push(db.prepare('UPDATE stock SET quantity = quantity - ?, updatedAt = ? WHERE id = ?').bind(deduct, now, row.id));
          toDeduct -= deduct;
        }
        if (toDeduct > 0) return c.json({ error: `Insufficient stock for product ${product.id}` }, 400);
        stockUpdates.push(db.prepare(
          'INSERT INTO stock_movements (id, productId, variantId, warehouseId, type, quantity, reference, notes, createdBy, createdAt) VALUES (?,?,?,NULL,?,?,?,?,?,?)'
        ).bind(crypto.randomUUID(), item.productId, item.variantId || null, 'OUT', qty, invoiceNumber, 'Sale', c.var.userId, now));
        if (item.imeiIds && Array.isArray(item.imeiIds)) {
          for (const imei of item.imeiIds) {
            imeiUpdates.push(db.prepare("UPDATE imei_records SET status = 'SOLD', saleId = ?, updatedAt = ? WHERE imei = ? AND productId = ? AND status = 'STOCK'").bind(id, now, imei, item.productId));
          }
        }
      }
      const totalDiscount = discount || 0;
      const total = subtotal + taxAmount - totalDiscount;
      const paidAmt = paymentAmount || 0;
      const dueAmt = Math.max(0, total - paidAmt);
      await db.batch([
        db.prepare(
          'INSERT INTO sales (id, shopId, customerId, branchId, invoiceNumber, date, subtotal, taxAmount, discount, total, paidAmount, dueAmount, paymentMethod, status, notes, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        ).bind(id, shopId, customerId || null, branchId || null, invoiceNumber, now, subtotal, taxAmount, totalDiscount, total, paidAmt, dueAmt, paymentMethod || null, 'COMPLETED', notes || null, now, now),
        ...batchItems,
        ...stockUpdates,
        ...imeiUpdates
      ]);
      if (paidAmt > 0) {
        const paymentId = crypto.randomUUID();
        await db.prepare(
          'INSERT INTO payments (id, shopId, entityType, entityId, saleId, method, amount, reference, notes, processedAt, createdBy, createdAt) VALUES (?,?,?,?,?,?,?,NULL,NULL,?,?,?)'
        ).bind(paymentId, shopId, 'SALE', id, id, paymentMethod || 'CASH', paidAmt, now, c.var.userId, now).run();
      }
      return c.json({ data: { id, invoiceNumber, total, paidAmount: paidAmt, dueAmount: dueAmt, status: 'COMPLETED' } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/sales', async (c) => {
    try {
      const db = c.env.DB;
      const search = c.req.query('search') || '';
      const status = c.req.query('status') || '';
      const fromDate = c.req.query('fromDate') || '';
      const toDate = c.req.query('toDate') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const shopId = c.var.shopId;
      let where = 'WHERE s.shopId = ?';
      const params: any[] = [shopId];
      if (search) { where += ' AND (s.invoiceNumber LIKE ? OR c.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
      if (status) { where += ' AND s.status = ?'; params.push(status); }
      if (fromDate) { where += ' AND s.date >= ?'; params.push(fromDate); }
      if (toDate) { where += ' AND s.date <= ?'; params.push(toDate); }
      const { results } = await db.prepare(
        `SELECT s.*, c.name as customerName, c.phone as customerPhone FROM sales s LEFT JOIN customers c ON c.id = s.customerId ${where} ORDER BY s.createdAt DESC LIMIT ? OFFSET ?`
      ).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM sales s LEFT JOIN customers c ON c.id = s.customerId ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/sales/:id', async (c) => {
    try {
      const db = c.env.DB;
      const sale = await db.prepare(
        'SELECT s.*, c.name as customerName, c.phone as customerPhone, c.email as customerEmail FROM sales s LEFT JOIN customers c ON c.id = s.customerId WHERE s.id = ? AND s.shopId = ?'
      ).bind(c.req.param('id'), c.var.shopId).first() as any;
      if (!sale) return c.json({ error: 'Not found' }, 404);
      const { results: items } = await db.prepare(
        'SELECT si.*, pr.name as productName, pr.sku as productSku FROM sale_items si LEFT JOIN products pr ON pr.id = si.productId WHERE si.saleId = ?'
      ).bind(sale.id).all();
      sale.items = items;
      const { results: payments } = await db.prepare("SELECT * FROM payments WHERE entityType = 'SALE' AND entityId = ?").bind(sale.id).all();
      sale.payments = payments;
      return c.json({ data: sale });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/sales/:id', async (c) => {
    try {
      const body = await c.req.json();
      const allowed = ['notes', 'discount', 'customerId'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) { if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); } }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      if (body.discount !== undefined) {
        const existing = await c.env.DB.prepare('SELECT subtotal, taxAmount FROM sales WHERE id = ? AND shopId = ?').bind(c.req.param('id'), c.var.shopId).first() as any;
        if (existing) {
          const newTotal = existing.subtotal + existing.taxAmount - body.discount;
          sets.push('total = ?'); vals.push(newTotal);
        }
      }
      vals.push(new Date().toISOString(), c.req.param('id'), c.var.shopId);
      await c.env.DB.prepare(`UPDATE sales SET ${sets.join(', ')}, updatedAt = ? WHERE id = ? AND shopId = ?`).bind(...vals).run();
      const updated = await c.env.DB.prepare('SELECT * FROM sales WHERE id = ?').bind(c.req.param('id')).first();
      return c.json({ data: updated });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/sales/:id', async (c) => {
    try {
      const now = new Date().toISOString();
      const db = c.env.DB;
      const sale = await db.prepare('SELECT * FROM sales WHERE id = ? AND shopId = ?').bind(c.req.param('id'), c.var.shopId).first() as any;
      if (!sale) return c.json({ error: 'Not found' }, 404);
      const { results: items } = await db.prepare('SELECT * FROM sale_items WHERE saleId = ?').bind(sale.id).all() as any;
      const batch: any[] = [
        db.prepare("UPDATE sales SET status = 'CANCELLED', updatedAt = ? WHERE id = ?").bind(now, sale.id)
      ];
      for (const item of (items.results || [])) {
        const existingStock = await db.prepare(
          'SELECT id FROM stock WHERE productId = ? AND (variantId IS ? OR variantId = ?) ORDER BY createdAt ASC LIMIT 1'
        ).bind(item.productId, item.variantId || null, item.variantId || null).first() as any;
        if (existingStock) {
          batch.push(db.prepare('UPDATE stock SET quantity = quantity + ?, updatedAt = ? WHERE id = ?').bind(item.quantity, now, existingStock.id));
        }
        batch.push(db.prepare(
          'INSERT INTO stock_movements (id, productId, variantId, warehouseId, type, quantity, reference, notes, createdBy, createdAt) VALUES (?,?,?,NULL,?,?,?,?,?,?)'
        ).bind(crypto.randomUUID(), item.productId, item.variantId || null, 'RETURN', item.quantity, sale.invoiceNumber, 'Sale cancelled - restock', c.var.userId, now));
        if (item.imeiIds) {
          const imeis: string[] = JSON.parse(item.imeiIds);
          for (const imei of imeis) {
            batch.push(db.prepare("UPDATE imei_records SET status = 'STOCK', saleId = NULL, updatedAt = ? WHERE imei = ? AND productId = ?").bind(now, imei, item.productId));
          }
        }
      }
      await db.batch(batch);
      return c.json({ message: 'Sale cancelled' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/sales/cart', async (c) => {
    try {
      const { items } = await c.req.json();
      if (!items || !items.length) return c.json({ error: 'items required' }, 400);
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const cartItems: any[] = [];
      let subtotal = 0, taxAmount = 0;
      for (const item of items) {
        const product = await db.prepare('SELECT id, name, sku, sellingPrice, taxRate FROM products WHERE id = ? AND shopId = ?').bind(item.productId, shopId).first() as any;
        if (!product) return c.json({ error: `Product ${item.productId} not found` }, 400);
        const qty = item.quantity || 1;
        const price = product.sellingPrice || 0;
        const rate = product.taxRate || 0;
        const lineTotal = qty * price;
        subtotal += lineTotal;
        taxAmount += lineTotal * (rate / 100);
        cartItems.push({ productId: item.productId, variantId: item.variantId || null, name: product.name, sku: product.sku, quantity: qty, unitPrice: price, taxRate: rate, total: lineTotal + (lineTotal * rate / 100) });
      }
      const total = subtotal + taxAmount;
      const token = crypto.randomUUID().slice(0, 8);
      return c.json({ data: { cart: { items: cartItems, subtotal, taxAmount, total }, token } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/sales/cart', async (c) => {
    try {
      const { items } = await c.req.json();
      if (!items || !items.length) return c.json({ error: 'items required' }, 400);
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const cartItems: any[] = [];
      let subtotal = 0, taxAmount = 0;
      for (const item of items) {
        const product = await db.prepare('SELECT id, name, sku, sellingPrice, taxRate FROM products WHERE id = ? AND shopId = ?').bind(item.productId, shopId).first() as any;
        if (!product) return c.json({ error: `Product ${item.productId} not found` }, 400);
        const qty = item.quantity || 1;
        const price = product.sellingPrice || 0;
        const rate = product.taxRate || 0;
        const lineTotal = qty * price;
        subtotal += lineTotal;
        taxAmount += lineTotal * (rate / 100);
        cartItems.push({ productId: item.productId, variantId: item.variantId || null, name: product.name, sku: product.sku, quantity: qty, unitPrice: price, taxRate: rate, total: lineTotal + (lineTotal * rate / 100) });
      }
      const total = subtotal + taxAmount;
      return c.json({ data: { cart: { items: cartItems, subtotal, taxAmount, total } } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/sales/cart', async (c) => {
    try {
      return c.json({ data: { cart: { items: [], subtotal: 0, taxAmount: 0, total: 0 } } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/sales/payment', async (c) => {
    try {
      const { saleId, amount, method, reference } = await c.req.json();
      if (!saleId || !amount || !method) return c.json({ error: 'saleId, amount, method required' }, 400);
      const db = c.env.DB;
      const sale = await db.prepare('SELECT * FROM sales WHERE id = ? AND shopId = ?').bind(saleId, c.var.shopId).first() as any;
      if (!sale) return c.json({ error: 'Sale not found' }, 404);
      const now = new Date().toISOString();
      const paymentId = crypto.randomUUID();
      const newPaid = (sale.paidAmount || 0) + amount;
      const newDue = Math.max(0, sale.total - newPaid);
      await db.batch([
        db.prepare(
          'INSERT INTO payments (id, shopId, entityType, entityId, saleId, method, amount, reference, notes, processedAt, createdBy, createdAt) VALUES (?,?,?,?,?,?,?,?,NULL,?,?,?)'
        ).bind(paymentId, c.var.shopId, 'SALE', saleId, saleId, method, amount, reference || null, now, c.var.userId, now),
        db.prepare('UPDATE sales SET paidAmount = ?, dueAmount = ?, updatedAt = ? WHERE id = ?').bind(newPaid, newDue, now, saleId)
      ]);
      return c.json({ data: { id: paymentId, amount, method, paidAmount: newPaid, dueAmount: newDue } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/sales/refund', async (c) => {
    try {
      const { saleId, reason } = await c.req.json();
      if (!saleId || !reason) return c.json({ error: 'saleId and reason required' }, 400);
      const db = c.env.DB;
      const sale = await db.prepare('SELECT * FROM sales WHERE id = ? AND shopId = ?').bind(saleId, c.var.shopId).first() as any;
      if (!sale) return c.json({ error: 'Sale not found' }, 404);
      const now = new Date().toISOString();
      const refundAmount = sale.paidAmount;
      const paymentId = crypto.randomUUID();
      const { results: items } = await db.prepare('SELECT * FROM sale_items WHERE saleId = ?').bind(saleId).all() as any;
      const batch: any[] = [
        db.prepare(
          'INSERT INTO payments (id, shopId, entityType, entityId, saleId, method, amount, reference, notes, processedAt, createdBy, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
        ).bind(paymentId, c.var.shopId, 'SALE', saleId, saleId, sale.paymentMethod || 'CASH', -refundAmount, null, `Refund: ${reason}`, now, c.var.userId, now),
        db.prepare("UPDATE sales SET status = 'REFUNDED', paidAmount = 0, dueAmount = 0, updatedAt = ? WHERE id = ?").bind(now, saleId)
      ];
      for (const item of (items.results || [])) {
        const existingStock = await db.prepare(
          'SELECT id FROM stock WHERE productId = ? AND (variantId IS ? OR variantId = ?) ORDER BY createdAt ASC LIMIT 1'
        ).bind(item.productId, item.variantId || null, item.variantId || null).first() as any;
        if (existingStock) {
          batch.push(db.prepare('UPDATE stock SET quantity = quantity + ?, updatedAt = ? WHERE id = ?').bind(item.quantity, now, existingStock.id));
        }
        batch.push(db.prepare(
          'INSERT INTO stock_movements (id, productId, variantId, warehouseId, type, quantity, reference, notes, createdBy, createdAt) VALUES (?,?,?,NULL,?,?,?,?,?,?)'
        ).bind(crypto.randomUUID(), item.productId, item.variantId || null, 'RETURN', item.quantity, sale.invoiceNumber, `Refund: ${reason}`, c.var.userId, now));
        if (item.imeiIds) {
          const imeis: string[] = JSON.parse(item.imeiIds);
          for (const imei of imeis) {
            batch.push(db.prepare("UPDATE imei_records SET status = 'STOCK', saleId = NULL, updatedAt = ? WHERE imei = ? AND productId = ?").bind(now, imei, item.productId));
          }
        }
      }
      await db.batch(batch);
      return c.json({ message: 'Sale refunded', refundAmount });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/sales/return', async (c) => {
    try {
      const { saleId, items } = await c.req.json();
      if (!saleId || !items || !items.length) return c.json({ error: 'saleId and items required' }, 400);
      const db = c.env.DB;
      const sale = await db.prepare('SELECT * FROM sales WHERE id = ? AND shopId = ?').bind(saleId, c.var.shopId).first() as any;
      if (!sale) return c.json({ error: 'Sale not found' }, 404);
      const now = new Date().toISOString();
      const batch: any[] = [];
      for (const item of items) {
        const existingStock = await db.prepare(
          'SELECT id FROM stock WHERE productId = ? AND (variantId IS ? OR variantId = ?) ORDER BY createdAt ASC LIMIT 1'
        ).bind(item.productId, item.variantId || null, item.variantId || null).first() as any;
        if (existingStock) {
          batch.push(db.prepare('UPDATE stock SET quantity = quantity + ?, updatedAt = ? WHERE id = ?').bind(item.quantity, now, existingStock.id));
        } else {
          batch.push(db.prepare(
            'INSERT INTO stock (id, productId, variantId, warehouseId, quantity, reserved, damaged, batch, expiryDate, createdAt, updatedAt) VALUES (?,?,?,NULL,?,0,0,NULL,NULL,?,?)'
          ).bind(crypto.randomUUID(), item.productId, item.variantId || null, item.quantity, now, now));
        }
        batch.push(db.prepare(
          'INSERT INTO stock_movements (id, productId, variantId, warehouseId, type, quantity, reference, notes, createdBy, createdAt) VALUES (?,?,?,NULL,?,?,?,?,?,?)'
        ).bind(crypto.randomUUID(), item.productId, item.variantId || null, 'RETURN', item.quantity, sale.invoiceNumber, item.reason || 'Sale return', c.var.userId, now));
        batch.push(db.prepare(
          'UPDATE sale_items SET quantity = quantity - ? WHERE saleId = ? AND productId = ? AND (variantId IS ? OR variantId = ?)'
        ).bind(item.quantity, saleId, item.productId, item.variantId || null, item.variantId || null));
        if (item.imeiIds && Array.isArray(item.imeiIds)) {
          for (const imei of item.imeiIds) {
            batch.push(db.prepare("UPDATE imei_records SET status = 'STOCK', saleId = NULL, updatedAt = ? WHERE imei = ? AND productId = ?").bind(now, imei, item.productId));
          }
        }
      }
      await db.batch(batch);
      return c.json({ message: 'Items returned' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/sales/hold', async (c) => {
    try {
      const { saleId } = await c.req.json();
      if (!saleId) return c.json({ error: 'saleId required' }, 400);
      const now = new Date().toISOString();
      await c.env.DB.prepare("UPDATE sales SET status = 'ON_HOLD', updatedAt = ? WHERE id = ? AND shopId = ?").bind(now, saleId, c.var.shopId).run();
      return c.json({ message: 'Sale on hold' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/sales/resume', async (c) => {
    try {
      const { saleId } = await c.req.json();
      if (!saleId) return c.json({ error: 'saleId required' }, 400);
      const now = new Date().toISOString();
      await c.env.DB.prepare("UPDATE sales SET status = 'PENDING', updatedAt = ? WHERE id = ? AND shopId = ?").bind(now, saleId, c.var.shopId).run();
      return c.json({ message: 'Sale resumed' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/sales/cancel', async (c) => {
    try {
      const { saleId, reason } = await c.req.json();
      if (!saleId) return c.json({ error: 'saleId required' }, 400);
      const db = c.env.DB;
      const sale = await db.prepare('SELECT * FROM sales WHERE id = ? AND shopId = ?').bind(saleId, c.var.shopId).first() as any;
      if (!sale) return c.json({ error: 'Sale not found' }, 404);
      const now = new Date().toISOString();
      const { results: items } = await db.prepare('SELECT * FROM sale_items WHERE saleId = ?').bind(saleId).all() as any;
      const batch: any[] = [
        db.prepare("UPDATE sales SET status = 'CANCELLED', notes = ?, updatedAt = ? WHERE id = ?").bind(reason || 'Cancelled', now, saleId)
      ];
      for (const item of (items.results || [])) {
        const existingStock = await db.prepare(
          'SELECT id FROM stock WHERE productId = ? AND (variantId IS ? OR variantId = ?) ORDER BY createdAt ASC LIMIT 1'
        ).bind(item.productId, item.variantId || null, item.variantId || null).first() as any;
        if (existingStock) {
          batch.push(db.prepare('UPDATE stock SET quantity = quantity + ?, updatedAt = ? WHERE id = ?').bind(item.quantity, now, existingStock.id));
        }
        batch.push(db.prepare(
          'INSERT INTO stock_movements (id, productId, variantId, warehouseId, type, quantity, reference, notes, createdBy, createdAt) VALUES (?,?,?,NULL,?,?,?,?,?,?)'
        ).bind(crypto.randomUUID(), item.productId, item.variantId || null, 'RETURN', item.quantity, sale.invoiceNumber, reason || 'Sale cancelled', c.var.userId, now));
        if (item.imeiIds) {
          const imeis: string[] = JSON.parse(item.imeiIds);
          for (const imei of imeis) {
            batch.push(db.prepare("UPDATE imei_records SET status = 'STOCK', saleId = NULL, updatedAt = ? WHERE imei = ? AND productId = ?").bind(now, imei, item.productId));
          }
        }
      }
      await db.batch(batch);
      return c.json({ message: 'Sale cancelled' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/sales/history', async (c) => {
    try {
      const db = c.env.DB;
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const shopId = c.var.shopId;
      const search = c.req.query('search') || '';
      const status = c.req.query('status') || '';
      const fromDate = c.req.query('fromDate') || '';
      const toDate = c.req.query('toDate') || '';
      let where = 'WHERE s.shopId = ?';
      const params: any[] = [shopId];
      if (search) { where += ' AND (s.invoiceNumber LIKE ? OR c.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
      if (status) { where += ' AND s.status = ?'; params.push(status); }
      if (fromDate) { where += ' AND s.date >= ?'; params.push(fromDate); }
      if (toDate) { where += ' AND s.date <= ?'; params.push(toDate); }
      const { results } = await db.prepare(
        `SELECT s.*, c.name as customerName FROM sales s LEFT JOIN customers c ON c.id = s.customerId ${where} ORDER BY s.createdAt DESC LIMIT ? OFFSET ?`
      ).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM sales s LEFT JOIN customers c ON c.id = s.customerId ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/sales/invoice', async (c) => {
    try {
      const db = c.env.DB;
      const saleId = c.req.query('saleId') || '';
      if (!saleId) return c.json({ error: 'saleId query param required' }, 400);
      const sale = await db.prepare(
        'SELECT s.*, c.name as customerName, c.email as customerEmail, c.phone as customerPhone, c.address as customerAddress, sh.name as shopName, sh.address as shopAddress, sh.phone as shopPhone, sh.email as shopEmail, sh.gstNumber as shopGst FROM sales s LEFT JOIN customers c ON c.id = s.customerId LEFT JOIN shops sh ON sh.id = s.shopId WHERE s.id = ? AND s.shopId = ?'
      ).bind(saleId, c.var.shopId).first() as any;
      if (!sale) return c.json({ error: 'Not found' }, 404);
      const { results: items } = await db.prepare(
        'SELECT si.*, pr.name as productName, pr.sku as productSku, pr.hsnCode FROM sale_items si LEFT JOIN products pr ON pr.id = si.productId WHERE si.saleId = ?'
      ).bind(saleId).all();
      sale.items = items;
      const { results: payments } = await db.prepare("SELECT * FROM payments WHERE entityType = 'SALE' AND entityId = ?").bind(saleId).all();
      sale.payments = payments;
      return c.json({ data: sale });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/sales/email', async (c) => {
    try {
      const { saleId } = await c.req.json();
      if (!saleId) return c.json({ error: 'saleId required' }, 400);
      return c.json({ message: 'Invoice sent' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/sales/print', async (c) => {
    try {
      const { saleId } = await c.req.json();
      if (!saleId) return c.json({ error: 'saleId required' }, 400);
      return c.json({ message: 'Print job queued' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== POS BILLING ====================

  app.post('/api/pos/start', async (c) => {
    try {
      const { openingBalance, branchId } = await c.req.json();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const cartData = { cart: [], discount: 0, taxRate: 0, payments: [] };
      posCarts.set(id, cartData);
      await c.env.DB.prepare(
        'INSERT INTO pos_sessions (id, shopId, branchId, cashierId, openingBalance, closingBalance, totalSales, totalReturns, status, startedAt, createdAt, updatedAt) VALUES (?,?,?,?,?,0,0,0,?,?,?,?)'
      ).bind(id, c.var.shopId, branchId || null, c.var.userId, openingBalance || 0, 'OPEN', now, now, now).run();
      return c.json({ data: { id, status: 'OPEN', openingBalance: openingBalance || 0 } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/pos/add-item', async (c) => {
    try {
      const { sessionId, productId, variantId, quantity } = await c.req.json();
      if (!sessionId || !productId) return c.json({ error: 'sessionId and productId required' }, 400);
      const db = c.env.DB;
      const session = await db.prepare('SELECT * FROM pos_sessions WHERE id = ? AND shopId = ? AND status = ?').bind(sessionId, c.var.shopId, 'OPEN').first() as any;
      if (!session) return c.json({ error: 'Session not found or not open' }, 404);
      const product = await db.prepare('SELECT id, name, sku, sellingPrice, taxRate FROM products WHERE id = ? AND shopId = ?').bind(productId, c.var.shopId).first() as any;
      if (!product) return c.json({ error: 'Product not found' }, 404);
      const qty = quantity || 1;
      if (!posCarts.has(sessionId)) posCarts.set(sessionId, { cart: [], discount: 0, taxRate: 0, payments: [] });
      const cart = posCarts.get(sessionId);
      if (!cart.cart) cart.cart = [];
      const existingIdx = cart.cart.findIndex((i: any) => i.productId === productId && i.variantId === (variantId || null));
      if (existingIdx >= 0) {
        cart.cart[existingIdx].quantity += qty;
      } else {
        cart.cart.push({ productId, variantId: variantId || null, name: product.name, sku: product.sku, quantity: qty, unitPrice: product.sellingPrice || 0, taxRate: product.taxRate || 0 });
      }
      return c.json({ data: { cart: cart.cart } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/pos/remove-item', async (c) => {
    try {
      const { sessionId, itemIndex } = await c.req.json();
      if (!sessionId || itemIndex === undefined) return c.json({ error: 'sessionId and itemIndex required' }, 400);
      const db = c.env.DB;
      const session = await db.prepare('SELECT * FROM pos_sessions WHERE id = ? AND shopId = ? AND status = ?').bind(sessionId, c.var.shopId, 'OPEN').first() as any;
      if (!session) return c.json({ error: 'Session not found or not open' }, 404);
      if (!posCarts.has(sessionId)) posCarts.set(sessionId, { cart: [], discount: 0, taxRate: 0, payments: [] });
      const cart = posCarts.get(sessionId);
      if (!cart.cart || !cart.cart[itemIndex]) return c.json({ error: 'Item not found' }, 404);
      cart.cart.splice(itemIndex, 1);
      return c.json({ data: { cart: cart.cart } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/pos/update-quantity', async (c) => {
    try {
      const { sessionId, itemIndex, quantity } = await c.req.json();
      if (!sessionId || itemIndex === undefined || !quantity) return c.json({ error: 'sessionId, itemIndex, quantity required' }, 400);
      const db = c.env.DB;
      const session = await db.prepare('SELECT * FROM pos_sessions WHERE id = ? AND shopId = ? AND status = ?').bind(sessionId, c.var.shopId, 'OPEN').first() as any;
      if (!session) return c.json({ error: 'Session not found or not open' }, 404);
      if (!posCarts.has(sessionId)) posCarts.set(sessionId, { cart: [], discount: 0, taxRate: 0, payments: [] });
      const cart = posCarts.get(sessionId);
      if (!cart.cart || !cart.cart[itemIndex]) return c.json({ error: 'Item not found' }, 404);
      cart.cart[itemIndex].quantity = quantity;
      return c.json({ data: { cart: cart.cart } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/pos/discount', async (c) => {
    try {
      const { sessionId, discount, type } = await c.req.json();
      if (!sessionId || discount === undefined) return c.json({ error: 'sessionId and discount required' }, 400);
      const db = c.env.DB;
      const session = await db.prepare('SELECT * FROM pos_sessions WHERE id = ? AND shopId = ? AND status = ?').bind(sessionId, c.var.shopId, 'OPEN').first() as any;
      if (!session) return c.json({ error: 'Session not found or not open' }, 404);
      if (!posCarts.has(sessionId)) posCarts.set(sessionId, { cart: [], discount: 0, taxRate: 0, payments: [] });
      const cart = posCarts.get(sessionId);
      cart.discount = discount;
      cart.discountType = type || 'FIXED';
      return c.json({ data: { discount, type: cart.discountType } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/pos/tax', async (c) => {
    try {
      const { sessionId, taxRate } = await c.req.json();
      if (!sessionId) return c.json({ error: 'sessionId required' }, 400);
      const db = c.env.DB;
      const session = await db.prepare('SELECT * FROM pos_sessions WHERE id = ? AND shopId = ? AND status = ?').bind(sessionId, c.var.shopId, 'OPEN').first() as any;
      if (!session) return c.json({ error: 'Session not found or not open' }, 404);
      if (!posCarts.has(sessionId)) posCarts.set(sessionId, { cart: [], discount: 0, taxRate: 0, payments: [] });
      const cart = posCarts.get(sessionId);
      cart.taxRate = taxRate ?? 0;
      return c.json({ data: { taxRate: cart.taxRate } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/pos/payment', async (c) => {
    try {
      const { sessionId, amount, method } = await c.req.json();
      if (!sessionId || !amount || !method) return c.json({ error: 'sessionId, amount, method required' }, 400);
      const db = c.env.DB;
      const session = await db.prepare('SELECT * FROM pos_sessions WHERE id = ? AND shopId = ? AND status = ?').bind(sessionId, c.var.shopId, 'OPEN').first() as any;
      if (!session) return c.json({ error: 'Session not found or not open' }, 404);
      if (!posCarts.has(sessionId)) posCarts.set(sessionId, { cart: [], discount: 0, taxRate: 0, payments: [] });
      const cart = posCarts.get(sessionId);
      if (!cart.payments) cart.payments = [];
      cart.payments.push({ amount, method, time: new Date().toISOString() });
      return c.json({ data: { payments: cart.payments } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/pos/complete', async (c) => {
    try {
      const { sessionId } = await c.req.json();
      if (!sessionId) return c.json({ error: 'sessionId required' }, 400);
      const db = c.env.DB;
      const session = await db.prepare('SELECT * FROM pos_sessions WHERE id = ? AND shopId = ? AND status = ?').bind(sessionId, c.var.shopId, 'OPEN').first() as any;
      if (!session) return c.json({ error: 'Session not found or not open' }, 404);
      const cart = posCarts.get(sessionId) || { cart: [], discount: 0, taxRate: 0, payments: [] };
      if (!cart.cart || !cart.cart.length) return c.json({ error: 'Cart is empty' }, 400);
      const now = new Date().toISOString();
      const invoiceNumber = genInvoice('POS');
      let subtotal = 0, taxAmount = 0;
      const saleItems: any[] = [];
      const stockUpdates: any[] = [];
      for (const item of cart.cart) {
        const qty = item.quantity || 1;
        const price = item.unitPrice || 0;
        const rate = item.taxRate || 0;
        const lineTotal = qty * price;
        subtotal += lineTotal;
        taxAmount += lineTotal * (rate / 100);
        const itemId = crypto.randomUUID();
        saleItems.push(db.prepare(
          'INSERT INTO sale_items (id, saleId, productId, variantId, quantity, unitPrice, discount, taxRate, taxAmount, total, imeiIds) VALUES (?,?,?,?,?,?,0,?,?,?,NULL)'
        ).bind(itemId, sessionId, item.productId, item.variantId || null, qty, price, rate, lineTotal * (rate / 100), lineTotal + (lineTotal * rate / 100)));
        const stockRows = await db.prepare(
          'SELECT id, quantity, reserved FROM stock WHERE productId = ? AND (variantId IS ? OR variantId = ?) AND quantity > reserved ORDER BY createdAt ASC'
        ).bind(item.productId, item.variantId || null, item.variantId || null).all() as any;
        let toDeduct = qty;
        for (const row of (stockRows.results || [])) {
          if (toDeduct <= 0) break;
          const available = row.quantity - row.reserved;
          const deduct = Math.min(toDeduct, available);
          stockUpdates.push(db.prepare('UPDATE stock SET quantity = quantity - ?, updatedAt = ? WHERE id = ?').bind(deduct, now, row.id));
          toDeduct -= deduct;
        }
        stockUpdates.push(db.prepare(
          'INSERT INTO stock_movements (id, productId, variantId, warehouseId, type, quantity, reference, notes, createdBy, createdAt) VALUES (?,?,?,NULL,?,?,?,?,?,?)'
        ).bind(crypto.randomUUID(), item.productId, item.variantId || null, 'OUT', qty, invoiceNumber, 'POS sale', c.var.userId, now));
      }
      const totalDiscount = cart.discount || 0;
      const total = subtotal + taxAmount - totalDiscount;
      const totalPayments = (cart.payments || []).reduce((s: number, p: any) => s + p.amount, 0);
      await db.batch([
        db.prepare(
          'INSERT INTO sales (id, shopId, customerId, branchId, invoiceNumber, date, subtotal, taxAmount, discount, total, paidAmount, dueAmount, paymentMethod, status, notes, createdAt, updatedAt) VALUES (?,?,NULL,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        ).bind(sessionId, c.var.shopId, session.branchId, invoiceNumber, now, subtotal, taxAmount, totalDiscount, total, Math.min(totalPayments, total), Math.max(0, total - totalPayments), cart.payments?.[0]?.method || 'CASH', 'COMPLETED', null, now, now),
        ...saleItems,
        ...stockUpdates
      ]);
      for (const payment of (cart.payments || [])) {
        await db.prepare(
          'INSERT INTO payments (id, shopId, entityType, entityId, saleId, method, amount, reference, notes, processedAt, createdBy, createdAt) VALUES (?,?,?,?,?,?,?,NULL,NULL,?,?,?)'
        ).bind(crypto.randomUUID(), c.var.shopId, 'SALE', sessionId, sessionId, payment.method, payment.amount, now, c.var.userId, now).run();
      }
      posCarts.delete(sessionId);
      await db.prepare('UPDATE pos_sessions SET totalSales = totalSales + ?, updatedAt = ? WHERE id = ?').bind(total, now, sessionId);
      return c.json({ data: { id: sessionId, invoiceNumber, total, status: 'COMPLETED' } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/pos/cancel', async (c) => {
    try {
      const { sessionId } = await c.req.json();
      if (!sessionId) return c.json({ error: 'sessionId required' }, 400);
      const db = c.env.DB;
      const session = await db.prepare('SELECT * FROM pos_sessions WHERE id = ? AND shopId = ?').bind(sessionId, c.var.shopId).first() as any;
      if (!session) return c.json({ error: 'Session not found' }, 404);
      const now = new Date().toISOString();
      posCarts.delete(sessionId);
      await db.prepare("UPDATE pos_sessions SET status = 'CANCELLED', endedAt = ?, updatedAt = ? WHERE id = ?").bind(now, now, sessionId);
      return c.json({ message: 'Session cancelled' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/pos/history', async (c) => {
    try {
      const db = c.env.DB;
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const shopId = c.var.shopId;
      const { results } = await db.prepare(
        'SELECT ps.*, u.name as cashierName FROM pos_sessions ps LEFT JOIN users u ON u.id = ps.cashierId WHERE ps.shopId = ? ORDER BY ps.startedAt DESC LIMIT ? OFFSET ?'
      ).bind(shopId, limit, offset).all();
      const { results: countRes } = await db.prepare('SELECT COUNT(*) as total FROM pos_sessions WHERE shopId = ?').bind(shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== PAYMENTS ====================

  app.post('/api/payments', async (c) => {
    try {
      const { entityType, entityId, method, amount, reference, notes } = await c.req.json();
      if (!entityType || !entityId || !method || !amount) return c.json({ error: 'entityType, entityId, method, amount required' }, 400);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await c.env.DB.prepare(
        'INSERT INTO payments (id, shopId, entityType, entityId, saleId, method, amount, reference, notes, processedAt, createdBy, createdAt) VALUES (?,?,?,?,NULL,?,?,?,?,?,?,?)'
      ).bind(id, c.var.shopId, entityType, entityId, method, amount, reference || null, notes || null, now, c.var.userId, now).run();
      return c.json({ data: { id, entityType, entityId, method, amount } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/payments', async (c) => {
    try {
      const db = c.env.DB;
      const entityType = c.req.query('entityType') || '';
      const entityId = c.req.query('entityId') || '';
      const method = c.req.query('method') || '';
      const fromDate = c.req.query('fromDate') || '';
      const toDate = c.req.query('toDate') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const shopId = c.var.shopId;
      let where = 'WHERE p.shopId = ?';
      const params: any[] = [shopId];
      if (entityType) { where += ' AND p.entityType = ?'; params.push(entityType); }
      if (entityId) { where += ' AND p.entityId = ?'; params.push(entityId); }
      if (method) { where += ' AND p.method = ?'; params.push(method); }
      if (fromDate) { where += ' AND p.processedAt >= ?'; params.push(fromDate); }
      if (toDate) { where += ' AND p.processedAt <= ?'; params.push(toDate); }
      const { results } = await db.prepare(`SELECT p.*, u.name as createdByName FROM payments p LEFT JOIN users u ON u.id = p.createdBy ${where} ORDER BY p.createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM payments p ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/payments/:id', async (c) => {
    try {
      const payment = await c.env.DB.prepare(
        'SELECT p.*, u.name as createdByName FROM payments p LEFT JOIN users u ON u.id = p.createdBy WHERE p.id = ? AND p.shopId = ?'
      ).bind(c.req.param('id'), c.var.shopId).first();
      if (!payment) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: payment });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/payments/refund', async (c) => {
    try {
      const { paymentId, amount, reason } = await c.req.json();
      if (!paymentId || !amount) return c.json({ error: 'paymentId and amount required' }, 400);
      const db = c.env.DB;
      const original = await db.prepare('SELECT * FROM payments WHERE id = ? AND shopId = ?').bind(paymentId, c.var.shopId).first() as any;
      if (!original) return c.json({ error: 'Payment not found' }, 404);
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      await db.prepare(
        'INSERT INTO payments (id, shopId, entityType, entityId, saleId, method, amount, reference, notes, processedAt, createdBy, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
      ).bind(id, c.var.shopId, original.entityType, original.entityId, original.saleId, original.method, -amount, `Refund of ${paymentId}`, reason || null, now, c.var.userId, now).run();
      return c.json({ data: { id, amount: -amount, reason: reason || null } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/payments/history', async (c) => {
    try {
      const db = c.env.DB;
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const shopId = c.var.shopId;
      const { results } = await db.prepare(
        'SELECT p.*, u.name as createdByName FROM payments p LEFT JOIN users u ON u.id = p.createdBy WHERE p.shopId = ? ORDER BY p.createdAt DESC LIMIT ? OFFSET ?'
      ).bind(shopId, limit, offset).all();
      const { results: countRes } = await db.prepare('SELECT COUNT(*) as total FROM payments WHERE shopId = ?').bind(shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/payments/methods', async (c) => {
    try {
      return c.json({ data: ['CASH', 'UPI', 'CARD', 'CREDIT', 'TRANSFER'] });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });
}
