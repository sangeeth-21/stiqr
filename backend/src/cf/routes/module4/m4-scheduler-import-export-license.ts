function slugify(name: string, id: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + id.slice(0, 8);
}

export function m4SchedulerImportExportLicenseRoutes(app: any) {

  // ==================== SCHEDULER & AUTOMATION ====================

  app.post('/api/scheduler', async (c) => {
    try {
      const db = c.env.DB;
      await db.exec(`CREATE TABLE IF NOT EXISTS scheduler_jobs (id TEXT PRIMARY KEY, shopId TEXT NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL, config TEXT, cron TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE', lastRunAt TEXT, nextRunAt TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL)`);
      const { name, type, config, cron } = await c.req.json();
      if (!name || !type || !cron) return c.json({ error: 'name, type, and cron required' }, 400);
      if (!['BACKUP', 'REPORT', 'NOTIFICATION', 'REMINDER', 'CLEANUP'].includes(type)) return c.json({ error: 'type must be BACKUP/REPORT/NOTIFICATION/REMINDER/CLEANUP' }, 400);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const nextRunAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await db.prepare('INSERT INTO scheduler_jobs (id, shopId, name, type, config, cron, status, nextRunAt, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id, c.var.shopId, name, type, config ? JSON.stringify(config) : null, cron, 'ACTIVE', nextRunAt, now, now).run();
      return c.json({ data: { id, name, type, config: config || null, cron, status: 'ACTIVE', nextRunAt } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/scheduler', async (c) => {
    try {
      const db = c.env.DB;
      await db.exec(`CREATE TABLE IF NOT EXISTS scheduler_jobs (id TEXT PRIMARY KEY, shopId TEXT NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL, config TEXT, cron TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE', lastRunAt TEXT, nextRunAt TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL)`);
      const type = c.req.query('type') || '';
      const status = c.req.query('status') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      let where = 'WHERE shopId = ?';
      const params: any[] = [c.var.shopId];
      if (type) { where += ' AND type = ?'; params.push(type); }
      if (status) { where += ' AND status = ?'; params.push(status); }
      const { results } = await db.prepare(`SELECT * FROM scheduler_jobs ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM scheduler_jobs ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/scheduler/:id', async (c) => {
    try {
      const db = c.env.DB;
      const { name, config, cron, status } = await c.req.json();
      const sets: string[] = [];
      const vals: any[] = [];
      if (name !== undefined) { sets.push('name = ?'); vals.push(name); }
      if (config !== undefined) { sets.push('config = ?'); vals.push(JSON.stringify(config)); }
      if (cron !== undefined) { sets.push('cron = ?'); vals.push(cron); }
      if (status !== undefined) { sets.push('status = ?'); vals.push(status); }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      let nextRunAtSet = '';
      if (cron !== undefined) {
        nextRunAtSet = ', nextRunAt = ?';
        vals.push(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
      }
      vals.push(new Date().toISOString(), c.req.param('id'), c.var.shopId);
      await db.prepare(`UPDATE scheduler_jobs SET ${sets.join(', ')}${nextRunAtSet}, updatedAt = ? WHERE id = ? AND shopId = ?`).bind(...vals).run();
      const job = await db.prepare('SELECT * FROM scheduler_jobs WHERE id = ?').bind(c.req.param('id')).first();
      if (!job) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: job });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/scheduler/:id', async (c) => {
    try {
      const db = c.env.DB;
      const job = await db.prepare('SELECT id FROM scheduler_jobs WHERE id = ? AND shopId = ?').bind(c.req.param('id'), c.var.shopId).first();
      if (!job) return c.json({ error: 'Not found' }, 404);
      await db.prepare('DELETE FROM scheduler_jobs WHERE id = ?').bind(c.req.param('id')).run();
      return c.json({ message: 'Deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/scheduler/history', async (c) => {
    try {
      const db = c.env.DB;
      await db.exec(`CREATE TABLE IF NOT EXISTS scheduler_job_logs (id TEXT PRIMARY KEY, jobId TEXT NOT NULL, status TEXT NOT NULL, output TEXT, startedAt TEXT, completedAt TEXT)`);
      const jobId = c.req.query('jobId') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      let where = 'WHERE 1=1';
      const params: any[] = [];
      if (jobId) { where += ' AND jobId = ?'; params.push(jobId); }
      const { results } = await db.prepare(`SELECT * FROM scheduler_job_logs ${where} ORDER BY startedAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM scheduler_job_logs ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== DATA IMPORT ====================

  app.post('/api/import/products', async (c) => {
    try {
      const db = c.env.DB;
      const { products } = await c.req.json();
      if (!Array.isArray(products) || !products.length) return c.json({ error: 'products array required' }, 400);
      const now = new Date().toISOString();
      const shopId = c.var.shopId;
      const errors: { index: number; error: string }[] = [];
      const inserts: any[] = [];
      for (let i = 0; i < products.length; i++) {
        const p = products[i];
        if (!p.name) { errors.push({ index: i, error: 'name required' }); continue; }
        if (p.sellingPrice === undefined) { errors.push({ index: i, error: 'sellingPrice required' }); continue; }
        if (p.purchasePrice === undefined) { errors.push({ index: i, error: 'purchasePrice required' }); continue; }
        const id = crypto.randomUUID();
        const slug = slugify(p.name, id);
        inserts.push(db.prepare(
          'INSERT INTO products (id, shopId, name, slug, description, sku, barcode, categoryId, brandId, unitId, supplierId, purchasePrice, sellingPrice, compareAtPrice, taxRate, taxType, hsnCode, images, isFeatured, minStock, maxStock, warranty, hasVariants, status, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        ).bind(id, shopId, p.name, slug, p.description || null, p.sku || null, p.barcode || null, p.categoryId || null, p.brandId || null, p.unitId || null, p.supplierId || null, p.purchasePrice, p.sellingPrice, p.compareAtPrice ?? null, p.taxRate ?? 0, p.taxType || 'GST', p.hsnCode || null, p.images ? JSON.stringify(p.images) : null, p.isFeatured ? 1 : 0, p.minStock ?? 0, p.maxStock ?? null, p.warranty ?? null, p.hasVariants ? 1 : 0, 'ACTIVE', now, now));
      }
      let imported = 0;
      if (inserts.length) {
        await db.batch(inserts);
        imported = inserts.length;
      }
      const failed = errors.length;
      return c.json({ imported, failed, errors }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/import/customers', async (c) => {
    try {
      const db = c.env.DB;
      const { customers } = await c.req.json();
      if (!Array.isArray(customers) || !customers.length) return c.json({ error: 'customers array required' }, 400);
      const now = new Date().toISOString();
      const shopId = c.var.shopId;
      const errors: { index: number; error: string }[] = [];
      const inserts: any[] = [];
      for (let i = 0; i < customers.length; i++) {
        const cu = customers[i];
        if (!cu.name) { errors.push({ index: i, error: 'name required' }); continue; }
        const id = crypto.randomUUID();
        inserts.push(db.prepare(
          'INSERT INTO customers (id, shopId, name, email, phone, address, notes, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?)'
        ).bind(id, shopId, cu.name, cu.email || null, cu.phone || null, cu.address || null, cu.notes || null, now, now));
      }
      let imported = 0;
      if (inserts.length) { await db.batch(inserts); imported = inserts.length; }
      return c.json({ imported, failed: errors.length, errors }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/import/suppliers', async (c) => {
    try {
      const db = c.env.DB;
      const { suppliers } = await c.req.json();
      if (!Array.isArray(suppliers) || !suppliers.length) return c.json({ error: 'suppliers array required' }, 400);
      const now = new Date().toISOString();
      const shopId = c.var.shopId;
      const errors: { index: number; error: string }[] = [];
      const inserts: any[] = [];
      for (let i = 0; i < suppliers.length; i++) {
        const s = suppliers[i];
        if (!s.name) { errors.push({ index: i, error: 'name required' }); continue; }
        const id = crypto.randomUUID();
        inserts.push(db.prepare(
          'INSERT INTO suppliers (id, shopId, name, email, phone, address, contactPerson, paymentTerms, bankDetails, notes, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
        ).bind(id, shopId, s.name, s.email || null, s.phone || null, s.address || null, s.contactPerson || null, s.paymentTerms || null, s.bankDetails || null, s.notes || null, now, now));
      }
      let imported = 0;
      if (inserts.length) { await db.batch(inserts); imported = inserts.length; }
      return c.json({ imported, failed: errors.length, errors }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/import/imei', async (c) => {
    try {
      const db = c.env.DB;
      const { imeis } = await c.req.json();
      if (!Array.isArray(imeis) || !imeis.length) return c.json({ error: 'imeis array required' }, 400);
      const now = new Date().toISOString();
      const shopId = c.var.shopId;
      const errors: { index: number; error: string }[] = [];
      const inserts: any[] = [];
      for (let i = 0; i < imeis.length; i++) {
        const im = imeis[i];
        if (!im.productId || !im.imei) { errors.push({ index: i, error: 'productId and imei required' }); continue; }
        const product = await db.prepare('SELECT id, shopId FROM products WHERE id = ? AND shopId = ?').bind(im.productId, shopId).first();
        if (!product) { errors.push({ index: i, error: `product ${im.productId} not found` }); continue; }
        const id = crypto.randomUUID();
        inserts.push(db.prepare(
          'INSERT INTO imei_records (id, productId, imei, serialNumber, status, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?)'
        ).bind(id, im.productId, im.imei, im.serialNumber || null, im.status || 'IN_STOCK', now, now));
      }
      let imported = 0;
      if (inserts.length) { await db.batch(inserts); imported = inserts.length; }
      return c.json({ imported, failed: errors.length, errors }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== DATA EXPORT ====================

  app.get('/api/export/products', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT * FROM products WHERE shopId = ?').bind(c.var.shopId).all();
      const data = results as any[];
      return c.json({ data, total: data.length, exportedAt: new Date().toISOString() });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/export/customers', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT * FROM customers WHERE shopId = ?').bind(c.var.shopId).all();
      const data = results as any[];
      return c.json({ data, total: data.length, exportedAt: new Date().toISOString() });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/export/suppliers', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT * FROM suppliers WHERE shopId = ?').bind(c.var.shopId).all();
      const data = results as any[];
      return c.json({ data, total: data.length, exportedAt: new Date().toISOString() });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/export/sales', async (c) => {
    try {
      const db = c.env.DB;
      const { results: sales } = await db.prepare('SELECT * FROM sales WHERE shopId = ? ORDER BY createdAt DESC').bind(c.var.shopId).all();
      const data = sales as any[];
      for (const sale of data) {
        const { results: items } = await db.prepare('SELECT si.*, p.name as productName, p.sku as productSku FROM sale_items si JOIN products p ON p.id = si.productId WHERE si.saleId = ?').bind(sale.id).all();
        sale.items = items;
      }
      return c.json({ data, total: data.length, exportedAt: new Date().toISOString() });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/export/services', async (c) => {
    try {
      const db = c.env.DB;
      const { results: services } = await db.prepare('SELECT * FROM service_repairs WHERE shopId = ? ORDER BY createdAt DESC').bind(c.var.shopId).all();
      const data = services as any[];
      for (const sr of data) {
        const { results: items } = await db.prepare('SELECT * FROM service_repair_items WHERE serviceRepairId = ?').bind(sr.id).all();
        sr.items = items;
      }
      return c.json({ data, total: data.length, exportedAt: new Date().toISOString() });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/export/inventory', async (c) => {
    try {
      const { results } = await c.env.DB.prepare(
        'SELECT s.*, p.name as productName, p.sku as productSku FROM stock s JOIN products p ON p.id = s.productId WHERE p.shopId = ?'
      ).bind(c.var.shopId).all();
      const data = results as any[];
      return c.json({ data, total: data.length, exportedAt: new Date().toISOString() });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== LICENSE & FEATURE MANAGEMENT ====================

  app.get('/api/license', async (c) => {
    try {
      await c.env.DB.exec('CREATE TABLE IF NOT EXISTS licenses (id TEXT PRIMARY KEY, shopId TEXT NOT NULL, licenseKey TEXT NOT NULL, plan TEXT NOT NULL, status TEXT NOT NULL DEFAULT \'ACTIVE\', activatedAt TEXT, expiresAt TEXT, createdAt TEXT NOT NULL)');
      await c.env.DB.exec('CREATE TABLE IF NOT EXISTS license_features (id TEXT PRIMARY KEY, licenseId TEXT NOT NULL, featureKey TEXT NOT NULL, featureValue TEXT, isEnabled INTEGER NOT NULL DEFAULT 1)');
      const license = await c.env.DB.prepare('SELECT * FROM licenses WHERE shopId = ? ORDER BY createdAt DESC LIMIT 1').bind(c.var.shopId).first();
      if (!license) return c.json({ data: null, message: 'No license found' });
      return c.json({ data: license });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  async function ensureLicenseTables(db: any) {
    await db.exec('CREATE TABLE IF NOT EXISTS licenses (id TEXT PRIMARY KEY, shopId TEXT NOT NULL, licenseKey TEXT NOT NULL, plan TEXT NOT NULL, status TEXT NOT NULL DEFAULT \'ACTIVE\', activatedAt TEXT, expiresAt TEXT, createdAt TEXT NOT NULL)');
    await db.exec('CREATE TABLE IF NOT EXISTS license_features (id TEXT PRIMARY KEY, licenseId TEXT NOT NULL, featureKey TEXT NOT NULL, featureValue TEXT, isEnabled INTEGER NOT NULL DEFAULT 1)');
  }

  app.get('/api/license/features', async (c) => {
    try {
      const db = c.env.DB;
      await ensureLicenseTables(db);
      const license = await db.prepare('SELECT id FROM licenses WHERE shopId = ? ORDER BY createdAt DESC LIMIT 1').bind(c.var.shopId).first() as any;
      if (!license) return c.json({ data: [] });
      const { results } = await db.prepare('SELECT * FROM license_features WHERE licenseId = ?').bind(license.id).all();
      return c.json({ data: results });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/license/features', async (c) => {
    try {
      const db = c.env.DB;
      await ensureLicenseTables(db);
      const { features } = await c.req.json();
      if (!features || typeof features !== 'object') return c.json({ error: 'features object required' }, 400);
      const license = await db.prepare('SELECT id FROM licenses WHERE shopId = ? ORDER BY createdAt DESC LIMIT 1').bind(c.var.shopId).first() as any;
      if (!license) return c.json({ error: 'No license found' }, 404);
      const upserts: any[] = [];
      for (const [key, value] of Object.entries(features)) {
        const existing = await db.prepare('SELECT id FROM license_features WHERE licenseId = ? AND featureKey = ?').bind(license.id, key).first() as any;
        if (existing) {
          upserts.push(db.prepare('UPDATE license_features SET featureValue = ?, isEnabled = ? WHERE id = ?').bind(String(value), value !== false && value !== null ? 1 : 0, existing.id));
        } else {
          const id = crypto.randomUUID();
          upserts.push(db.prepare('INSERT INTO license_features (id, licenseId, featureKey, featureValue, isEnabled) VALUES (?,?,?,?,?)').bind(id, license.id, key, String(value), value !== false && value !== null ? 1 : 0));
        }
      }
      if (upserts.length) await db.batch(upserts);
      const { results } = await db.prepare('SELECT * FROM license_features WHERE licenseId = ?').bind(license.id).all();
      return c.json({ data: results });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/license/usage', async (c) => {
    try {
      const db = c.env.DB;
      await ensureLicenseTables(db);
      const shopId = c.var.shopId;
      const [prodRes, custRes, salesRes, storageRes, license] = await Promise.all([
        db.prepare('SELECT COUNT(*) as total FROM products WHERE shopId = ?').bind(shopId).first(),
        db.prepare('SELECT COUNT(*) as total FROM customers WHERE shopId = ?').bind(shopId).first(),
        db.prepare('SELECT COUNT(*) as total FROM sales WHERE shopId = ?').bind(shopId).first(),
        db.prepare('SELECT COALESCE(SUM(size), 0) as total FROM uploaded_files').first(),
        db.prepare('SELECT * FROM licenses WHERE shopId = ? ORDER BY createdAt DESC LIMIT 1').bind(shopId).first() as any,
      ]);
      const usage = {
        products: { used: (prodRes as any)?.total || 0, limit: 50000 },
        customers: { used: (custRes as any)?.total || 0, limit: 50000 },
        sales: { used: (salesRes as any)?.total || 0, limit: 100000 },
        storage: { used: (storageRes as any)?.total || 0, limit: 1073741824 },
      };
      return c.json({ data: { usage, plan: license?.plan || 'FREE', status: license?.status || 'NONE' } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/license/storage', async (c) => {
    try {
      const db = c.env.DB;
      const [filesRes, sizeRes] = await Promise.all([
        db.prepare('SELECT COUNT(*) as total FROM uploaded_files').first(),
        db.prepare('SELECT COALESCE(SUM(size), 0) as total FROM uploaded_files').first(),
      ]);
      const totalFiles = (filesRes as any)?.total || 0;
      const totalSize = (sizeRes as any)?.total || 0;
      return c.json({ data: { totalFiles, totalSize, used: totalSize, limit: 1073741824 } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/license/devices', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const [imeiRes, posRes] = await Promise.all([
        db.prepare('SELECT COUNT(*) as total FROM imei_records ir JOIN products p ON p.id = ir.productId WHERE p.shopId = ?').bind(shopId).first(),
        db.prepare('SELECT COUNT(*) as total FROM pos_sessions WHERE shopId = ?').bind(shopId).first(),
      ]);
      return c.json({
        data: {
          imeiRecords: (imeiRes as any)?.total || 0,
          posDevices: (posRes as any)?.total || 0,
          activeSessions: 0,
        },
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== AUDIT & ACTIVITY ====================

  app.get('/api/audit/user/:userId', async (c) => {
    try {
      const db = c.env.DB;
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await db.prepare('SELECT * FROM audit_trails WHERE userId = ? AND shopId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?').bind(c.req.param('userId'), c.var.shopId, limit, offset).all();
      const { results: countRes } = await db.prepare('SELECT COUNT(*) as total FROM audit_trails WHERE userId = ? AND shopId = ?').bind(c.req.param('userId'), c.var.shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/audit/module/:module', async (c) => {
    try {
      const db = c.env.DB;
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await db.prepare('SELECT * FROM audit_trails WHERE resource = ? AND shopId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?').bind(c.req.param('module'), c.var.shopId, limit, offset).all();
      const { results: countRes } = await db.prepare('SELECT COUNT(*) as total FROM audit_trails WHERE resource = ? AND shopId = ?').bind(c.req.param('module'), c.var.shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/activity/user/:id', async (c) => {
    try {
      const db = c.env.DB;
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await db.prepare('SELECT * FROM audit_logs WHERE userId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?').bind(c.req.param('id'), limit, offset).all();
      const { results: countRes } = await db.prepare('SELECT COUNT(*) as total FROM audit_logs WHERE userId = ?').bind(c.req.param('id')).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/activity/cleanup', async (c) => {
    try {
      const db = c.env.DB;
      const days = parseInt(c.req.query('days') || '90');
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { results: countRes } = await db.prepare('SELECT COUNT(*) as total FROM audit_logs WHERE createdAt < ?').bind(cutoff).all();
      const total = (countRes as any)[0]?.total || 0;
      await db.prepare('DELETE FROM audit_logs WHERE createdAt < ?').bind(cutoff).run();
      return c.json({ message: `Deleted ${total} activity log(s) older than ${days} days` });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/license/activate', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { licenseKey, plan } = await c.req.json();
      if (!licenseKey || !plan) return c.json({ error: 'licenseKey and plan required' }, 400);
      const now = new Date().toISOString();
      await ensureLicenseTables(db);
      const expiresAt = new Date(Date.now() + 365 * 86400000).toISOString();
      const id = crypto.randomUUID();
      await db.prepare("INSERT INTO licenses (id, shopId, licenseKey, plan, status, activatedAt, expiresAt, createdAt) VALUES (?,?,?,?,'ACTIVE',?,?,?)").bind(id, shopId, licenseKey, plan, now, expiresAt, now).run();
      return c.json({ data: { id, licenseKey, plan, status: 'ACTIVE', activatedAt: now, expiresAt } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/license/validate', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { licenseKey } = await c.req.json();
      if (!licenseKey) return c.json({ error: 'licenseKey required' }, 400);
      await ensureLicenseTables(db);
      const license = await db.prepare("SELECT * FROM licenses WHERE licenseKey = ? AND shopId = ? ORDER BY createdAt DESC LIMIT 1").bind(licenseKey, shopId).first() as any;
      if (!license) return c.json({ valid: false, message: 'License key not found' });
      const now = new Date().toISOString();
      const expired = license.expiresAt && license.expiresAt < now;
      if (expired || license.status !== 'ACTIVE') return c.json({ valid: false, message: expired ? 'License expired' : 'License not active', status: license.status });
      return c.json({ valid: true, data: { plan: license.plan, status: license.status, activatedAt: license.activatedAt, expiresAt: license.expiresAt } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/import/templates', async (c) => {
    try {
      const templates = [
        { type: 'products', label: 'Products Import', fields: ['name', 'sku', 'category', 'brand', 'costPrice', 'sellingPrice', 'quantity', 'minStock', 'description'], sample: 'https://stiqr-backend.ksangeeth76.workers.dev/templates/products.csv' },
        { type: 'customers', label: 'Customers Import', fields: ['name', 'email', 'phone', 'address', 'city', 'state', 'gstin'], sample: 'https://stiqr-backend.ksangeeth76.workers.dev/templates/customers.csv' },
        { type: 'suppliers', label: 'Suppliers Import', fields: ['name', 'contactPerson', 'email', 'phone', 'address', 'gstin'], sample: 'https://stiqr-backend.ksangeeth76.workers.dev/templates/suppliers.csv' },
        { type: 'imei', label: 'IMEI Import', fields: ['imei', 'productSku', 'productName', 'status', 'location'], sample: 'https://stiqr-backend.ksangeeth76.workers.dev/templates/imei.csv' },
      ];
      return c.json({ data: templates });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });
}
