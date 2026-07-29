function slugify(name: string, id: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + id.slice(0, 8);
}

export function catalogRoutes(app: any) {

  // ==================== CATEGORIES ====================

  app.post('/api/categories', async (c) => {
    try {
      const { name, slug, parentId, icon, sortOrder } = await c.req.json();
      if (!name) return c.json({ error: 'Name required' }, 400);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const finalSlug = slug || slugify(name, id);
      await c.env.DB.prepare(
        'INSERT INTO categories (id, name, slug, parentId, icon, sortOrder, shopId, isActive, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,1,?,?)'
      ).bind(id, name, finalSlug, parentId || null, icon || null, sortOrder ?? 0, c.var.shopId, now, now).run();
      return c.json({ data: { id, name, slug: finalSlug, parentId: parentId || null, icon: icon || null, sortOrder: sortOrder ?? 0, shopId: c.var.shopId } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/categories', async (c) => {
    try {
      const db = c.env.DB;
      const search = c.req.query('search') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const shopId = c.var.shopId;
      let where = 'WHERE shopId = ? AND isActive = 1';
      const params: any[] = [shopId];
      if (search) { where += ' AND name LIKE ?'; params.push(`%${search}%`); }
      const { results } = await db.prepare(`SELECT * FROM categories ${where} ORDER BY sortOrder ASC, name ASC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM categories ${where}`).bind(...params).all();
      const categories = results as any[];
      const map = new Map<string, any>();
      const roots: any[] = [];
      for (const cat of categories) { cat.children = []; map.set(cat.id, cat); }
      for (const cat of categories) {
        if (cat.parentId && map.has(cat.parentId)) {
          map.get(cat.parentId)!.children.push(cat);
        } else {
          roots.push(cat);
        }
      }
      return c.json({ data: roots, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/categories/:id', async (c) => {
    try {
      const cat = await c.env.DB.prepare('SELECT * FROM categories WHERE id = ? AND shopId = ?').bind(c.req.param('id'), c.var.shopId).first();
      if (!cat) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: cat });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/categories/:id', async (c) => {
    try {
      const body = await c.req.json();
      const allowed = ['name', 'slug', 'parentId', 'icon', 'sortOrder', 'isActive'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) { if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); } }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      vals.push(new Date().toISOString(), c.req.param('id'), c.var.shopId);
      await c.env.DB.prepare(`UPDATE categories SET ${sets.join(', ')}, updatedAt = ? WHERE id = ? AND shopId = ?`).bind(...vals).run();
      const cat = await c.env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(c.req.param('id')).first();
      return c.json({ data: cat });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/categories/:id', async (c) => {
    try {
      await c.env.DB.prepare('UPDATE categories SET isActive = 0, updatedAt = ? WHERE id = ? AND shopId = ?').bind(new Date().toISOString(), c.req.param('id'), c.var.shopId).run();
      return c.json({ message: 'Deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== BRANDS ====================

  app.post('/api/brands', async (c) => {
    try {
      const { name, slug, logo, description } = await c.req.json();
      if (!name) return c.json({ error: 'Name required' }, 400);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const finalSlug = slug || slugify(name, id);
      await c.env.DB.prepare(
        'INSERT INTO brands (id, name, slug, logo, description, shopId, isActive, createdAt, updatedAt) VALUES (?,?,?,?,?,?,1,?,?)'
      ).bind(id, name, finalSlug, logo || null, description || null, c.var.shopId, now, now).run();
      return c.json({ data: { id, name, slug: finalSlug, logo: logo || null, description: description || null, shopId: c.var.shopId } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/brands', async (c) => {
    try {
      const db = c.env.DB;
      const search = c.req.query('search') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const shopId = c.var.shopId;
      let where = 'WHERE shopId = ? AND isActive = 1';
      const params: any[] = [shopId];
      if (search) { where += ' AND (name LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
      const { results } = await db.prepare(`SELECT * FROM brands ${where} ORDER BY name ASC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM brands ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/brands/:id', async (c) => {
    try {
      const brand = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ? AND shopId = ?').bind(c.req.param('id'), c.var.shopId).first();
      if (!brand) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: brand });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/brands/:id', async (c) => {
    try {
      const body = await c.req.json();
      const allowed = ['name', 'logo', 'description', 'isActive'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) { if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); } }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      vals.push(new Date().toISOString(), c.req.param('id'), c.var.shopId);
      await c.env.DB.prepare(`UPDATE brands SET ${sets.join(', ')}, updatedAt = ? WHERE id = ? AND shopId = ?`).bind(...vals).run();
      const brand = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?').bind(c.req.param('id')).first();
      return c.json({ data: brand });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/brands/:id', async (c) => {
    try {
      await c.env.DB.prepare('UPDATE brands SET isActive = 0, updatedAt = ? WHERE id = ? AND shopId = ?').bind(new Date().toISOString(), c.req.param('id'), c.var.shopId).run();
      return c.json({ message: 'Deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== PRODUCTS ====================

  app.post('/api/products', async (c) => {
    try {
      const body = await c.req.json();
      const { name, slug, description, sku, barcode, categoryId, brandId, unitId, supplierId, purchasePrice, sellingPrice, compareAtPrice, taxRate, taxType, hsnCode, images, isFeatured, minStock, maxStock, warranty, hasVariants } = body;
      if (!name) return c.json({ error: 'Name required' }, 400);
      if (purchasePrice === undefined) return c.json({ error: 'purchasePrice required' }, 400);
      if (sellingPrice === undefined) return c.json({ error: 'sellingPrice required' }, 400);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const finalSlug = slug || slugify(name, id);
      const status = 'ACTIVE';
      const imagesJson = images && Array.isArray(images) ? JSON.stringify(images) : null;
      await c.env.DB.prepare(
        `INSERT INTO products (id, name, slug, description, sku, barcode, categoryId, brandId, unitId, supplierId, purchasePrice, sellingPrice, compareAtPrice, taxRate, taxType, hsnCode, images, isFeatured, minStock, maxStock, warranty, hasVariants, status, shopId, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(id, name, finalSlug, description || null, sku || null, barcode || null, categoryId || null, brandId || null, unitId || null, supplierId || null, purchasePrice, sellingPrice, compareAtPrice ?? null, taxRate ?? 0, taxType || 'GST', hsnCode || null, imagesJson, isFeatured ? 1 : 0, minStock ?? 0, maxStock ?? null, warranty ?? null, hasVariants ? 1 : 0, status, c.var.shopId, now, now).run();
      return c.json({ data: { id, name, slug: finalSlug, status } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/products', async (c) => {
    try {
      const db = c.env.DB;
      const search = c.req.query('search') || '';
      const categoryId = c.req.query('categoryId') || '';
      const brandId = c.req.query('brandId') || '';
      const status = c.req.query('status') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const shopId = c.var.shopId;
      let where = 'WHERE p.shopId = ?';
      const params: any[] = [shopId];
      if (search) { where += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
      if (categoryId) { where += ' AND p.categoryId = ?'; params.push(categoryId); }
      if (brandId) { where += ' AND p.brandId = ?'; params.push(brandId); }
      if (status) { where += ' AND p.status = ?'; params.push(status); }
      const { results } = await db.prepare(
        `SELECT p.*, COUNT(pv.id) as variantCount FROM products p LEFT JOIN product_variants pv ON pv.productId = p.id AND pv.isActive = 1 ${where} GROUP BY p.id ORDER BY p.createdAt DESC LIMIT ? OFFSET ?`
      ).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM (SELECT p.id FROM products p LEFT JOIN product_variants pv ON pv.productId = p.id AND pv.isActive = 1 ${where} GROUP BY p.id)`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/products/:id', async (c) => {
    try {
      const db = c.env.DB;
      const product = await db.prepare('SELECT * FROM products WHERE id = ? AND shopId = ?').bind(c.req.param('id'), c.var.shopId).first() as any;
      if (!product) return c.json({ error: 'Not found' }, 404);
      const { results: variants } = await db.prepare('SELECT * FROM product_variants WHERE productId = ? AND isActive = 1').bind(product.id).all();
      product.variants = variants;
      if (product.images && typeof product.images === 'string') {
        try { product.images = JSON.parse(product.images); } catch { product.images = []; }
      } else {
        product.images = product.images || [];
      }
      return c.json({ data: product });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/products/:id', async (c) => {
    try {
      const body = await c.req.json();
      const allowed = ['name', 'slug', 'description', 'sku', 'barcode', 'categoryId', 'brandId', 'unitId', 'supplierId', 'purchasePrice', 'sellingPrice', 'compareAtPrice', 'taxRate', 'taxType', 'hsnCode', 'images', 'isFeatured', 'minStock', 'maxStock', 'warranty', 'hasVariants', 'status'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) {
        if (body[k] !== undefined) {
          if (k === 'images') { sets.push('images = ?'); vals.push(Array.isArray(body[k]) ? JSON.stringify(body[k]) : body[k]); }
          else { sets.push(`${k} = ?`); vals.push(body[k]); }
        }
      }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      vals.push(new Date().toISOString(), c.req.param('id'), c.var.shopId);
      await c.env.DB.prepare(`UPDATE products SET ${sets.join(', ')}, updatedAt = ? WHERE id = ? AND shopId = ?`).bind(...vals).run();
      const product = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(c.req.param('id')).first();
      return c.json({ data: product });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/products/:id', async (c) => {
    try {
      const now = new Date().toISOString();
      await c.env.DB.prepare("UPDATE products SET status = 'INACTIVE', deletedAt = ?, updatedAt = ? WHERE id = ? AND shopId = ?").bind(now, now, c.req.param('id'), c.var.shopId).run();
      return c.json({ message: 'Deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/products/bulk-import', async (c) => {
    try {
      const products = await c.req.json() as any[];
      if (!Array.isArray(products) || !products.length) return c.json({ error: 'Array of products required' }, 400);
      const now = new Date().toISOString();
      const shopId = c.var.shopId;
      const inserts = products.map((p: any) => {
        const id = crypto.randomUUID();
        const finalSlug = p.slug || slugify(p.name, id);
        const imagesJson = p.images && Array.isArray(p.images) ? JSON.stringify(p.images) : null;
        return c.env.DB.prepare(
          `INSERT INTO products (id, name, slug, description, sku, barcode, categoryId, brandId, unitId, supplierId, purchasePrice, sellingPrice, compareAtPrice, taxRate, taxType, hsnCode, images, isFeatured, minStock, maxStock, warranty, hasVariants, status, shopId, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
        ).bind(id, p.name, finalSlug, p.description || null, p.sku || null, p.barcode || null, p.categoryId || null, p.brandId || null, p.unitId || null, p.supplierId || null, p.purchasePrice, p.sellingPrice, p.compareAtPrice ?? null, p.taxRate ?? null, p.taxType || null, p.hsnCode || null, imagesJson, p.isFeatured ? 1 : 0, p.minStock ?? null, p.maxStock ?? null, p.warranty ?? null, p.hasVariants ? 1 : 0, 'ACTIVE', shopId, now, now);
      });
      await c.env.DB.batch(inserts);
      return c.json({ message: `${inserts.length} products imported` }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/products/bulk-export', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT * FROM products WHERE shopId = ?').bind(c.var.shopId).all();
      return c.json({ data: results });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/products/search', async (c) => {
    try {
      const q = c.req.query('q') || '';
      if (!q) return c.json({ data: [] });
      const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
      const { results } = await c.env.DB.prepare(
        "SELECT id, name, sku, barcode, sellingPrice, purchasePrice, status FROM products WHERE shopId = ? AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?) AND status != 'INACTIVE' LIMIT ?"
      ).bind(c.var.shopId, `%${q}%`, `%${q}%`, `%${q}%`, limit).all();
      return c.json({ data: results });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/products/barcode/:barcode', async (c) => {
    try {
      const db = c.env.DB;
      const barcode = c.req.param('barcode');
      let product = await db.prepare("SELECT * FROM products WHERE barcode = ? AND shopId = ? AND status != 'INACTIVE'").bind(barcode, c.var.shopId).first() as any;
      if (product) return c.json({ data: product, source: 'product' });
      const variant = await db.prepare(
        'SELECT pv.*, p.id as productId, p.name as productName, p.sellingPrice as productPrice FROM product_variants pv JOIN products p ON p.id = pv.productId WHERE pv.barcode = ? AND pv.isActive = 1 AND p.shopId = ?'
      ).bind(barcode, c.var.shopId).first();
      if (variant) return c.json({ data: variant, source: 'variant' });
      return c.json({ error: 'Not found' }, 404);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/products/imei/:imei', async (c) => {
    try {
      const { results } = await c.env.DB.prepare(
        'SELECT ir.*, p.name as productName, p.sku as productSku FROM imei_records ir JOIN products p ON p.id = ir.productId WHERE ir.imei = ? AND p.shopId = ?'
      ).bind(c.req.param('imei'), c.var.shopId).all();
      if (!results.length) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: results[0] });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/products/status', async (c) => {
    try {
      const { ids, status } = await c.req.json();
      if (!Array.isArray(ids) || !ids.length || !status) return c.json({ error: 'ids array and status required' }, 400);
      const now = new Date().toISOString();
      const updates = ids.map((id: string) =>
        c.env.DB.prepare('UPDATE products SET status = ?, updatedAt = ? WHERE id = ? AND shopId = ?').bind(status, now, id, c.var.shopId)
      );
      await c.env.DB.batch(updates);
      return c.json({ message: `${updates.length} products updated` });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/products/price', async (c) => {
    try {
      const { ids, field, value } = await c.req.json();
      if (!Array.isArray(ids) || !ids.length || !field || value === undefined) return c.json({ error: 'ids, field, and value required' }, 400);
      if (!['sellingPrice', 'purchasePrice'].includes(field)) return c.json({ error: 'field must be sellingPrice or purchasePrice' }, 400);
      const now = new Date().toISOString();
      const updates = ids.map((id: string) =>
        c.env.DB.prepare(`UPDATE products SET ${field} = ?, updatedAt = ? WHERE id = ? AND shopId = ?`).bind(value, now, id, c.var.shopId)
      );
      await c.env.DB.batch(updates);
      return c.json({ message: `${updates.length} products updated` });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/products/images', async (c) => {
    try {
      const { productId, url, alt, isPrimary } = await c.req.json();
      if (!productId || !url) return c.json({ error: 'productId and url required' }, 400);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await c.env.DB.prepare('INSERT INTO product_images (id, productId, url, alt, isPrimary, createdAt) VALUES (?,?,?,?,?,?)').bind(id, productId, url, alt || null, isPrimary ? 1 : 0, now).run();
      return c.json({ data: { id, productId, url, alt: alt || null, isPrimary: isPrimary ? 1 : 0 } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/products/images/:id', async (c) => {
    try {
      const img = await c.env.DB.prepare('SELECT id FROM product_images WHERE id = ?').bind(c.req.param('id')).first();
      if (!img) return c.json({ error: 'Not found' }, 404);
      await c.env.DB.prepare('DELETE FROM product_images WHERE id = ?').bind(c.req.param('id')).run();
      return c.json({ message: 'Deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/products/history', async (c) => {
    try {
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await c.env.DB.prepare(
        'SELECT sm.*, p.name as productName, p.sku as productSku FROM stock_movements sm JOIN products p ON p.id = sm.productId WHERE p.shopId = ? ORDER BY sm.createdAt DESC LIMIT ? OFFSET ?'
      ).bind(c.var.shopId, limit, offset).all();
      const { results: countRes } = await c.env.DB.prepare(
        'SELECT COUNT(*) as total FROM stock_movements sm JOIN products p ON p.id = sm.productId WHERE p.shopId = ?'
      ).bind(c.var.shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== VARIANTS ====================

  app.post('/api/variants', async (c) => {
    try {
      const { productId, name, sku, barcode, price, costPrice, stockQty, attributes } = await c.req.json();
      if (!productId || !name || price === undefined) return c.json({ error: 'productId, name, and price required' }, 400);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await c.env.DB.prepare(
        'INSERT INTO product_variants (id, productId, name, sku, barcode, price, costPrice, stockQty, attributes, isActive, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,1,?,?)'
      ).bind(id, productId, name, sku || null, barcode || null, price, costPrice ?? null, stockQty ?? 0, attributes ? JSON.stringify(attributes) : null, now, now).run();
      return c.json({ data: { id, productId, name, sku: sku || null, barcode: barcode || null, price } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/variants', async (c) => {
    try {
      const productId = c.req.query('productId') || '';
      if (!productId) return c.json({ error: 'productId query param required' }, 400);
      const { results } = await c.env.DB.prepare('SELECT * FROM product_variants WHERE productId = ? AND isActive = 1').bind(productId).all();
      return c.json({ data: results });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/variants/:id', async (c) => {
    try {
      const body = await c.req.json();
      const allowed = ['name', 'sku', 'barcode', 'price', 'costPrice', 'stockQty', 'attributes', 'isActive'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) {
        if (body[k] !== undefined) {
          if (k === 'attributes') { sets.push(`${k} = ?`); vals.push(JSON.stringify(body[k])); }
          else { sets.push(`${k} = ?`); vals.push(body[k]); }
        }
      }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      vals.push(new Date().toISOString(), c.req.param('id'));
      await c.env.DB.prepare(`UPDATE product_variants SET ${sets.join(', ')}, updatedAt = ? WHERE id = ?`).bind(...vals).run();
      const variant = await c.env.DB.prepare('SELECT * FROM product_variants WHERE id = ?').bind(c.req.param('id')).first();
      return c.json({ data: variant });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/variants/:id', async (c) => {
    try {
      await c.env.DB.prepare('UPDATE product_variants SET isActive = 0, updatedAt = ? WHERE id = ?').bind(new Date().toISOString(), c.req.param('id')).run();
      return c.json({ message: 'Deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });
}
