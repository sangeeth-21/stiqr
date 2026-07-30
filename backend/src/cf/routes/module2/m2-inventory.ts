export function inventoryRoutes(app: any) {
  app.get('/api/inventory/history', async (c) => {
    try {
      const db = c.env.DB;
      const type = c.req.query('type') || '';
      const fromDate = c.req.query('fromDate') || '';
      const toDate = c.req.query('toDate') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      let query = `SELECT sm.*, p.name as productName, p.sku, w.name as warehouseName
        FROM stock_movements sm JOIN products p ON sm.productId = p.id LEFT JOIN warehouses w ON sm.warehouseId = w.id WHERE p.shopId = ?`;
      const params: any[] = [c.var.shopId];
      if (type) { query += ' AND sm.type = ?'; params.push(type); }
      if (fromDate) { query += ' AND sm.createdAt >= ?'; params.push(fromDate); }
      if (toDate) { query += ' AND sm.createdAt <= ?'; params.push(toDate); }
      query += ' ORDER BY sm.createdAt DESC LIMIT ? OFFSET ?'; params.push(limit, offset);
      const { results } = await db.prepare(query).bind(...params).all();
      let countQuery = 'SELECT COUNT(*) as total FROM stock_movements sm JOIN products p ON sm.productId = p.id WHERE p.shopId = ?';
      const countParams: any[] = [c.var.shopId];
      if (type) { countQuery += ' AND sm.type = ?'; countParams.push(type); }
      if (fromDate) { countQuery += ' AND sm.createdAt >= ?'; countParams.push(fromDate); }
      if (toDate) { countQuery += ' AND sm.createdAt <= ?'; countParams.push(toDate); }
      const { results: countRes } = await db.prepare(countQuery).bind(...countParams).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/inventory/low-stock', async (c) => {
    try {
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await c.env.DB.prepare(`SELECT s.*, p.name as productName, p.sku, p.purchasePrice, p.sellingPrice, p.minStock, w.name as warehouseName
        FROM stock s JOIN products p ON s.productId = p.id LEFT JOIN warehouses w ON s.warehouseId = w.id
        WHERE p.shopId = ? AND (s.quantity < p.minStock OR s.quantity = 0) ORDER BY (p.minStock - s.quantity) DESC LIMIT ? OFFSET ?`).bind(c.var.shopId, limit, offset).all();
      const { results: countRes } = await c.env.DB.prepare('SELECT COUNT(*) as total FROM stock s JOIN products p ON s.productId = p.id WHERE p.shopId = ? AND (s.quantity < p.minStock OR s.quantity = 0)').bind(c.var.shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/inventory/out-of-stock', async (c) => {
    try {
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await c.env.DB.prepare(`SELECT s.*, p.name as productName, p.sku, p.purchasePrice, p.sellingPrice, p.minStock, w.name as warehouseName
        FROM stock s JOIN products p ON s.productId = p.id LEFT JOIN warehouses w ON s.warehouseId = w.id
        WHERE p.shopId = ? AND s.quantity = 0 ORDER BY p.name ASC LIMIT ? OFFSET ?`).bind(c.var.shopId, limit, offset).all();
      const { results: countRes } = await c.env.DB.prepare('SELECT COUNT(*) as total FROM stock s JOIN products p ON s.productId = p.id WHERE p.shopId = ? AND s.quantity = 0').bind(c.var.shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/inventory/valuation', async (c) => {
    try {
      const { results } = await c.env.DB.prepare(`SELECT SUM(s.quantity * p.purchasePrice) as totalValue, COUNT(DISTINCT s.productId) as productCount
        FROM stock s JOIN products p ON s.productId = p.id WHERE p.shopId = ? AND s.quantity > 0`).bind(c.var.shopId).all();
      return c.json({ data: (results as any)[0] || { totalValue: 0, productCount: 0 } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/inventory/adjustment', async (c) => {
    try {
      const { productId, variantId, warehouseId, quantity, reason } = await c.req.json();
      if (!productId || quantity === undefined || !reason) return c.json({ error: 'productId, quantity, reason required' }, 400);
      const shopId = c.var.shopId; const now = new Date().toISOString();
      const existing = await c.env.DB.prepare('SELECT s.id, s.quantity FROM stock s JOIN products p ON s.productId = p.id WHERE s.productId = ? AND p.shopId = ? AND (s.warehouseId = ? OR (? IS NULL AND s.warehouseId IS NULL))').bind(productId, shopId, warehouseId || '', warehouseId || null).first();
      if (existing) {
        const newQty = (existing as any).quantity + quantity;
        await c.env.DB.prepare('UPDATE stock SET quantity = ?, updatedAt = ? WHERE id = ?').bind(Math.max(0, newQty), now, (existing as any).id).run();
      } else {
        const stockId = crypto.randomUUID();
        await c.env.DB.prepare('INSERT INTO stock (id, productId, variantId, warehouseId, quantity, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?)').bind(stockId, productId, variantId || null, warehouseId || null, Math.max(0, quantity), now, now).run();
      }
      const movementId = crypto.randomUUID();
      await c.env.DB.prepare('INSERT INTO stock_movements (id, productId, variantId, warehouseId, quantity, type, notes, createdBy, createdAt) VALUES (?,?,?,?,?,?,?,?,?)').bind(movementId, productId, variantId || null, warehouseId || null, quantity, 'ADJUSTMENT', reason, c.var.userId, now).run();
      return c.json({ data: { id: movementId, type: 'ADJUSTMENT', quantity, reason, productId } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/inventory/transfer', async (c) => {
    try {
      const { productId, variantId, fromWarehouseId, toWarehouseId, quantity, notes } = await c.req.json();
      if (!productId || !fromWarehouseId || !toWarehouseId || !quantity) return c.json({ error: 'productId, fromWarehouseId, toWarehouseId, quantity required' }, 400);
      const shopId = c.var.shopId; const now = new Date().toISOString(); const movementId1 = crypto.randomUUID(); const movementId2 = crypto.randomUUID();
      const sourceStock = await c.env.DB.prepare('SELECT s.id, s.quantity FROM stock s JOIN products p ON s.productId = p.id WHERE s.productId = ? AND p.shopId = ? AND s.warehouseId = ?').bind(productId, shopId, fromWarehouseId).first();
      if (!sourceStock || (sourceStock as any).quantity < quantity) return c.json({ error: 'Insufficient stock in source warehouse' }, 400);
      let destStock = await c.env.DB.prepare('SELECT s.id FROM stock s JOIN products p ON s.productId = p.id WHERE s.productId = ? AND p.shopId = ? AND s.warehouseId = ?').bind(productId, shopId, toWarehouseId).first();
      await c.env.DB.batch([
        c.env.DB.prepare('UPDATE stock SET quantity = quantity - ?, updatedAt = ? WHERE id = ?').bind(quantity, now, (sourceStock as any).id),
        destStock
          ? c.env.DB.prepare('UPDATE stock SET quantity = quantity + ?, updatedAt = ? WHERE id = ?').bind(quantity, now, (destStock as any).id)
          : c.env.DB.prepare('INSERT INTO stock (id, productId, variantId, warehouseId, quantity, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(), productId, variantId || null, toWarehouseId, quantity, now, now),
        c.env.DB.prepare('INSERT INTO stock_movements (id, productId, variantId, warehouseId, quantity, type, notes, createdBy, createdAt) VALUES (?,?,?,?,?,?,?,?,?)').bind(movementId1, productId, variantId || null, fromWarehouseId, -quantity, 'TRANSFER_OUT', notes || `Transfer to ${toWarehouseId}`, c.var.userId, now),
        c.env.DB.prepare('INSERT INTO stock_movements (id, productId, variantId, warehouseId, quantity, type, notes, createdBy, createdAt) VALUES (?,?,?,?,?,?,?,?,?)').bind(movementId2, productId, variantId || null, toWarehouseId, quantity, 'TRANSFER_IN', notes || `Transfer from ${fromWarehouseId}`, c.var.userId, now),
      ]);
      return c.json({ data: { fromMovement: movementId1, toMovement: movementId2, productId, quantity } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/inventory/damage', async (c) => {
    try {
      const { productId, variantId, warehouseId, quantity, notes } = await c.req.json();
      if (!productId || !quantity) return c.json({ error: 'productId, quantity required' }, 400);
      const shopId = c.var.shopId; const now = new Date().toISOString();
      const stock = await c.env.DB.prepare('SELECT s.id, s.quantity FROM stock s JOIN products p ON s.productId = p.id WHERE s.productId = ? AND p.shopId = ? AND (s.warehouseId = ? OR (? IS NULL AND s.warehouseId IS NULL))').bind(productId, shopId, warehouseId || '', warehouseId || null).first();
      if (!stock || (stock as any).quantity < quantity) return c.json({ error: 'Insufficient stock' }, 400);
      await c.env.DB.prepare('UPDATE stock SET quantity = quantity - ?, damaged = COALESCE(damaged, 0) + ?, updatedAt = ? WHERE id = ?').bind(quantity, quantity, now, (stock as any).id).run();
      const movementId = crypto.randomUUID();
      await c.env.DB.prepare('INSERT INTO stock_movements (id, productId, variantId, warehouseId, quantity, type, notes, createdBy, createdAt) VALUES (?,?,?,?,?,?,?,?,?)').bind(movementId, productId, variantId || null, warehouseId || null, -quantity, 'DAMAGE', notes || 'Marked as damaged', c.var.userId, now).run();
      return c.json({ data: { id: movementId, type: 'DAMAGE', quantity, productId } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/inventory/return', async (c) => {
    try {
      const { productId, variantId, warehouseId, quantity, notes, reference } = await c.req.json();
      if (!productId || !quantity) return c.json({ error: 'productId, quantity required' }, 400);
      const shopId = c.var.shopId; const now = new Date().toISOString();
      const existing = await c.env.DB.prepare('SELECT s.id FROM stock s JOIN products p ON s.productId = p.id WHERE s.productId = ? AND p.shopId = ? AND (s.warehouseId = ? OR (? IS NULL AND s.warehouseId IS NULL))').bind(productId, shopId, warehouseId || '', warehouseId || null).first();
      if (existing) {
        await c.env.DB.prepare('UPDATE stock SET quantity = quantity + ?, updatedAt = ? WHERE id = ?').bind(quantity, now, (existing as any).id).run();
      } else {
        await c.env.DB.prepare('INSERT INTO stock (id, productId, variantId, warehouseId, quantity, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(), productId, variantId || null, warehouseId || null, quantity, now, now).run();
      }
      const movementId = crypto.randomUUID();
      await c.env.DB.prepare('INSERT INTO stock_movements (id, productId, variantId, warehouseId, quantity, type, reference, notes, createdBy, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(movementId, productId, variantId || null, warehouseId || null, quantity, 'RETURN', reference || null, notes || 'Returned to stock', c.var.userId, now).run();
      return c.json({ data: { id: movementId, type: 'RETURN', quantity, productId } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/inventory/count', async (c) => {
    try {
      const { productId, variantId, warehouseId, expectedQty, actualQty, notes } = await c.req.json();
      if (!productId || expectedQty === undefined || actualQty === undefined) return c.json({ error: 'productId, expectedQty, actualQty required' }, 400);
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      await c.env.DB.prepare('INSERT INTO stock_counts (id, productId, variantId, warehouseId, expectedQty, actualQty, variance, notes, userId, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(id, productId, variantId || null, warehouseId || null, expectedQty, actualQty, actualQty - expectedQty, notes || null, c.var.userId, now, now).run();
      return c.json({ data: { id, productId, expectedQty, actualQty, variance: actualQty - expectedQty } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/inventory/reconcile', async (c) => {
    try {
      const { id, actualQty, notes } = await c.req.json();
      if (!id || actualQty === undefined) return c.json({ error: 'id, actualQty required' }, 400);
      const now = new Date().toISOString(); const shopId = c.var.shopId;
      const count = await c.env.DB.prepare('SELECT * FROM stock_counts WHERE id = ?').bind(id).first();
      if (!count) return c.json({ error: 'Stock count not found' }, 404);
      const cData = count as any;
      const variance = actualQty - cData.expectedQty;
      if (variance !== 0) {
        const stock = await c.env.DB.prepare('SELECT s.id FROM stock s JOIN products p ON s.productId = p.id WHERE s.productId = ? AND p.shopId = ? AND (s.warehouseId = ? OR (? IS NULL AND s.warehouseId IS NULL))').bind(cData.productId, shopId, cData.warehouseId || '', cData.warehouseId || null).first();
        if (stock) {
          await c.env.DB.prepare('UPDATE stock SET quantity = ?, updatedAt = ? WHERE id = ?').bind(actualQty, now, (stock as any).id).run();
        } else {
          const stockId = crypto.randomUUID();
          await c.env.DB.prepare('INSERT INTO stock (id, productId, variantId, warehouseId, quantity, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?)').bind(stockId, cData.productId, cData.variantId, cData.warehouseId, actualQty, now, now).run();
        }
        const movementId = crypto.randomUUID();
        await c.env.DB.prepare('INSERT INTO stock_movements (id, productId, variantId, warehouseId, quantity, type, notes, createdBy, createdAt) VALUES (?,?,?,?,?,?,?,?,?)').bind(movementId, cData.productId, cData.variantId, cData.warehouseId, variance, 'RECONCILIATION', notes || `Reconciled from count ${id}`, c.var.userId, now).run();
      }
      await c.env.DB.prepare('UPDATE stock_counts SET actualQty = ?, variance = ?, notes = COALESCE(?, notes), updatedAt = ? WHERE id = ?').bind(actualQty, variance, notes || null, now, id).run();
      return c.json({ data: { id, productId: cData.productId, expectedQty: cData.expectedQty, actualQty, variance } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/inventory', async (c) => {
    try {
      const db = c.env.DB;
      const search = c.req.query('search') || '';
      const categoryId = c.req.query('categoryId') || '';
      const warehouseId = c.req.query('warehouseId') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      let query = `SELECT s.*, p.name as productName, p.sku, p.barcode, p.purchasePrice, p.sellingPrice, p.minStock, p.categoryId,
        p.image, p.unit, w.name as warehouseName FROM stock s JOIN products p ON s.productId = p.id LEFT JOIN warehouses w ON s.warehouseId = w.id WHERE p.shopId = ?`;
      const params: any[] = [c.var.shopId];
      if (search) { query += ' AND (p.name LIKE ? OR p.sku LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
      if (categoryId) { query += ' AND p.categoryId = ?'; params.push(categoryId); }
      if (warehouseId) { query += ' AND s.warehouseId = ?'; params.push(warehouseId); }
      query += ' ORDER BY p.name ASC LIMIT ? OFFSET ?'; params.push(limit, offset);
      const { results } = await db.prepare(query).bind(...params).all();
      let countQuery = 'SELECT COUNT(*) as total FROM stock s JOIN products p ON s.productId = p.id WHERE p.shopId = ?';
      const countParams: any[] = [c.var.shopId];
      if (search) { countQuery += ' AND (p.name LIKE ? OR p.sku LIKE ?)'; countParams.push(`%${search}%`, `%${search}%`); }
      if (categoryId) { countQuery += ' AND p.categoryId = ?'; countParams.push(categoryId); }
      if (warehouseId) { countQuery += ' AND s.warehouseId = ?'; countParams.push(warehouseId); }
      const { results: countRes } = await db.prepare(countQuery).bind(...countParams).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/inventory', async (c) => {
    try {
      const { productId, variantId, warehouseId, quantity, batch, expiryDate } = await c.req.json();
      if (!productId || quantity === undefined) return c.json({ error: 'productId, quantity required' }, 400);
      const shopId = c.var.shopId; const now = new Date().toISOString();
      const existing = await c.env.DB.prepare('SELECT s.id FROM stock s JOIN products p ON s.productId = p.id WHERE s.productId = ? AND p.shopId = ? AND (s.variantId = ? OR (? IS NULL AND s.variantId IS NULL)) AND (s.warehouseId = ? OR (? IS NULL AND s.warehouseId IS NULL))').bind(productId, shopId, variantId || null, variantId || null, warehouseId || null, warehouseId || null).first();
      if (existing) {
        await c.env.DB.prepare('UPDATE stock SET quantity = quantity + ?, batch = COALESCE(?, batch), expiryDate = COALESCE(?, expiryDate), updatedAt = ? WHERE id = ?').bind(quantity, batch || null, expiryDate || null, now, (existing as any).id).run();
        return c.json({ data: { id: (existing as any).id, productId, quantity, updated: true } });
      }
      const id = crypto.randomUUID();
      await c.env.DB.prepare('INSERT INTO stock (id, productId, variantId, warehouseId, quantity, batch, expiryDate, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?)').bind(id, productId, variantId || null, warehouseId || null, quantity, batch || null, expiryDate || null, now, now).run();
      return c.json({ data: { id, productId, quantity, updated: false } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/inventory/:id', async (c) => {
    try {
      const body = await c.req.json();
      const allowed = ['quantity', 'reserved', 'damaged', 'batch', 'expiryDate'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) { if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); } }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      vals.push(new Date().toISOString(), c.req.param('id'), c.var.shopId);
      await c.env.DB.prepare(`UPDATE stock SET ${sets.join(', ')}, updatedAt = ? WHERE id = ? AND productId IN (SELECT id FROM products WHERE shopId = ?)`).bind(...vals).run();
      const updated = await c.env.DB.prepare('SELECT * FROM stock WHERE id = ?').bind(c.req.param('id')).first();
      return c.json({ data: updated });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/barcode/generate', async (c) => {
    try {
      const { productId, variantId, type } = await c.req.json();
      if (!productId) return c.json({ error: 'productId required' }, 400);
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      const code = Math.random().toString(36).substring(2, 15).toUpperCase();
      await c.env.DB.prepare('INSERT INTO barcodes (id, productId, variantId, code, type, createdAt) VALUES (?,?,?,?,?,?)').bind(id, productId, variantId || null, code, type || 'CODE128', now).run();
      return c.json({ data: { id, productId, code, type: type || 'CODE128' } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/barcode/:id', async (c) => {
    try {
      const barcode = await c.env.DB.prepare('SELECT b.*, p.name as productName, p.sku FROM barcodes b JOIN products p ON b.productId = p.id WHERE b.id = ? AND p.shopId = ?').bind(c.req.param('id'), c.var.shopId).first();
      if (!barcode) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: barcode });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/barcode/print', async (c) => {
    try {
      const { ids } = await c.req.json();
      if (!ids?.length) return c.json({ error: 'ids required' }, 400);
      return c.json({ message: 'Print job queued', count: ids.length });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/qr/generate', async (c) => {
    try {
      const { productId, data } = await c.req.json();
      if (!productId) return c.json({ error: 'productId required' }, 400);
      const qrData = data || `${c.var.shopId}:${productId}`;
      return c.json({ data: { url: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(productId || '') } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/qr/print', async (c) => {
    try {
      const { ids } = await c.req.json();
      if (!ids?.length) return c.json({ error: 'ids required' }, 400);
      return c.json({ message: 'Print job queued', count: ids.length });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/imei/history', async (c) => {
    try {
      const imei = c.req.query('imei') || '';
      if (!imei) return c.json({ error: 'imei query param required' }, 400);
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results: sales } = await c.env.DB.prepare(`SELECT i.*, si.*, s.invoiceNo, s.total as saleTotal, s.createdAt as saleDate
        FROM imei_records i LEFT JOIN sale_items si ON i.imei = si.imei LEFT JOIN sales s ON si.saleId = s.id
        WHERE i.imei = ? AND s.shopId = ? ORDER BY s.createdAt DESC LIMIT ? OFFSET ?`).bind(imei, c.var.shopId, limit, offset).all();
      const { results: repairs } = await c.env.DB.prepare(`SELECT sr.* FROM service_repairs sr WHERE sr.imei = ? AND sr.shopId = ? ORDER BY sr.createdAt DESC LIMIT ? OFFSET ?`).bind(imei, c.var.shopId, limit, offset).all();
      return c.json({ data: { sales, repairs } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/imei/warranty', async (c) => {
    try {
      const imei = c.req.query('imei') || '';
      if (!imei) return c.json({ error: 'imei query param required' }, 400);
      const record = await c.env.DB.prepare(`SELECT i.*, w.type as warrantyType, w.startDate, w.endDate, w.status as warrantyStatus
        FROM imei_records i JOIN products p ON i.productId = p.id LEFT JOIN warranties w ON i.imei = w.imei AND w.shopId = ?
        WHERE i.imei = ? AND p.shopId = ?`).bind(c.var.shopId, imei, c.var.shopId).first();
      if (!record) return c.json({ error: 'IMEI not found' }, 404);
      return c.json({ data: record });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/imei/service', async (c) => {
    try {
      const imei = c.req.query('imei') || '';
      if (!imei) return c.json({ error: 'imei query param required' }, 400);
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await c.env.DB.prepare('SELECT * FROM service_repairs WHERE imei = ? AND shopId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?').bind(imei, c.var.shopId, limit, offset).all();
      const { results: countRes } = await c.env.DB.prepare('SELECT COUNT(*) as total FROM service_repairs WHERE imei = ? AND shopId = ?').bind(imei, c.var.shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/imei/sales', async (c) => {
    try {
      const imei = c.req.query('imei') || '';
      if (!imei) return c.json({ error: 'imei query param required' }, 400);
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await c.env.DB.prepare(`SELECT si.*, s.invoiceNo, s.total as saleTotal, s.createdAt as saleDate, c.name as customerName, c.phone as customerPhone
        FROM sale_items si JOIN sales s ON si.saleId = s.id LEFT JOIN customers c ON s.customerId = c.id
        WHERE si.imei = ? AND s.shopId = ? ORDER BY s.createdAt DESC LIMIT ? OFFSET ?`).bind(imei, c.var.shopId, limit, offset).all();
      const { results: countRes } = await c.env.DB.prepare('SELECT COUNT(*) as total FROM sale_items si JOIN sales s ON si.saleId = s.id WHERE si.imei = ? AND s.shopId = ?').bind(imei, c.var.shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/imei/import', async (c) => {
    try {
      const items = await c.req.json();
      if (!Array.isArray(items) || !items.length) return c.json({ error: 'Array of IMEI records required' }, 400);
      const now = new Date().toISOString(); const results: any[] = []; const errors: any[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.imei || !item.productId) { errors.push({ index: i, error: 'imei and productId required' }); continue; }
        try {
          const id = crypto.randomUUID();
          await c.env.DB.prepare('INSERT INTO imei_records (id, productId, variantId, imei, serialNumber, status, warrantyExpiry, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?)').bind(id, item.productId, item.variantId || null, item.imei, item.serialNumber || null, 'ACTIVE', item.warrantyExpiry || null, now, now).run();
          results.push({ id, imei: item.imei, productId: item.productId });
        } catch (e: any) { errors.push({ index: i, imei: item.imei, error: e.message }); }
      }
      return c.json({ data: { imported: results.length, failed: errors.length, results, errors } }, results.length ? 201 : 400);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/imei/export', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT i.* FROM imei_records i JOIN products p ON i.productId = p.id WHERE p.shopId = ? ORDER BY i.createdAt DESC').bind(c.var.shopId).all();
      return c.json({ data: results });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/imei', async (c) => {
    try {
      const { productId, variantId, imei, serialNumber, warrantyExpiry } = await c.req.json();
      if (!productId || !imei) return c.json({ error: 'productId, imei required' }, 400);
      const existing = await c.env.DB.prepare('SELECT i.id FROM imei_records i JOIN products p ON i.productId = p.id WHERE i.imei = ? AND p.shopId = ?').bind(imei, c.var.shopId).first();
      if (existing) return c.json({ error: 'IMEI already exists' }, 409);
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      await c.env.DB.prepare('INSERT INTO imei_records (id, productId, variantId, imei, serialNumber, status, warrantyExpiry, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?)').bind(id, productId, variantId || null, imei, serialNumber || null, 'ACTIVE', warrantyExpiry || null, now, now).run();
      return c.json({ data: { id, productId, imei, serialNumber: serialNumber || null, status: 'ACTIVE' } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/imei', async (c) => {
    try {
      const db = c.env.DB;
      const search = c.req.query('search') || '';
      const status = c.req.query('status') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      let query = 'SELECT i.*, p.name as productName, p.sku FROM imei_records i JOIN products p ON i.productId = p.id WHERE p.shopId = ?';
      const params: any[] = [c.var.shopId];
      if (search) { query += ' AND (i.imei LIKE ? OR i.serialNumber LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
      if (status) { query += ' AND i.status = ?'; params.push(status); }
      query += ' ORDER BY i.createdAt DESC LIMIT ? OFFSET ?'; params.push(limit, offset);
      const { results } = await db.prepare(query).bind(...params).all();
      let countQuery = 'SELECT COUNT(*) as total FROM imei_records i JOIN products p ON i.productId = p.id WHERE p.shopId = ?';
      const countParams: any[] = [c.var.shopId];
      if (search) { countQuery += ' AND (i.imei LIKE ? OR i.serialNumber LIKE ?)'; countParams.push(`%${search}%`, `%${search}%`); }
      if (status) { countQuery += ' AND i.status = ?'; countParams.push(status); }
      const { results: countRes } = await db.prepare(countQuery).bind(...countParams).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/imei/:number', async (c) => {
    try {
      const record = await c.env.DB.prepare('SELECT i.*, p.name as productName, p.sku FROM imei_records i JOIN products p ON i.productId = p.id WHERE i.imei = ? AND p.shopId = ?').bind(c.req.param('number'), c.var.shopId).first();
      if (!record) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: record });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/imei/:id', async (c) => {
    try {
      const body = await c.req.json();
      const allowed = ['status', 'serialNumber', 'warrantyExpiry'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) { if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); } }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      vals.push(new Date().toISOString(), c.req.param('id'), c.var.shopId);
      await c.env.DB.prepare(`UPDATE imei_records SET ${sets.join(', ')}, updatedAt = ? WHERE id = ? AND productId IN (SELECT id FROM products WHERE shopId = ?)`).bind(...vals).run();
      const updated = await c.env.DB.prepare('SELECT * FROM imei_records WHERE id = ?').bind(c.req.param('id')).first();
      return c.json({ data: updated });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/imei/:id', async (c) => {
    try {
      const now = new Date().toISOString();
      await c.env.DB.prepare("UPDATE imei_records SET status = 'RETURNED', updatedAt = ? WHERE id = ? AND productId IN (SELECT id FROM products WHERE shopId = ?)").bind(now, c.req.param('id'), c.var.shopId).run();
      return c.json({ message: 'Deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/warranty/expired', async (c) => {
    try {
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const now = new Date().toISOString();
      const { results } = await c.env.DB.prepare(`SELECT w.*, p.name as productName, p.sku, c.name as customerName, c.phone as customerPhone
        FROM warranties w LEFT JOIN products p ON w.productId = p.id LEFT JOIN customers c ON w.customerId = c.id
        WHERE w.shopId = ? AND w.endDate < ? ORDER BY w.endDate ASC LIMIT ? OFFSET ?`).bind(c.var.shopId, now, limit, offset).all();
      const { results: countRes } = await c.env.DB.prepare('SELECT COUNT(*) as total FROM warranties WHERE shopId = ? AND endDate < ?').bind(c.var.shopId, now).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/warranty/active', async (c) => {
    try {
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const now = new Date().toISOString();
      const { results } = await c.env.DB.prepare(`SELECT w.*, p.name as productName, p.sku, c.name as customerName, c.phone as customerPhone
        FROM warranties w LEFT JOIN products p ON w.productId = p.id LEFT JOIN customers c ON w.customerId = c.id
        WHERE w.shopId = ? AND w.status = 'ACTIVE' AND w.endDate >= ? ORDER BY w.endDate ASC LIMIT ? OFFSET ?`).bind(c.var.shopId, now, limit, offset).all();
      const { results: countRes } = await c.env.DB.prepare("SELECT COUNT(*) as total FROM warranties WHERE shopId = ? AND status = 'ACTIVE' AND endDate >= ?").bind(c.var.shopId, now).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/warranty', async (c) => {
    try {
      const { productId, customerId, saleId, imei, type, startDate, endDate, terms } = await c.req.json();
      if (!productId || !customerId) return c.json({ error: 'productId, customerId required' }, 400);
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      await c.env.DB.prepare('INSERT INTO warranties (id, shopId, productId, customerId, saleId, imei, type, startDate, endDate, terms, status, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id, c.var.shopId, productId, customerId, saleId || null, imei || null, type || 'STANDARD', startDate || now, endDate || null, terms || null, 'ACTIVE', now, now).run();
      return c.json({ data: { id, productId, customerId, type: type || 'STANDARD', status: 'ACTIVE' } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/warranty', async (c) => {
    try {
      const db = c.env.DB;
      const search = c.req.query('search') || '';
      const status = c.req.query('status') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      let query = `SELECT w.*, p.name as productName, p.sku, c.name as customerName, c.phone as customerPhone
        FROM warranties w LEFT JOIN products p ON w.productId = p.id LEFT JOIN customers c ON w.customerId = c.id WHERE w.shopId = ?`;
      const params: any[] = [c.var.shopId];
      if (search) { query += ' AND (c.name LIKE ? OR c.phone LIKE ? OR p.name LIKE ? OR p.sku LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
      if (status) { query += ' AND w.status = ?'; params.push(status); }
      query += ' ORDER BY w.createdAt DESC LIMIT ? OFFSET ?'; params.push(limit, offset);
      const { results } = await db.prepare(query).bind(...params).all();
      let countQuery = 'SELECT COUNT(*) as total FROM warranties WHERE shopId = ?';
      const countParams: any[] = [c.var.shopId];
      if (status) { countQuery += ' AND status = ?'; countParams.push(status); }
      const { results: countRes } = await db.prepare(countQuery).bind(...countParams).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/warranty/:id', async (c) => {
    try {
      const body = await c.req.json();
      const allowed = ['type', 'endDate', 'terms', 'status'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) { if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); } }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      vals.push(new Date().toISOString(), c.req.param('id'), c.var.shopId);
      await c.env.DB.prepare(`UPDATE warranties SET ${sets.join(', ')}, updatedAt = ? WHERE id = ? AND shopId = ?`).bind(...vals).run();
      const updated = await c.env.DB.prepare('SELECT * FROM warranties WHERE id = ?').bind(c.req.param('id')).first();
      return c.json({ data: updated });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== WAREHOUSES ====================

  app.post('/api/warehouses', async (c) => {
    try {
      const { name, address, managerId } = await c.req.json();
      if (!name) return c.json({ error: 'Name required' }, 400);
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      await c.env.DB.prepare('INSERT INTO warehouses (id, shopId, name, address, managerId, isActive, createdAt, updatedAt) VALUES (?,?,?,?,?,1,?,?)').bind(id, c.var.shopId, name, address || null, managerId || null, now, now).run();
      return c.json({ data: { id, name, address: address || null, managerId: managerId || null } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/warehouses', async (c) => {
    try {
      const search = c.req.query('search') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      let where = 'WHERE shopId = ? AND isActive = 1'; const params: any[] = [c.var.shopId];
      if (search) { where += ' AND name LIKE ?'; params.push(`%${search}%`); }
      const { results } = await c.env.DB.prepare(`SELECT * FROM warehouses ${where} ORDER BY name ASC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM warehouses ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/warehouses/:id', async (c) => {
    try {
      const wh = await c.env.DB.prepare('SELECT * FROM warehouses WHERE id = ? AND shopId = ?').bind(c.req.param('id'), c.var.shopId).first();
      if (!wh) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: wh });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/warehouses/:id', async (c) => {
    try {
      const body = await c.req.json(); const allowed = ['name', 'address', 'managerId', 'isActive'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) { if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); } }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      vals.push(new Date().toISOString(), c.req.param('id'), c.var.shopId);
      await c.env.DB.prepare(`UPDATE warehouses SET ${sets.join(', ')}, updatedAt = ? WHERE id = ? AND shopId = ?`).bind(...vals).run();
      const updated = await c.env.DB.prepare('SELECT * FROM warehouses WHERE id = ?').bind(c.req.param('id')).first();
      return c.json({ data: updated });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/warehouses/:id', async (c) => {
    try {
      await c.env.DB.prepare('UPDATE warehouses SET isActive = 0, updatedAt = ? WHERE id = ? AND shopId = ?').bind(new Date().toISOString(), c.req.param('id'), c.var.shopId).run();
      return c.json({ message: 'Deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });
}
