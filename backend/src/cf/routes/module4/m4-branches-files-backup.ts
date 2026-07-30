export function m4BranchesFilesBackupRoutes(app: any) {
  // ─── Branch Management ──────────────────────────────────────────

  app.post('/api/branches', async (c) => {
    try {
      const { name, code, address, phone, email } = await c.req.json();
      if (!name) return c.json({ error: 'name is required' }, 400);
      const shopId = c.var.shopId;
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const { results: countRes } = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM branches WHERE shopId = ? AND deletedAt IS NULL').bind(shopId).all();
      const isDefault = (countRes as any)[0]?.cnt === 0 ? 1 : 0;
      await c.env.DB.prepare('INSERT INTO branches (id, shopId, name, code, address, phone, email, isActive, isDefault, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,1,?,?,?)').bind(id, shopId, name, code || null, address || null, phone || null, email || null, isDefault, now, now).run();
      const branch = await c.env.DB.prepare('SELECT * FROM branches WHERE id = ?').bind(id).first();
      return c.json({ data: branch }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/branches', async (c) => {
    try {
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await c.env.DB.prepare('SELECT * FROM branches WHERE shopId = ? AND deletedAt IS NULL ORDER BY createdAt DESC LIMIT ? OFFSET ?').bind(c.var.shopId, limit, offset).all();
      const { results: countRes } = await c.env.DB.prepare('SELECT COUNT(*) as total FROM branches WHERE shopId = ? AND deletedAt IS NULL').bind(c.var.shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/branches/transfer-stock', async (c) => {
    try {
      const { fromBranchId, toBranchId, productId, quantity } = await c.req.json();
      if (!fromBranchId || !toBranchId || !productId || !quantity) return c.json({ error: 'fromBranchId, toBranchId, productId, quantity required' }, 400);
      const shopId = c.var.shopId;
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const outMovementId = crypto.randomUUID();
      const inMovementId = crypto.randomUUID();
      await c.env.DB.batch([
        c.env.DB.prepare('CREATE TABLE IF NOT EXISTS branch_stock_transfers (id TEXT PRIMARY KEY, shopId TEXT, fromBranchId TEXT, toBranchId TEXT, productId TEXT, quantity INTEGER, status TEXT DEFAULT \'PENDING\', createdAt TEXT)').bind(),
        c.env.DB.prepare('INSERT INTO branch_stock_transfers (id, shopId, fromBranchId, toBranchId, productId, quantity, status, createdAt) VALUES (?,?,?,?,?,?,?,?)').bind(id, shopId, fromBranchId, toBranchId, productId, quantity, 'COMPLETED', now),
        c.env.DB.prepare('INSERT INTO stock_movements (id, productId, warehouseId, quantity, type, reference, notes, createdBy, createdAt) VALUES (?,?,?,?,?,?,?,?,?)').bind(outMovementId, productId, fromBranchId, -quantity, 'TRANSFER_OUT', id, `Transfer to branch ${toBranchId}`, c.var.userId, now),
        c.env.DB.prepare('INSERT INTO stock_movements (id, productId, warehouseId, quantity, type, reference, notes, createdBy, createdAt) VALUES (?,?,?,?,?,?,?,?,?)').bind(inMovementId, productId, toBranchId, quantity, 'TRANSFER_IN', id, `Transfer from branch ${fromBranchId}`, c.var.userId, now),
      ]);
      return c.json({ data: { id, fromBranchId, toBranchId, productId, quantity, status: 'COMPLETED' } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/branches/performance', async (c) => {
    try {
      const shopId = c.var.shopId;
      const { results } = await c.env.DB.prepare(`SELECT
        b.id, b.name, b.code,
        COALESCE(s.totalSales, 0) as totalSales,
        COALESCE(e.totalExpenses, 0) as totalExpenses,
        COALESCE(sr.totalServices, 0) as totalServices
        FROM branches b
        LEFT JOIN (SELECT branchId, SUM(total) as totalSales FROM sales WHERE shopId = ? GROUP BY branchId) s ON b.id = s.branchId
        LEFT JOIN (SELECT branchId, SUM(amount) as totalExpenses FROM expenses WHERE shopId = ? GROUP BY branchId) e ON b.id = e.branchId
        LEFT JOIN (SELECT branchId, COUNT(*) as totalServices FROM service_repairs WHERE shopId = ? GROUP BY branchId) sr ON b.id = sr.branchId
        WHERE b.shopId = ? AND b.deletedAt IS NULL
        ORDER BY b.name ASC`).bind(shopId, shopId, shopId, shopId).all();
      return c.json({ data: results });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/branches/inventory', async (c) => {
    try {
      const shopId = c.var.shopId;
      const { results } = await c.env.DB.prepare(`SELECT
        b.id, b.name, b.code,
        COALESCE(COUNT(DISTINCT s.productId), 0) as productCount,
        COALESCE(SUM(s.quantity * p.purchasePrice), 0) as stockValue
        FROM branches b
        LEFT JOIN stock s ON s.warehouseId = b.id
        LEFT JOIN products p ON s.productId = p.id AND p.shopId = ?
        WHERE b.shopId = ? AND b.deletedAt IS NULL
        GROUP BY b.id
        ORDER BY b.name ASC`).bind(shopId, shopId).all();
      return c.json({ data: results });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/branches/:id', async (c) => {
    try {
      const branch = await c.env.DB.prepare('SELECT * FROM branches WHERE id = ? AND shopId = ? AND deletedAt IS NULL').bind(c.req.param('id'), c.var.shopId).first();
      if (!branch) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: branch });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/branches/:id', async (c) => {
    try {
      const body = await c.req.json();
      const allowed = ['name', 'code', 'address', 'phone', 'email', 'isActive', 'isDefault', 'managerId'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) { if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); } }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      vals.push(new Date().toISOString(), c.req.param('id'), c.var.shopId);
      await c.env.DB.prepare(`UPDATE branches SET ${sets.join(', ')}, updatedAt = ? WHERE id = ? AND shopId = ?`).bind(...vals).run();
      const updated = await c.env.DB.prepare('SELECT * FROM branches WHERE id = ?').bind(c.req.param('id')).first();
      return c.json({ data: updated });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/branches/:id', async (c) => {
    try {
      const now = new Date().toISOString();
      const { results } = await c.env.DB.prepare('UPDATE branches SET deletedAt = ? WHERE id = ? AND shopId = ?').bind(now, c.req.param('id'), c.var.shopId).run();
      return c.json({ message: 'Deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ─── File Manager ───────────────────────────────────────────────

  app.post('/api/files', async (c) => {
    try {
      const { filename, url, type, size } = await c.req.json();
      if (!filename || !url) return c.json({ error: 'filename, url required' }, 400);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await c.env.DB.prepare('INSERT INTO uploaded_files (id, originalName, fileName, mimeType, size, path, url, uploadedBy, createdAt) VALUES (?,?,?,?,?,?,?,?,?)').bind(id, filename, filename, type || 'application/octet-stream', size || 0, url, url, c.var.userId, now).run();
      const file = await c.env.DB.prepare('SELECT * FROM uploaded_files WHERE id = ?').bind(id).first();
      return c.json({ data: file }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/files', async (c) => {
    try {
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await c.env.DB.prepare('SELECT * FROM uploaded_files WHERE deletedAt IS NULL ORDER BY createdAt DESC LIMIT ? OFFSET ?').bind(limit, offset).all();
      const { results: countRes } = await c.env.DB.prepare('SELECT COUNT(*) as total FROM uploaded_files WHERE deletedAt IS NULL').bind().all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/files/:id', async (c) => {
    try {
      const file = await c.env.DB.prepare('SELECT * FROM uploaded_files WHERE id = ? AND deletedAt IS NULL').bind(c.req.param('id')).first();
      if (!file) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: file });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/files/:id', async (c) => {
    try {
      const now = new Date().toISOString();
      await c.env.DB.prepare('UPDATE uploaded_files SET deletedAt = ? WHERE id = ?').bind(now, c.req.param('id')).run();
      return c.json({ message: 'Deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/files/:id', async (c) => {
    try {
      const body = await c.req.json();
      const sets: string[] = []; const vals: any[] = [];
      if (body.filename !== undefined) { sets.push('fileName = ?', 'originalName = ?'); vals.push(body.filename, body.filename); }
      if (body.type !== undefined) { sets.push('mimeType = ?'); vals.push(body.type); }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      vals.push(c.req.param('id'));
      await c.env.DB.prepare(`UPDATE uploaded_files SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
      const updated = await c.env.DB.prepare('SELECT * FROM uploaded_files WHERE id = ?').bind(c.req.param('id')).first();
      return c.json({ data: updated });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ─── Backup & Restore ───────────────────────────────────────────

  app.post('/api/backup/restore', async (c) => {
    try {
      const { backupId } = await c.req.json();
      if (!backupId) return c.json({ error: 'backupId required' }, 400);
      const shopId = c.var.shopId;
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      await c.env.DB.prepare('CREATE TABLE IF NOT EXISTS restores (id TEXT PRIMARY KEY, shopId TEXT, backupId TEXT, status TEXT DEFAULT \'PENDING\', createdAt TEXT)').bind().run();
      await c.env.DB.batch([
        c.env.DB.prepare('UPDATE backup_records SET status = ? WHERE id = ? AND shopId = ?').bind('RESTORING', backupId, shopId),
        c.env.DB.prepare('INSERT INTO restores (id, shopId, backupId, status, createdAt) VALUES (?,?,?,?,?)').bind(id, shopId, backupId, 'RESTORED', now),
      ]);
      return c.json({ data: { id, backupId, status: 'RESTORED' } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/backup/history', async (c) => {
    try {
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results: backup_records } = await c.env.DB.prepare('SELECT * FROM backup_records WHERE shopId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?').bind(c.var.shopId, limit, offset).all();
      const { results: countRes } = await c.env.DB.prepare('SELECT COUNT(*) as total FROM backup_records WHERE shopId = ?').bind(c.var.shopId).all();
      const backupIds = (backup_records as any[]).map(b => b.id);
      let restores: any[] = [];
      if (backupIds.length) {
        const placeholders = backupIds.map(() => '?').join(',');
        const { results: r } = await c.env.DB.prepare(`SELECT * FROM restores WHERE backupId IN (${placeholders}) ORDER BY createdAt DESC`).bind(...backupIds).all();
        restores = r as any[];
      }
      return c.json({ data: { backup_records, restores }, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/backup', async (c) => {
    try {
      let type = 'FULL';
      try { const body = await c.req.json(); type = body.type || 'FULL'; } catch { /* no body, use default */ }
      const shopId = c.var.shopId;
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const dateStr = now.slice(0, 10);
      await c.env.DB.prepare('CREATE TABLE IF NOT EXISTS backup_records (id TEXT PRIMARY KEY, shopId TEXT, filename TEXT, size REAL, type TEXT, status TEXT DEFAULT \'PENDING\', createdAt TEXT)').run();
      const filename = `backup-${shopId}-${dateStr}.sql`;
      await c.env.DB.prepare('INSERT INTO backup_records (id, shopId, filename, size, type, status, createdAt) VALUES (?,?,?,?,?,?,?)').bind(id, shopId, filename, 0, type || 'FULL', 'COMPLETED', now).run();
      const backup = await c.env.DB.prepare('SELECT * FROM backup_records WHERE id = ?').bind(id).first();
      return c.json({ data: backup }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/backup', async (c) => {
    try {
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await c.env.DB.prepare('SELECT * FROM backup_records WHERE shopId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?').bind(c.var.shopId, limit, offset).all();
      const { results: countRes } = await c.env.DB.prepare('SELECT COUNT(*) as total FROM backup_records WHERE shopId = ?').bind(c.var.shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/backup/:id', async (c) => {
    try {
      await c.env.DB.prepare('DELETE FROM backup_records WHERE id = ? AND shopId = ?').bind(c.req.param('id'), c.var.shopId).run();
      return c.json({ message: 'Deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/files/download/:id', async (c) => {
    try {
      const db = c.env.DB;
      const file = await db.prepare("SELECT * FROM uploaded_files WHERE id = ?").bind(c.req.param('id')).first();
      if (!file) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: { ...(file as any), downloadUrl: `https://stiqr-backend.ksangeeth76.workers.dev/api/upload/${file.id}` } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/branches/:id/settings', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const body = await c.req.json();
      const allowed = ['name', 'address', 'phone', 'email', 'manager', 'status', 'openingTime', 'closingTime'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) { if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); } }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      vals.push(new Date().toISOString(), c.req.param('id'), shopId);
      await db.prepare(`UPDATE branches SET ${sets.join(', ')}, updatedAt = ? WHERE id = ? AND shopId = ?`).bind(...vals).run();
      return c.json({ message: 'Updated' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/backup/settings', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      await db.prepare("CREATE TABLE IF NOT EXISTS backup_settings (id TEXT PRIMARY KEY, shopId TEXT NOT NULL, frequency TEXT DEFAULT 'DAILY', retentionDays INTEGER DEFAULT 30, includeFiles INTEGER DEFAULT 1, includeDatabase INTEGER DEFAULT 1, time TEXT DEFAULT '02:00', createdAt TEXT, updatedAt TEXT)").run();
      let settings = await db.prepare("SELECT * FROM backup_settings WHERE shopId = ? ORDER BY createdAt DESC LIMIT 1").bind(shopId).first();
      if (!settings) {
        const id = crypto.randomUUID(); const now = new Date().toISOString();
        await db.prepare("INSERT INTO backup_settings (id, shopId, frequency, retentionDays, includeFiles, includeDatabase, time, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?)").bind(id, shopId, 'DAILY', 30, 1, 1, '02:00', now, now).run();
        settings = await db.prepare("SELECT * FROM backup_settings WHERE id = ?").bind(id).first();
      }
      return c.json({ data: settings });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/backup/settings', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { frequency, retentionDays, includeFiles, includeDatabase, time } = await c.req.json();
      const now = new Date().toISOString();
      await db.prepare("CREATE TABLE IF NOT EXISTS backup_settings (id TEXT PRIMARY KEY, shopId TEXT NOT NULL, frequency TEXT DEFAULT 'DAILY', retentionDays INTEGER DEFAULT 30, includeFiles INTEGER DEFAULT 1, includeDatabase INTEGER DEFAULT 1, time TEXT DEFAULT '02:00', createdAt TEXT, updatedAt TEXT)").run();
      const existing = await db.prepare("SELECT id FROM backup_settings WHERE shopId = ? ORDER BY createdAt DESC LIMIT 1").bind(shopId).first() as any;
      if (existing) {
        await db.prepare("UPDATE backup_settings SET frequency = ?, retentionDays = ?, includeFiles = ?, includeDatabase = ?, time = ?, updatedAt = ? WHERE id = ?").bind(frequency || 'DAILY', retentionDays ?? 30, includeFiles ?? 1, includeDatabase ?? 1, time || '02:00', now, existing.id).run();
      } else {
        const id = crypto.randomUUID();
        await db.prepare("INSERT INTO backup_settings (id, shopId, frequency, retentionDays, includeFiles, includeDatabase, time, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?)").bind(id, shopId, frequency || 'DAILY', retentionDays ?? 30, includeFiles ?? 1, includeDatabase ?? 1, time || '02:00', now, now).run();
      }
      const settings = await db.prepare("SELECT * FROM backup_settings WHERE shopId = ? ORDER BY createdAt DESC LIMIT 1").bind(shopId).first();
      return c.json({ data: settings });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });
}
