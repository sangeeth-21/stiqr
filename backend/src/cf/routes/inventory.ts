import { Hono } from 'hono';
import { crud } from '../main';

export function inventoryRoutes(app: Hono) {
  // ==================== PRODUCTS ====================
  app.route('/api/products', crud('products', {
    searchable: ['name', 'sku', 'barcode'],
    updatable: ['name', 'sku', 'barcode', 'description', 'categoryId', 'brandId', 'unitId', 'supplierId', 'purchasePrice', 'sellingPrice', 'compareAtPrice', 'taxRate', 'hsnCode', 'status', 'isFeatured', 'minStock', 'maxStock', 'warranty', 'hasVariants'],
  }));

  app.get('/api/products/:id/variants', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT * FROM product_variants WHERE productId = ?').bind(c.req.param('id')).all();
      return c.json({ statusCode: 200, data: results });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  app.post('/api/products/:id/variants', async (c) => {
    try {
      const body = await c.req.json();
      const id = crypto.randomUUID();
      await c.env.DB.prepare("INSERT INTO product_variants (id, productId, name, sku, price, stock, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))").bind(id, c.req.param('id'), body.name, body.sku || null, body.price || 0, body.stock || 0).run();
      return c.json({ statusCode: 201, data: { id, ...body } }, 201);
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  app.get('/api/products/:id/images', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT * FROM product_images WHERE productId = ? ORDER BY sortOrder').bind(c.req.param('id')).all();
      return c.json({ statusCode: 200, data: results });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  app.post('/api/products/:id/images', async (c) => {
    try {
      const body = await c.req.json();
      const id = crypto.randomUUID();
      await c.env.DB.prepare("INSERT INTO product_images (id, productId, url, alt, sortOrder, isPrimary, createdAt) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))").bind(id, c.req.param('id'), body.url, body.alt || null, body.sortOrder || 0, body.isPrimary ? 1 : 0).run();
      return c.json({ statusCode: 201, data: { id, ...body } }, 201);
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  // ==================== CATEGORIES ====================
  app.route('/api/categories', crud('categories', { searchable: ['name'], updatable: ['name', 'description', 'parentId', 'imageUrl', 'sortOrder', 'isActive'] }));

  app.get('/api/categories/tree', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT * FROM categories ORDER BY sortOrder, name').all();
      return c.json({ statusCode: 200, data: results });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  // ==================== BRANDS ====================
  app.route('/api/brands', crud('brands', { searchable: ['name'], updatable: ['name', 'description', 'logo', 'isActive'] }));

  // ==================== UNITS ====================
  app.route('/api/units', crud('units', { searchable: ['name', 'shortName'], updatable: ['name', 'shortName', 'baseUnit', 'conversionFactor'] }));

  // ==================== STOCK ====================
  app.get('/api/stock', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT s.*, p.name as productName FROM stock s LEFT JOIN products p ON p.id = s.productId').all();
      return c.json({ statusCode: 200, data: results });
    } catch { return c.json({ statusCode: 200, data: [] }); }
  });

  app.get('/api/stock/:id', async (c) => {
    try {
      const item = await c.env.DB.prepare('SELECT * FROM stock WHERE id = ?').bind(c.req.param('id')).first();
      if (!item) return c.json({ statusCode: 404, message: 'Not found' }, 404);
      return c.json({ statusCode: 200, data: item });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  app.post('/api/stock/adjust', async (c) => {
    try {
      const body = await c.req.json();
      const id = crypto.randomUUID();
      await c.env.DB.prepare("INSERT INTO stock_movements (id, productId, type, quantity, reference, notes, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))").bind(id, body.productId, body.type || 'ADJUSTMENT', body.quantity, body.reference || null, body.notes || null, c.get('userId')).run();
      return c.json({ statusCode: 201, data: { id, ...body } }, 201);
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  // ==================== STOCK MOVEMENTS ====================
  app.get('/api/stock-movements', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT * FROM stock_movements LIMIT 100').all();
      return c.json({ statusCode: 200, data: results });
    } catch { return c.json({ statusCode: 200, data: [] }); }
  });

  app.get('/api/stock-movements/:id', async (c) => {
    try {
      const item = await c.env.DB.prepare('SELECT * FROM stock_movements WHERE id = ?').bind(c.req.param('id')).first();
      if (!item) return c.json({ statusCode: 404, message: 'Not found' }, 404);
      return c.json({ statusCode: 200, data: item });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  // ==================== PRODUCT VARIANTS ====================
  app.route('/api/product-variants', crud('product_variants', { searchable: ['name', 'sku'], updatable: ['name', 'sku', 'price', 'stock', 'isActive'] }));

  // ==================== PRODUCT IMAGES ====================
  app.route('/api/product-images', crud('product_images', { updatable: ['url', 'alt', 'sortOrder', 'isPrimary'] }));

  // ==================== SUPPLIERS ====================
  app.route('/api/suppliers', crud('suppliers', { searchable: ['name', 'email', 'phone'], updatable: ['name', 'email', 'phone', 'address', 'company', 'status', 'notes'] }));

  // ==================== WAREHOUSES ====================
  app.route('/api/warehouses', crud('warehouses', { searchable: ['name'], updatable: ['name', 'address', 'phone', 'managerId', 'capacity', 'status'] }));

  // ==================== BARCODES ====================
  app.route('/api/barcodes', crud('barcodes', { searchable: ['code'], updatable: ['code', 'type', 'productId'] }));

  app.get('/api/barcodes/search/:code', async (c) => {
    try {
      const barcode = await c.env.DB.prepare('SELECT b.*, p.name as productName, p.sellingPrice FROM barcodes b LEFT JOIN products p ON p.id = b.productId WHERE b.code = ?').bind(c.req.param('code')).first();
      if (!barcode) return c.json({ statusCode: 404, message: 'Barcode not found' }, 404);
      return c.json({ statusCode: 200, data: barcode });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  // ==================== IMEI RECORDS ====================
  app.route('/api/imei', crud('imei_records', { searchable: ['imei', 'model'], updatable: ['status', 'shopId', 'customerId'] }));

  // ==================== TAX RULES ====================
  app.route('/api/tax', crud('tax_rules', { searchable: ['name', 'rate'], updatable: ['name', 'rate', 'type', 'isActive'] }));

  // ==================== COUPONS ====================
  app.route('/api/coupons', crud('coupons', { searchable: ['code', 'name'], updatable: ['name', 'description', 'discountType', 'discountValue', 'minPurchase', 'maxUses', 'startDate', 'endDate', 'isActive'] }));

  app.post('/api/coupons/:id/validate', async (c) => {
    try {
      const coupon = await c.env.DB.prepare("SELECT * FROM coupons WHERE id = ? AND isActive = 1 AND (endDate IS NULL OR endDate >= datetime('now'))").bind(c.req.param('id')).first() as any;
      if (!coupon) return c.json({ statusCode: 400, message: 'Invalid or expired coupon' }, 400);
      const { amount } = await c.req.json();
      if (coupon.minPurchase && amount < coupon.minPurchase) return c.json({ statusCode: 400, message: `Minimum purchase ₹${coupon.minPurchase}` }, 400);
      return c.json({ statusCode: 200, data: { valid: true, coupon } });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  // ==================== INVENTORY SUMMARY ====================
  app.get('/api/inventory', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT p.*, s.quantity as currentStock FROM products p LEFT JOIN stock s ON s.productId = p.id WHERE p.deletedAt IS NULL AND (s.quantity IS NULL OR s.quantity < p.minStock) ORDER BY s.quantity ASC').all();
      return c.json({ statusCode: 200, data: results });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  app.get('/api/inventory/summary', async (c) => {
    try {
      const [total, stockValue, lowStock] = await Promise.all([
        c.env.DB.prepare('SELECT COUNT(*) as count FROM products').first() as any,
        c.env.DB.prepare('SELECT COALESCE(SUM(s.quantity * p.sellingPrice), 0) as total FROM stock s INNER JOIN products p ON p.id = s.productId').first() as any,
        c.env.DB.prepare('SELECT COUNT(*) as count FROM products p LEFT JOIN stock s ON s.productId = p.id WHERE p.deletedAt IS NULL AND s.quantity < p.minStock').first() as any,
      ]);
      return c.json({ statusCode: 200, data: { totalProducts: total?.count || 0, totalStockValue: stockValue?.total || 0, lowStockCount: lowStock?.count || 0 } });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });
}
