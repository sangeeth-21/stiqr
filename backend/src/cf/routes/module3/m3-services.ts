async function ensureServiceTables(db: any) {
  const tables = [
    `CREATE TABLE IF NOT EXISTS job_cards (id TEXT PRIMARY KEY, shopId TEXT NOT NULL, serviceRepairId TEXT, jobNumber TEXT NOT NULL, deviceType TEXT, deviceBrand TEXT, deviceModel TEXT, imei TEXT, issueDescription TEXT, customerNotes TEXT, accessoriesList TEXT, assignedTo TEXT, status TEXT DEFAULT 'PENDING', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS device_checkins (id TEXT PRIMARY KEY, shopId TEXT NOT NULL, serviceRepairId TEXT, imei TEXT, serialNumber TEXT, physicalCondition TEXT, accessoriesReceived TEXT, hasPasswordLock INTEGER DEFAULT 0, screenCondition TEXT, cameraCondition TEXT, batteryCondition TEXT, waterDamage INTEGER DEFAULT 0, faceIdStatus TEXT, fingerprintStatus TEXT, notes TEXT, createdBy TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS device_checkin_photos (id TEXT PRIMARY KEY, deviceCheckinId TEXT NOT NULL, url TEXT NOT NULL, type TEXT, createdAt TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS estimates (id TEXT PRIMARY KEY, shopId TEXT NOT NULL, serviceRepairId TEXT, estimateNumber TEXT NOT NULL, laborCharges REAL DEFAULT 0, sparePartsCost REAL DEFAULT 0, tax REAL DEFAULT 0, discount REAL DEFAULT 0, total REAL DEFAULT 0, status TEXT DEFAULT 'PENDING', customerApproved INTEGER DEFAULT 0, notes TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS approvals (id TEXT PRIMARY KEY, shopId TEXT NOT NULL, serviceRepairId TEXT, type TEXT NOT NULL, status TEXT DEFAULT 'PENDING', requestedBy TEXT, approvedBy TEXT, notes TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS service_invoices (id TEXT PRIMARY KEY, shopId TEXT NOT NULL, serviceRepairId TEXT, invoiceNumber TEXT NOT NULL, laborCharges REAL DEFAULT 0, sparePartsCost REAL DEFAULT 0, tax REAL DEFAULT 0, discount REAL DEFAULT 0, total REAL DEFAULT 0, paid REAL DEFAULT 0, due REAL DEFAULT 0, status TEXT DEFAULT 'PENDING', notes TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS communications (id TEXT PRIMARY KEY, shopId TEXT NOT NULL, serviceRepairId TEXT, type TEXT NOT NULL, channel TEXT NOT NULL, recipient TEXT NOT NULL, message TEXT NOT NULL, status TEXT DEFAULT 'SENT', createdAt TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS deliveries (id TEXT PRIMARY KEY, shopId TEXT NOT NULL, serviceRepairId TEXT, deliveredTo TEXT, relationship TEXT, signature TEXT, notes TEXT, status TEXT DEFAULT 'PENDING', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS service_payments (id TEXT PRIMARY KEY, shopId TEXT NOT NULL, serviceRepairId TEXT, serviceInvoiceId TEXT, amount REAL NOT NULL, method TEXT DEFAULT 'CASH', reference TEXT, status TEXT DEFAULT 'COMPLETED', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS service_timelines (id TEXT PRIMARY KEY, shopId TEXT NOT NULL, serviceRepairId TEXT NOT NULL, action TEXT NOT NULL, description TEXT, performedBy TEXT, createdAt TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS credit_notes (id TEXT PRIMARY KEY, shopId TEXT NOT NULL, serviceRepairId TEXT, serviceInvoiceId TEXT, creditNoteNumber TEXT NOT NULL, amount REAL DEFAULT 0, reason TEXT, status TEXT DEFAULT 'ACTIVE', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL)`
  ];
  for (const sql of tables) { await db.prepare(sql).run(); }
}

function padNum(n: number, len: number = 4): string {
  return String(n).padStart(len, '0');
}

async function generateTicketNumber(db: any, shopId: string): Promise<string> {
  const now = new Date(); const y = now.getFullYear(); const m = String(now.getMonth() + 1).padStart(2, '0'); const d = String(now.getDate()).padStart(2, '0');
  const { results } = await db.prepare("SELECT COUNT(*) as cnt FROM service_repairs WHERE shopId = ? AND date(createdAt) = date('now')").bind(shopId).all();
  const cnt = ((results as any)[0]?.cnt || 0) + 1;
  return `SRV-${y}${m}${d}-${padNum(cnt)}`;
}

async function generateJobNumber(db: any, shopId: string): Promise<string> {
  const now = new Date(); const y = now.getFullYear(); const m = String(now.getMonth() + 1).padStart(2, '0'); const d = String(now.getDate()).padStart(2, '0');
  const { results } = await db.prepare("SELECT COUNT(*) as cnt FROM job_cards WHERE shopId = ? AND date(createdAt) = date('now')").bind(shopId).all();
  const cnt = ((results as any)[0]?.cnt || 0) + 1;
  return `JC-${y}${m}${d}-${padNum(cnt)}`;
}

async function generateEstimateNumber(db: any, shopId: string): Promise<string> {
  const now = new Date(); const y = now.getFullYear(); const m = String(now.getMonth() + 1).padStart(2, '0'); const d = String(now.getDate()).padStart(2, '0');
  const { results } = await db.prepare("SELECT COUNT(*) as cnt FROM estimates WHERE shopId = ? AND date(createdAt) = date('now')").bind(shopId).all();
  const cnt = ((results as any)[0]?.cnt || 0) + 1;
  return `EST-${y}${m}${d}-${padNum(cnt)}`;
}

async function generateInvoiceNumber(db: any, shopId: string): Promise<string> {
  const now = new Date(); const y = now.getFullYear(); const m = String(now.getMonth() + 1).padStart(2, '0'); const d = String(now.getDate()).padStart(2, '0');
  const { results } = await db.prepare("SELECT COUNT(*) as cnt FROM service_invoices WHERE shopId = ? AND date(createdAt) = date('now')").bind(shopId).all();
  const cnt = ((results as any)[0]?.cnt || 0) + 1;
  return `INV-SRV-${y}${m}${d}-${padNum(cnt)}`;
}

async function addTimelineEntry(db: any, shopId: string, serviceRepairId: string, action: string, description: string | null, performedBy: string | null) {
  const id = crypto.randomUUID(); const now = new Date().toISOString();
  await db.prepare('INSERT INTO service_timelines (id, shopId, serviceRepairId, action, description, performedBy, createdAt) VALUES (?,?,?,?,?,?,?)').bind(id, shopId, serviceRepairId, action, description, performedBy, now).run();
}

export function servicesRoutes(app: any) {

  // ==================== 1. SERVICE TICKET MANAGEMENT ====================

  app.post('/api/services', async (c) => {
    try {
      await ensureServiceTables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const { customerId, branchId, deviceType, deviceBrand, deviceModel, imei, issueDescription, estimatedCost, deliveryDate, notes } = await c.req.json();
      if (!deviceType || !issueDescription) return c.json({ error: 'deviceType and issueDescription required' }, 400);
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      const ticketNumber = await generateTicketNumber(db, shopId);
      await db.prepare('INSERT INTO service_repairs (id, shopId, customerId, branchId, ticketNumber, deviceType, deviceBrand, deviceModel, imei, issueDescription, status, estimatedCost, deliveryDate, notes, createdBy, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id, shopId, customerId || null, branchId || null, ticketNumber, deviceType, deviceBrand || null, deviceModel || null, imei || null, issueDescription, 'RECEIVED', estimatedCost || null, deliveryDate || null, notes || null, c.var.userId, now, now).run();
      await addTimelineEntry(db, shopId, id, 'CREATED', 'Service ticket created', c.var.userId);
      return c.json({ data: { id, ticketNumber, customerId, deviceType, deviceBrand, deviceModel, imei, issueDescription, status: 'RECEIVED', estimatedCost, deliveryDate, notes, createdBy: c.var.userId, createdAt: now, updatedAt: now } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/services', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const search = c.req.query('search') || ''; const status = c.req.query('status') || ''; const customerId = c.req.query('customerId') || '';
      const fromDate = c.req.query('fromDate') || ''; const toDate = c.req.query('toDate') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      let where = 'WHERE s.shopId = ?'; const params: any[] = [shopId];
      if (search) { where += ' AND (s.ticketNumber LIKE ? OR s.imei LIKE ? OR s.deviceType LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
      if (status) { where += ' AND s.status = ?'; params.push(status); }
      if (customerId) { where += ' AND s.customerId = ?'; params.push(customerId); }
      if (fromDate) { where += ' AND s.createdAt >= ?'; params.push(fromDate); }
      if (toDate) { where += ' AND s.createdAt <= ?'; params.push(toDate); }
      const { results } = await db.prepare(`SELECT s.*, c.name as customerName, c.phone as customerPhone, b.name as branchName FROM service_repairs s LEFT JOIN customers c ON s.customerId = c.id LEFT JOIN branches b ON s.branchId = b.id ${where} ORDER BY s.createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      let countQuery = `SELECT COUNT(*) as total FROM service_repairs s ${where}`;
      const { results: countRes } = await db.prepare(countQuery).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/services/search', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const q = c.req.query('q') || ''; const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      if (!q) return c.json({ data: [], total: 0, limit, offset });
      const { results } = await db.prepare("SELECT s.*, c.name as customerName, c.phone as customerPhone FROM service_repairs s LEFT JOIN customers c ON s.customerId = c.id WHERE s.shopId = ? AND (s.ticketNumber LIKE ? OR s.imei LIKE ? OR c.phone LIKE ? OR c.name LIKE ?) ORDER BY s.createdAt DESC LIMIT ? OFFSET ?").bind(shopId, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, limit, offset).all();
      const { results: countRes } = await db.prepare("SELECT COUNT(*) as total FROM service_repairs s LEFT JOIN customers c ON s.customerId = c.id WHERE s.shopId = ? AND (s.ticketNumber LIKE ? OR s.imei LIKE ? OR c.phone LIKE ? OR c.name LIKE ?)").bind(shopId, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/services/status/:status', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId; const status = c.req.param('status');
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await db.prepare("SELECT s.*, c.name as customerName, c.phone as customerPhone FROM service_repairs s LEFT JOIN customers c ON s.customerId = c.id WHERE s.shopId = ? AND s.status = ? ORDER BY s.createdAt DESC LIMIT ? OFFSET ?").bind(shopId, status, limit, offset).all();
      const { results: countRes } = await db.prepare("SELECT COUNT(*) as total FROM service_repairs WHERE shopId = ? AND status = ?").bind(shopId, status).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/services/customer/:customerId', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId; const customerId = c.req.param('customerId');
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await db.prepare("SELECT s.*, c.name as customerName, c.phone as customerPhone FROM service_repairs s LEFT JOIN customers c ON s.customerId = c.id WHERE s.shopId = ? AND s.customerId = ? ORDER BY s.createdAt DESC LIMIT ? OFFSET ?").bind(shopId, customerId, limit, offset).all();
      const { results: countRes } = await db.prepare("SELECT COUNT(*) as total FROM service_repairs WHERE shopId = ? AND customerId = ?").bind(shopId, customerId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/services/dashboard', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const now = new Date().toISOString().slice(0, 10);
      const [total, today, pending, inProgress, avgTime] = await Promise.all([
        db.prepare('SELECT COUNT(*) as c FROM service_repairs WHERE shopId = ?').bind(shopId).first(),
        db.prepare("SELECT COUNT(*) as c FROM service_repairs WHERE shopId = ? AND date(createdAt) = ?").bind(shopId, now).first(),
        db.prepare("SELECT COUNT(*) as c FROM service_repairs WHERE shopId = ? AND status IN ('RECEIVED','PENDING','AWAITING_APPROVAL')").bind(shopId).first(),
        db.prepare("SELECT COUNT(*) as c FROM service_repairs WHERE shopId = ? AND status = 'IN_PROGRESS'").bind(shopId).first(),
        db.prepare("SELECT AVG(julianday(updatedAt) - julianday(createdAt)) as avg FROM service_repairs WHERE shopId = ? AND status IN ('COMPLETED','DELIVERED')").bind(shopId).first(),
      ]);
      return c.json({ data: { total: (total as any)?.c || 0, today: (today as any)?.c || 0, pending: (pending as any)?.c || 0, inProgress: (inProgress as any)?.c || 0, avgRepairDays: (avgTime as any)?.avg || 0 } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/services/print', async (c) => {
    try {
      const { id, type } = await c.req.json();
      if (!id) return c.json({ error: 'id required' }, 400);
      const ticket = await c.env.DB.prepare("SELECT * FROM service_repairs WHERE id = ? AND shopId = ?").bind(id, c.var.shopId).first();
      if (!ticket) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: { id, type: type || 'SERVICE_TICKET', printUrl: `https://stiqr-backend.ksangeeth76.workers.dev/print/service/${id}`, ticket } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/services/:id', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const service = await db.prepare("SELECT s.*, c.name as customerName, c.phone as customerPhone, c.email as customerEmail, c.address as customerAddress, b.name as branchName, e.name as technicianName FROM service_repairs s LEFT JOIN customers c ON s.customerId = c.id LEFT JOIN branches b ON s.branchId = b.id LEFT JOIN employees e ON s.technicianId = e.id WHERE s.id = ? AND s.shopId = ?").bind(c.req.param('id'), shopId).first();
      if (!service) return c.json({ error: 'Not found' }, 404);
      const { results: items } = await db.prepare('SELECT * FROM service_repair_items WHERE serviceRepairId = ?').bind((service as any).id).all();
      return c.json({ data: { ...(service as any), items } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/services/:id', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const body = await c.req.json();
      const allowed = ['customerId', 'branchId', 'deviceType', 'deviceBrand', 'deviceModel', 'imei', 'issueDescription', 'estimatedCost', 'actualCost', 'sparePartsCost', 'laborCost', 'deliveryDate', 'notes', 'status'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) { if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); } }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      vals.push(new Date().toISOString(), c.req.param('id'), shopId);
      await db.prepare(`UPDATE service_repairs SET ${sets.join(', ')}, updatedAt = ? WHERE id = ? AND shopId = ?`).bind(...vals).run();
      const service = await db.prepare('SELECT * FROM service_repairs WHERE id = ?').bind(c.req.param('id')).first();
      await addTimelineEntry(db, shopId, c.req.param('id'), 'UPDATED', 'Service ticket updated', c.var.userId);
      return c.json({ data: service });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/services/:id', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      await db.prepare("UPDATE service_repairs SET status = 'CANCELLED', updatedAt = ? WHERE id = ? AND shopId = ?").bind(new Date().toISOString(), c.req.param('id'), shopId).run();
      await addTimelineEntry(db, shopId, c.req.param('id'), 'CANCELLED', 'Service ticket cancelled', c.var.userId);
      return c.json({ message: 'Deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/services/cancel', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { id, reason } = await c.req.json();
      if (!id) return c.json({ error: 'id required' }, 400);
      await db.prepare("UPDATE service_repairs SET status = 'CANCELLED', notes = CASE WHEN notes IS NULL THEN ? ELSE notes || ' | ' || ? END, updatedAt = ? WHERE id = ? AND shopId = ?").bind(reason || 'Cancelled', reason || 'Cancelled', new Date().toISOString(), id, shopId).run();
      await addTimelineEntry(db, shopId, id, 'CANCELLED', reason || 'Cancelled', c.var.userId);
      return c.json({ message: 'Cancelled' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/services/reopen', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { id, reason } = await c.req.json();
      if (!id) return c.json({ error: 'id required' }, 400);
      await db.prepare("UPDATE service_repairs SET status = 'RECEIVED', updatedAt = ? WHERE id = ? AND shopId = ?").bind(new Date().toISOString(), id, shopId).run();
      await addTimelineEntry(db, shopId, id, 'REOPENED', reason || 'Reopened', c.var.userId);
      return c.json({ message: 'Reopened' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/services/history', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const fromDate = c.req.query('fromDate') || ''; const toDate = c.req.query('toDate') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      let where = 'WHERE s.shopId = ?'; const params: any[] = [shopId];
      if (fromDate) { where += ' AND s.updatedAt >= ?'; params.push(fromDate); }
      if (toDate) { where += ' AND s.updatedAt <= ?'; params.push(toDate); }
      const { results } = await db.prepare(`SELECT s.*, c.name as customerName, c.phone as customerPhone FROM service_repairs s LEFT JOIN customers c ON s.customerId = c.id ${where} ORDER BY s.updatedAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM service_repairs s ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/services/timeline/:id', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { results } = await db.prepare('SELECT * FROM service_timelines WHERE shopId = ? AND serviceRepairId = ? ORDER BY createdAt DESC').bind(shopId, c.req.param('id')).all();
      return c.json({ data: results });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== 2. JOB CARD MANAGEMENT ====================

  app.post('/api/job-cards', async (c) => {
    try {
      await ensureServiceTables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const { serviceRepairId, deviceType, deviceBrand, deviceModel, imei, issueDescription, customerNotes, accessoriesList, assignedTo } = await c.req.json();
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      const jobNumber = await generateJobNumber(db, shopId);
      await db.prepare('INSERT INTO job_cards (id, shopId, serviceRepairId, jobNumber, deviceType, deviceBrand, deviceModel, imei, issueDescription, customerNotes, accessoriesList, assignedTo, status, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id, shopId, serviceRepairId || null, jobNumber, deviceType || null, deviceBrand || null, deviceModel || null, imei || null, issueDescription || null, customerNotes || null, accessoriesList || null, assignedTo || null, 'PENDING', now, now).run();
      return c.json({ data: { id, jobNumber, serviceRepairId, deviceType, deviceBrand, deviceModel, imei, issueDescription, customerNotes, accessoriesList, assignedTo, status: 'PENDING', createdAt: now, updatedAt: now } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/job-cards', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const status = c.req.query('status') || ''; const assignedTo = c.req.query('assignedTo') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      let where = 'WHERE shopId = ?'; const params: any[] = [shopId];
      if (status) { where += ' AND status = ?'; params.push(status); }
      if (assignedTo) { where += ' AND assignedTo = ?'; params.push(assignedTo); }
      const { results } = await db.prepare(`SELECT j.*, e.name as assignedToName FROM job_cards j LEFT JOIN employees e ON j.assignedTo = e.id ${where} ORDER BY j.createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM job_cards ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/job-cards/:id', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const card = await db.prepare("SELECT j.*, e.name as assignedToName FROM job_cards j LEFT JOIN employees e ON j.assignedTo = e.id WHERE j.id = ? AND j.shopId = ?").bind(c.req.param('id'), shopId).first();
      if (!card) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: card });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/job-cards/:id', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const body = await c.req.json();
      const allowed = ['serviceRepairId', 'deviceType', 'deviceBrand', 'deviceModel', 'imei', 'issueDescription', 'customerNotes', 'accessoriesList', 'assignedTo', 'status'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) { if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); } }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      vals.push(new Date().toISOString(), c.req.param('id'), shopId);
      await db.prepare(`UPDATE job_cards SET ${sets.join(', ')}, updatedAt = ? WHERE id = ? AND shopId = ?`).bind(...vals).run();
      const card = await db.prepare('SELECT * FROM job_cards WHERE id = ?').bind(c.req.param('id')).first();
      return c.json({ data: card });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/job-cards/:id', async (c) => {
    try {
      await c.env.DB.prepare("UPDATE job_cards SET status = 'CANCELLED', updatedAt = ? WHERE id = ? AND shopId = ?").bind(new Date().toISOString(), c.req.param('id'), c.var.shopId).run();
      return c.json({ message: 'Deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/job-cards/print', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { id } = await c.req.json();
      if (!id) return c.json({ error: 'id required' }, 400);
      const card = await db.prepare("SELECT j.*, e.name as assignedToName, s.ticketNumber, s.issueDescription as serviceIssue, s.customerId FROM job_cards j LEFT JOIN employees e ON j.assignedTo = e.id LEFT JOIN service_repairs s ON j.serviceRepairId = s.id WHERE j.id = ? AND j.shopId = ?").bind(id, shopId).first();
      if (!card) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: { ...(card as any), printDate: new Date().toISOString(), shopName: 'STiQR' } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/job-cards/history', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await db.prepare("SELECT j.*, e.name as assignedToName FROM job_cards j LEFT JOIN employees e ON j.assignedTo = e.id WHERE j.shopId = ? ORDER BY j.updatedAt DESC LIMIT ? OFFSET ?").bind(shopId, limit, offset).all();
      const { results: countRes } = await db.prepare('SELECT COUNT(*) as total FROM job_cards WHERE shopId = ?').bind(shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== 3. DEVICE CHECK-IN ====================

  app.post('/api/device-checkin', async (c) => {
    try {
      await ensureServiceTables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const { serviceRepairId, imei, serialNumber, physicalCondition, accessoriesReceived, hasPasswordLock, screenCondition, cameraCondition, batteryCondition, waterDamage, faceIdStatus, fingerprintStatus, notes } = await c.req.json();
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      await db.prepare('INSERT INTO device_checkins (id, shopId, serviceRepairId, imei, serialNumber, physicalCondition, accessoriesReceived, hasPasswordLock, screenCondition, cameraCondition, batteryCondition, waterDamage, faceIdStatus, fingerprintStatus, notes, createdBy, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id, shopId, serviceRepairId || null, imei || null, serialNumber || null, physicalCondition || null, accessoriesReceived || null, hasPasswordLock ?? 0, screenCondition || null, cameraCondition || null, batteryCondition || null, waterDamage ?? 0, faceIdStatus || null, fingerprintStatus || null, notes || null, c.var.userId, now, now).run();
      return c.json({ data: { id, serviceRepairId, imei, serialNumber, physicalCondition, accessoriesReceived, hasPasswordLock, screenCondition, cameraCondition, batteryCondition, waterDamage, faceIdStatus, fingerprintStatus, notes, createdBy: c.var.userId, createdAt: now, updatedAt: now } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/device-checkin/:id', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const checkin = await db.prepare('SELECT * FROM device_checkins WHERE id = ? AND shopId = ?').bind(c.req.param('id'), shopId).first();
      if (!checkin) return c.json({ error: 'Not found' }, 404);
      const { results: photos } = await db.prepare('SELECT * FROM device_checkin_photos WHERE deviceCheckinId = ?').bind((checkin as any).id).all();
      return c.json({ data: { ...(checkin as any), photos } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/device-checkin/:id', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const body = await c.req.json();
      const allowed = ['serviceRepairId', 'imei', 'serialNumber', 'physicalCondition', 'accessoriesReceived', 'hasPasswordLock', 'screenCondition', 'cameraCondition', 'batteryCondition', 'waterDamage', 'faceIdStatus', 'fingerprintStatus', 'notes'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) { if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); } }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      vals.push(new Date().toISOString(), c.req.param('id'), shopId);
      await db.prepare(`UPDATE device_checkins SET ${sets.join(', ')}, updatedAt = ? WHERE id = ? AND shopId = ?`).bind(...vals).run();
      const checkin = await db.prepare('SELECT * FROM device_checkins WHERE id = ?').bind(c.req.param('id')).first();
      return c.json({ data: checkin });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/device-checkin/photos', async (c) => {
    try {
      await ensureServiceTables(c.env.DB);
      const db = c.env.DB;
      const { deviceCheckinId, url, type } = await c.req.json();
      if (!deviceCheckinId || !url) return c.json({ error: 'deviceCheckinId and url required' }, 400);
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      await db.prepare('INSERT INTO device_checkin_photos (id, deviceCheckinId, url, type, createdAt) VALUES (?,?,?,?,?)').bind(id, deviceCheckinId, url, type || null, now).run();
      return c.json({ data: { id, deviceCheckinId, url, type, createdAt: now } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/device-checkin/photos/:id', async (c) => {
    try {
      await c.env.DB.prepare('DELETE FROM device_checkin_photos WHERE id = ?').bind(c.req.param('id')).run();
      return c.json({ message: 'Deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== 4. TECHNICIAN MANAGEMENT ====================

  app.get('/api/technicians', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await db.prepare("SELECT * FROM employees WHERE shopId = ? AND (designation LIKE '%TECHNICIAN%' OR designation LIKE '%Service%') AND deletedAt IS NULL ORDER BY name ASC LIMIT ? OFFSET ?").bind(shopId, limit, offset).all();
      const { results: countRes } = await db.prepare("SELECT COUNT(*) as total FROM employees WHERE shopId = ? AND (designation LIKE '%TECHNICIAN%' OR designation LIKE '%Service%') AND deletedAt IS NULL").bind(shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/technicians/schedule', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const date = c.req.query('date') || new Date().toISOString().slice(0, 10);
      const { results: techs } = await db.prepare("SELECT id, name, designation, status FROM employees WHERE shopId = ? AND (designation LIKE '%TECHNICIAN%' OR designation LIKE '%Service%') AND status = 'ACTIVE' ORDER BY name").bind(shopId).all();
      const techList = (techs as any) || [];
      for (const tech of techList) {
        const { results: jobs } = await db.prepare("SELECT id, ticketNumber, deviceType, deviceBrand, deviceModel, status, createdAt FROM service_repairs WHERE technicianId = ? AND shopId = ? AND date(createdAt) = ? ORDER BY createdAt ASC").bind(tech.id, shopId, date).all();
        tech.jobs = (jobs as any)?.results || [];
      }
      return c.json({ data: { date, technicians: techList } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/technicians/:id', async (c) => {
    try {
      const tech = await c.env.DB.prepare("SELECT * FROM employees WHERE id = ? AND shopId = ? AND deletedAt IS NULL").bind(c.req.param('id'), c.var.shopId).first();
      if (!tech) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: tech });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/technicians/assign', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { serviceId, technicianId } = await c.req.json();
      if (!serviceId || !technicianId) return c.json({ error: 'serviceId and technicianId required' }, 400);
      const now = new Date().toISOString();
      await db.prepare("UPDATE service_repairs SET technicianId = ?, updatedAt = ? WHERE id = ? AND shopId = ?").bind(technicianId, now, serviceId, shopId).run();
      await addTimelineEntry(db, shopId, serviceId, 'TECHNICIAN_ASSIGNED', `Technician ${technicianId} assigned`, c.var.userId);
      return c.json({ data: { serviceId, technicianId } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/technicians/reassign', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { serviceId, technicianId, reason } = await c.req.json();
      if (!serviceId || !technicianId) return c.json({ error: 'serviceId and technicianId required' }, 400);
      const now = new Date().toISOString();
      await db.prepare("UPDATE service_repairs SET technicianId = ?, updatedAt = ? WHERE id = ? AND shopId = ?").bind(technicianId, now, serviceId, shopId).run();
      await addTimelineEntry(db, shopId, serviceId, 'TECHNICIAN_REASSIGNED', reason || `Reassigned to ${technicianId}`, c.var.userId);
      return c.json({ data: { serviceId, technicianId } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/technicians/workload', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { results } = await db.prepare("SELECT e.id, e.name, e.designation, COUNT(s.id) as activeServices FROM employees e LEFT JOIN service_repairs s ON e.id = s.technicianId AND s.shopId = ? AND s.status NOT IN ('DELIVERED','CANCELLED','COMPLETED') WHERE e.shopId = ? AND (e.designation LIKE '%TECHNICIAN%' OR e.designation LIKE '%Service%') AND e.deletedAt IS NULL GROUP BY e.id ORDER BY activeServices DESC").bind(shopId, shopId).all();
      return c.json({ data: results });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/technicians/performance', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { results } = await db.prepare("SELECT e.id, e.name, e.designation, COUNT(s.id) as completedCount, AVG(CAST(julianday(s.updatedAt) - julianday(s.createdAt) AS INTEGER)) as avgDays FROM employees e LEFT JOIN service_repairs s ON e.id = s.technicianId AND s.shopId = ? AND s.status = 'COMPLETED' WHERE e.shopId = ? AND (e.designation LIKE '%TECHNICIAN%' OR e.designation LIKE '%Service%') AND e.deletedAt IS NULL GROUP BY e.id ORDER BY completedCount DESC").bind(shopId, shopId).all();
      return c.json({ data: results });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== 5. REPAIR WORKFLOW ====================

  app.post('/api/repair/start', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { serviceId } = await c.req.json();
      if (!serviceId) return c.json({ error: 'serviceId required' }, 400);
      const now = new Date().toISOString();
      await db.prepare("UPDATE service_repairs SET status = 'IN_PROGRESS', updatedAt = ? WHERE id = ? AND shopId = ?").bind(now, serviceId, shopId).run();
      await addTimelineEntry(db, shopId, serviceId, 'IN_PROGRESS', 'Repair started', c.var.userId);
      return c.json({ data: { serviceId, status: 'IN_PROGRESS' } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/repair/status', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { serviceId, status, notes } = await c.req.json();
      if (!serviceId || !status) return c.json({ error: 'serviceId and status required' }, 400);
      const now = new Date().toISOString();
      await db.prepare('UPDATE service_repairs SET status = ?, notes = CASE WHEN notes IS NULL THEN ? ELSE notes || ? || ? END, updatedAt = ? WHERE id = ? AND shopId = ?').bind(status, notes || null, ' | ', notes || '', now, serviceId, shopId).run();
      await addTimelineEntry(db, shopId, serviceId, status, notes || null, c.var.userId);
      return c.json({ data: { serviceId, status } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/repair/pause', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { serviceId, reason } = await c.req.json();
      if (!serviceId) return c.json({ error: 'serviceId required' }, 400);
      const now = new Date().toISOString();
      await db.prepare("UPDATE service_repairs SET status = 'PAUSED', updatedAt = ? WHERE id = ? AND shopId = ?").bind(now, serviceId, shopId).run();
      await addTimelineEntry(db, shopId, serviceId, 'PAUSED', reason || 'Paused', c.var.userId);
      return c.json({ data: { serviceId, status: 'PAUSED' } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/repair/resume', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { serviceId } = await c.req.json();
      if (!serviceId) return c.json({ error: 'serviceId required' }, 400);
      const now = new Date().toISOString();
      await db.prepare("UPDATE service_repairs SET status = 'IN_PROGRESS', updatedAt = ? WHERE id = ? AND shopId = ?").bind(now, serviceId, shopId).run();
      await addTimelineEntry(db, shopId, serviceId, 'RESUMED', 'Repair resumed', c.var.userId);
      return c.json({ data: { serviceId, status: 'IN_PROGRESS' } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/repair/complete', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { serviceId, actualCost } = await c.req.json();
      if (!serviceId) return c.json({ error: 'serviceId required' }, 400);
      const now = new Date().toISOString();
      await db.prepare('UPDATE service_repairs SET status = ?, actualCost = COALESCE(?, actualCost), updatedAt = ? WHERE id = ? AND shopId = ?').bind('COMPLETED', actualCost || null, now, serviceId, shopId).run();
      await addTimelineEntry(db, shopId, serviceId, 'COMPLETED', actualCost ? `Completed with cost: ${actualCost}` : 'Completed', c.var.userId);
      return c.json({ data: { serviceId, status: 'COMPLETED', actualCost } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/repair/qc', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { serviceId, passed, notes } = await c.req.json();
      if (!serviceId || passed === undefined) return c.json({ error: 'serviceId and passed required' }, 400);
      const status = passed ? 'QC_PASSED' : 'QC_FAILED';
      const now = new Date().toISOString();
      await db.prepare('UPDATE service_repairs SET status = ?, notes = CASE WHEN notes IS NULL THEN ? ELSE notes || ? || ? END, updatedAt = ? WHERE id = ? AND shopId = ?').bind(status, notes || null, ' | ', notes || '', now, serviceId, shopId).run();
      await addTimelineEntry(db, shopId, serviceId, status, notes || (passed ? 'QC Passed' : 'QC Failed'), c.var.userId);
      return c.json({ data: { serviceId, status } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/repair/deliver', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { serviceId } = await c.req.json();
      if (!serviceId) return c.json({ error: 'serviceId required' }, 400);
      const now = new Date().toISOString();
      await db.prepare("UPDATE service_repairs SET status = 'DELIVERED', deliveryDate = ?, updatedAt = ? WHERE id = ? AND shopId = ?").bind(now, now, serviceId, shopId).run();
      await addTimelineEntry(db, shopId, serviceId, 'DELIVERED', 'Repair delivered to customer', c.var.userId);
      return c.json({ data: { serviceId, status: 'DELIVERED' } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/repair/history', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const serviceId = c.req.query('serviceId') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      let where = 'WHERE shopId = ?'; const params: any[] = [shopId];
      if (serviceId) { where += ' AND serviceRepairId = ?'; params.push(serviceId); }
      const { results } = await db.prepare(`SELECT * FROM service_timelines ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM service_timelines ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== 6. SPARE PARTS MANAGEMENT ====================

  app.post('/api/service-parts', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { serviceRepairId, productId, productName, quantity, price } = await c.req.json();
      if (!serviceRepairId || !productName || quantity === undefined || price === undefined) return c.json({ error: 'serviceRepairId, productName, quantity, price required' }, 400);
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      await db.prepare('INSERT INTO service_repair_items (id, serviceRepairId, productId, productName, quantity, price, createdAt) VALUES (?,?,?,?,?,?,?)').bind(id, serviceRepairId, productId || null, productName, quantity, price, now).run();
      await db.prepare('UPDATE service_repairs SET sparePartsCost = sparePartsCost + ?, updatedAt = ? WHERE id = ? AND shopId = ?').bind(quantity * price, now, serviceRepairId, shopId).run();
      if (productId) {
        const mId = crypto.randomUUID();
        await db.prepare('INSERT INTO stock_movements (id, productId, type, quantity, reference, createdBy, createdAt) VALUES (?,?,?,?,?,?,?)').bind(mId, productId, 'SERVICE_ISSUE', -quantity, `ServiceRepair:${serviceRepairId}`, c.var.userId, now).run();
      }
      return c.json({ data: { id, serviceRepairId, productId, productName, quantity, price } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/service-parts', async (c) => {
    try {
      const db = c.env.DB;
      const serviceRepairId = c.req.query('serviceRepairId') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      let where = 'WHERE 1=1'; const params: any[] = [];
      if (serviceRepairId) { where += ' AND serviceRepairId = ?'; params.push(serviceRepairId); }
      const { results } = await db.prepare(`SELECT * FROM service_repair_items ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM service_repair_items ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/service-parts/:id', async (c) => {
    try {
      const db = c.env.DB;
      const body = await c.req.json();
      const oldItem = await db.prepare('SELECT * FROM service_repair_items WHERE id = ?').bind(c.req.param('id')).first() as any;
      if (!oldItem) return c.json({ error: 'Not found' }, 404);
      const quantity = body.quantity !== undefined ? body.quantity : oldItem.quantity;
      const price = body.price !== undefined ? body.price : oldItem.price;
      await db.prepare('UPDATE service_repair_items SET quantity = ?, price = ? WHERE id = ?').bind(quantity, price, c.req.param('id')).run();
      const diff = (quantity * price) - (oldItem.quantity * oldItem.price);
      await db.prepare('UPDATE service_repairs SET sparePartsCost = MAX(0, sparePartsCost + ?), updatedAt = ? WHERE id = ?').bind(diff, new Date().toISOString(), oldItem.serviceRepairId).run();
      const item = await db.prepare('SELECT * FROM service_repair_items WHERE id = ?').bind(c.req.param('id')).first();
      return c.json({ data: item });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/service-parts/:id', async (c) => {
    try {
      const db = c.env.DB;
      const item = await db.prepare('SELECT * FROM service_repair_items WHERE id = ?').bind(c.req.param('id')).first() as any;
      if (!item) return c.json({ error: 'Not found' }, 404);
      await db.prepare('UPDATE service_repairs SET sparePartsCost = MAX(0, sparePartsCost - ?), updatedAt = ? WHERE id = ?').bind(item.quantity * item.price, new Date().toISOString(), item.serviceRepairId).run();
      await db.prepare('DELETE FROM service_repair_items WHERE id = ?').bind(c.req.param('id')).run();
      return c.json({ message: 'Deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/service-parts/history', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await db.prepare("SELECT sri.*, sr.ticketNumber FROM service_repair_items sri JOIN service_repairs sr ON sri.serviceRepairId = sr.id WHERE sr.shopId = ? ORDER BY sri.createdAt DESC LIMIT ? OFFSET ?").bind(shopId, limit, offset).all();
      const { results: countRes } = await db.prepare("SELECT COUNT(*) as total FROM service_repair_items sri JOIN service_repairs sr ON sri.serviceRepairId = sr.id WHERE sr.shopId = ?").bind(shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/service-parts/return', async (c) => {
    try {
      const db = c.env.DB;
      const { id, quantity } = await c.req.json();
      if (!id || quantity === undefined) return c.json({ error: 'id and quantity required' }, 400);
      const item = await db.prepare('SELECT * FROM service_repair_items WHERE id = ?').bind(id).first() as any;
      if (!item) return c.json({ error: 'Not found' }, 404);
      if (quantity > item.quantity) return c.json({ error: 'Return quantity exceeds original' }, 400);
      const newQty = item.quantity - quantity;
      if (newQty <= 0) {
        await db.prepare('DELETE FROM service_repair_items WHERE id = ?').bind(id).run();
      } else {
        await db.prepare('UPDATE service_repair_items SET quantity = ? WHERE id = ?').bind(newQty, id).run();
      }
      const returnAmount = quantity * item.price;
      await db.prepare('UPDATE service_repairs SET sparePartsCost = MAX(0, sparePartsCost - ?), updatedAt = ? WHERE id = ?').bind(returnAmount, new Date().toISOString(), item.serviceRepairId).run();
      if (item.productId) {
        const mId = crypto.randomUUID();
        await db.prepare('INSERT INTO stock_movements (id, productId, type, quantity, reference, createdBy, createdAt) VALUES (?,?,?,?,?,?,?)').bind(mId, item.productId, 'SERVICE_RETURN', quantity, `ServiceReturn:${id}`, c.var.userId, new Date().toISOString()).run();
      }
      return c.json({ data: { returnedQuantity: quantity, remainingQuantity: newQty } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== 7. REPAIR ESTIMATION ====================

  app.post('/api/estimates', async (c) => {
    try {
      await ensureServiceTables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const { serviceRepairId, laborCharges, sparePartsCost, tax, discount, notes } = await c.req.json();
      if (!serviceRepairId) return c.json({ error: 'serviceRepairId required' }, 400);
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      const estimateNumber = await generateEstimateNumber(db, shopId);
      const total = (laborCharges || 0) + (sparePartsCost || 0) + (tax || 0) - (discount || 0);
      await db.prepare('INSERT INTO estimates (id, shopId, serviceRepairId, estimateNumber, laborCharges, sparePartsCost, tax, discount, total, status, customerApproved, notes, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id, shopId, serviceRepairId, estimateNumber, laborCharges || 0, sparePartsCost || 0, tax || 0, discount || 0, total, 'PENDING', 0, notes || null, now, now).run();
      return c.json({ data: { id, estimateNumber, serviceRepairId, laborCharges, sparePartsCost, tax, discount, total, status: 'PENDING', customerApproved: 0, notes, createdAt: now } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/estimates', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const status = c.req.query('status') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      let where = 'WHERE e.shopId = ?'; const params: any[] = [shopId];
      if (status) { where += ' AND e.status = ?'; params.push(status); }
      const { results } = await db.prepare(`SELECT e.*, sr.ticketNumber, c.name as customerName FROM estimates e LEFT JOIN service_repairs sr ON e.serviceRepairId = sr.id LEFT JOIN customers c ON sr.customerId = c.id ${where} ORDER BY e.createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM estimates e ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/estimates/:id', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const est = await db.prepare("SELECT e.*, sr.ticketNumber, sr.deviceType, sr.deviceBrand, sr.deviceModel, sr.imei, sr.issueDescription, c.name as customerName, c.phone as customerPhone FROM estimates e LEFT JOIN service_repairs sr ON e.serviceRepairId = sr.id LEFT JOIN customers c ON sr.customerId = c.id WHERE e.id = ? AND e.shopId = ?").bind(c.req.param('id'), shopId).first();
      if (!est) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: est });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/estimates/:id', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const body = await c.req.json();
      const allowed = ['laborCharges', 'sparePartsCost', 'tax', 'discount', 'notes', 'status'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) { if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); } }
      if (sets.length) {
        sets.push('total = COALESCE(laborCharges,0) + COALESCE(sparePartsCost,0) + COALESCE(tax,0) - COALESCE(discount,0)');
      }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      vals.push(new Date().toISOString(), c.req.param('id'), shopId);
      await db.prepare(`UPDATE estimates SET ${sets.join(', ')}, updatedAt = ? WHERE id = ? AND shopId = ?`).bind(...vals).run();
      const est = await db.prepare('SELECT * FROM estimates WHERE id = ?').bind(c.req.param('id')).first();
      return c.json({ data: est });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/estimates/approve', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { id } = await c.req.json();
      if (!id) return c.json({ error: 'id required' }, 400);
      const now = new Date().toISOString();
      await db.prepare("UPDATE estimates SET customerApproved = 1, status = 'APPROVED', updatedAt = ? WHERE id = ? AND shopId = ?").bind(now, id, shopId).run();
      const est = await db.prepare('SELECT * FROM estimates WHERE id = ?').bind(id).first() as any;
      if (est?.serviceRepairId) {
        await addTimelineEntry(db, shopId, est.serviceRepairId, 'ESTIMATE_APPROVED', `Estimate ${(est as any).estimateNumber} approved`, c.var.userId);
      }
      return c.json({ data: { id, customerApproved: 1, status: 'APPROVED' } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/estimates/reject', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { id, reason } = await c.req.json();
      if (!id) return c.json({ error: 'id required' }, 400);
      const now = new Date().toISOString();
      await db.prepare("UPDATE estimates SET customerApproved = 0, status = 'REJECTED', notes = COALESCE(?, notes), updatedAt = ? WHERE id = ? AND shopId = ?").bind(reason || 'Rejected', now, id, shopId).run();
      const est = await db.prepare('SELECT * FROM estimates WHERE id = ?').bind(id).first() as any;
      if (est?.serviceRepairId) {
        await addTimelineEntry(db, shopId, est.serviceRepairId, 'ESTIMATE_REJECTED', reason || 'Estimate rejected', c.var.userId);
      }
      return c.json({ data: { id, status: 'REJECTED' } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/estimates/print', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { id } = await c.req.json();
      if (!id) return c.json({ error: 'id required' }, 400);
      const est = await db.prepare("SELECT e.*, sr.ticketNumber, sr.deviceType, sr.deviceBrand, sr.deviceModel, sr.imei, sr.issueDescription, c.name as customerName, c.phone as customerPhone, c.address as customerAddress FROM estimates e LEFT JOIN service_repairs sr ON e.serviceRepairId = sr.id LEFT JOIN customers c ON sr.customerId = c.id WHERE e.id = ? AND e.shopId = ?").bind(id, shopId).first();
      if (!est) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: { ...(est as any), printDate: new Date().toISOString() } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/estimates/send', async (c) => {
    try {
      await ensureServiceTables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const { id, channel, recipient } = await c.req.json();
      if (!id || !channel || !recipient) return c.json({ error: 'id, channel, recipient required' }, 400);
      const est = await db.prepare('SELECT * FROM estimates WHERE id = ? AND shopId = ?').bind(id, shopId).first() as any;
      if (!est) return c.json({ error: 'Not found' }, 404);
      const commId = crypto.randomUUID(); const now = new Date().toISOString();
      await db.prepare('INSERT INTO communications (id, shopId, serviceRepairId, type, channel, recipient, message, status, createdAt) VALUES (?,?,?,?,?,?,?,?,?)').bind(commId, shopId, est.serviceRepairId, 'ESTIMATE', channel, recipient, `Estimate ${est.estimateNumber} sent. Total: ${est.total}`, 'SENT', now).run();
      return c.json({ data: { id: commId, estimateId: id, channel, recipient } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== 8. CUSTOMER APPROVAL ====================

  app.post('/api/approvals/request', async (c) => {
    try {
      await ensureServiceTables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const { serviceRepairId, type, notes } = await c.req.json();
      if (!serviceRepairId || !type) return c.json({ error: 'serviceRepairId and type required' }, 400);
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      await db.prepare("INSERT INTO approvals (id, shopId, serviceRepairId, type, status, requestedBy, notes, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?)").bind(id, shopId, serviceRepairId, type, 'PENDING', c.var.userId, notes || null, now, now).run();
      await addTimelineEntry(db, shopId, serviceRepairId, 'APPROVAL_REQUESTED', `Approval requested: ${type}`, c.var.userId);
      return c.json({ data: { id, serviceRepairId, type, status: 'PENDING' } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/approvals/approve', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { id, approvedBy, notes } = await c.req.json();
      if (!id) return c.json({ error: 'id required' }, 400);
      const now = new Date().toISOString();
      await db.prepare("UPDATE approvals SET status = 'APPROVED', approvedBy = ?, notes = COALESCE(?, notes), updatedAt = ? WHERE id = ? AND shopId = ?").bind(approvedBy || c.var.userId, notes || null, now, id, shopId).run();
      const approval = await db.prepare('SELECT * FROM approvals WHERE id = ?').bind(id).first() as any;
      if (approval?.serviceRepairId) {
        await addTimelineEntry(db, shopId, approval.serviceRepairId, 'APPROVAL_APPROVED', `Approval ${id} approved`, c.var.userId);
      }
      return c.json({ data: { id, status: 'APPROVED' } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/approvals/reject', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { id, approvedBy, notes } = await c.req.json();
      if (!id) return c.json({ error: 'id required' }, 400);
      const now = new Date().toISOString();
      await db.prepare("UPDATE approvals SET status = 'REJECTED', approvedBy = ?, notes = COALESCE(?, notes), updatedAt = ? WHERE id = ? AND shopId = ?").bind(approvedBy || c.var.userId, notes || null, now, id, shopId).run();
      const approval = await db.prepare('SELECT * FROM approvals WHERE id = ?').bind(id).first() as any;
      if (approval?.serviceRepairId) {
        await addTimelineEntry(db, shopId, approval.serviceRepairId, 'APPROVAL_REJECTED', notes || `Approval ${id} rejected`, c.var.userId);
      }
      return c.json({ data: { id, status: 'REJECTED' } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/approvals/history', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const serviceRepairId = c.req.query('serviceRepairId') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      let where = 'WHERE a.shopId = ?'; const params: any[] = [shopId];
      if (serviceRepairId) { where += ' AND a.serviceRepairId = ?'; params.push(serviceRepairId); }
      const { results } = await db.prepare(`SELECT a.*, sr.ticketNumber FROM approvals a LEFT JOIN service_repairs sr ON a.serviceRepairId = sr.id ${where} ORDER BY a.createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM approvals a ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== 9. SERVICE INVOICE ====================

  app.post('/api/service-invoices', async (c) => {
    try {
      await ensureServiceTables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const { serviceRepairId, laborCharges, sparePartsCost, tax, discount } = await c.req.json();
      if (!serviceRepairId) return c.json({ error: 'serviceRepairId required' }, 400);
      const sr = await db.prepare('SELECT * FROM service_repairs WHERE id = ? AND shopId = ?').bind(serviceRepairId, shopId).first() as any;
      if (!sr) return c.json({ error: 'Service repair not found' }, 404);
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      const invoiceNumber = await generateInvoiceNumber(db, shopId);
      const lc = laborCharges ?? sr.laborCost ?? 0;
      const spc = sparePartsCost ?? sr.sparePartsCost ?? 0;
      const tx = tax ?? 0;
      const disc = discount ?? 0;
      const total = lc + spc + tx - disc;
      await db.prepare('INSERT INTO service_invoices (id, shopId, serviceRepairId, invoiceNumber, laborCharges, sparePartsCost, tax, discount, total, paid, due, status, notes, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,0,?,?,?,?,?)').bind(id, shopId, serviceRepairId, invoiceNumber, lc, spc, tx, disc, total, total, 'PENDING', null, now, now).run();
      return c.json({ data: { id, invoiceNumber, serviceRepairId, laborCharges: lc, sparePartsCost: spc, tax: tx, discount: disc, total, paid: 0, due: total, status: 'PENDING', createdAt: now } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/service-invoices', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const status = c.req.query('status') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      let where = 'WHERE si.shopId = ?'; const params: any[] = [shopId];
      if (status) { where += ' AND si.status = ?'; params.push(status); }
      const { results } = await db.prepare(`SELECT si.*, sr.ticketNumber, c.name as customerName, c.phone as customerPhone FROM service_invoices si LEFT JOIN service_repairs sr ON si.serviceRepairId = sr.id LEFT JOIN customers c ON sr.customerId = c.id ${where} ORDER BY si.createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM service_invoices si ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/service-invoices/:id', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const inv = await db.prepare("SELECT si.*, sr.ticketNumber, sr.deviceType, sr.deviceBrand, sr.deviceModel, sr.imei, sr.issueDescription, c.name as customerName, c.phone as customerPhone, c.address as customerAddress FROM service_invoices si LEFT JOIN service_repairs sr ON si.serviceRepairId = sr.id LEFT JOIN customers c ON sr.customerId = c.id WHERE si.id = ? AND si.shopId = ?").bind(c.req.param('id'), shopId).first();
      if (!inv) return c.json({ error: 'Not found' }, 404);
      const { results: payments } = await db.prepare('SELECT * FROM service_payments WHERE serviceInvoiceId = ?').bind((inv as any).id).all();
      return c.json({ data: { ...(inv as any), payments } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/service-invoices/print', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { id } = await c.req.json();
      if (!id) return c.json({ error: 'id required' }, 400);
      const inv = await db.prepare("SELECT si.*, sr.ticketNumber, sr.deviceType, sr.deviceBrand, sr.deviceModel, sr.imei, sr.issueDescription, c.name as customerName, c.phone as customerPhone, c.address as customerAddress FROM service_invoices si LEFT JOIN service_repairs sr ON si.serviceRepairId = sr.id LEFT JOIN customers c ON sr.customerId = c.id WHERE si.id = ? AND si.shopId = ?").bind(id, shopId).first();
      if (!inv) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: { ...(inv as any), printDate: new Date().toISOString(), shopName: 'STiQR' } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/service-invoices/email', async (c) => {
    try {
      await ensureServiceTables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const { id, recipient } = await c.req.json();
      if (!id || !recipient) return c.json({ error: 'id and recipient required' }, 400);
      const inv = await db.prepare('SELECT * FROM service_invoices WHERE id = ? AND shopId = ?').bind(id, shopId).first() as any;
      if (!inv) return c.json({ error: 'Not found' }, 404);
      const commId = crypto.randomUUID(); const now = new Date().toISOString();
      await db.prepare('INSERT INTO communications (id, shopId, serviceRepairId, type, channel, recipient, message, status, createdAt) VALUES (?,?,?,?,?,?,?,?,?)').bind(commId, shopId, inv.serviceRepairId, 'INVOICE', 'EMAIL', recipient, `Invoice ${inv.invoiceNumber} sent. Total: ${inv.total}, Due: ${inv.due}`, 'SENT', now).run();
      return c.json({ data: { id: commId, invoiceId: id, recipient } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/service-invoices/pdf', async (c) => {
    try {
      const { id } = await c.req.json();
      if (!id) return c.json({ error: 'id required' }, 400);
      return c.json({ data: { url: `https://stiqr-backend.ksangeeth76.workers.dev/invoices/${id}.pdf`, invoiceId: id } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== 10. CUSTOMER COMMUNICATION ====================

  app.post('/api/communications/sms', async (c) => {
    try {
      await ensureServiceTables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const { serviceRepairId, recipient, message } = await c.req.json();
      if (!recipient || !message) return c.json({ error: 'recipient and message required' }, 400);
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      await db.prepare('INSERT INTO communications (id, shopId, serviceRepairId, type, channel, recipient, message, status, createdAt) VALUES (?,?,?,?,?,?,?,?,?)').bind(id, shopId, serviceRepairId || null, 'MANUAL', 'SMS', recipient, message, 'SENT', now).run();
      return c.json({ data: { id, channel: 'SMS', recipient, message } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/communications/email', async (c) => {
    try {
      await ensureServiceTables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const { serviceRepairId, recipient, message } = await c.req.json();
      if (!recipient || !message) return c.json({ error: 'recipient and message required' }, 400);
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      await db.prepare('INSERT INTO communications (id, shopId, serviceRepairId, type, channel, recipient, message, status, createdAt) VALUES (?,?,?,?,?,?,?,?,?)').bind(id, shopId, serviceRepairId || null, 'MANUAL', 'EMAIL', recipient, message, 'SENT', now).run();
      return c.json({ data: { id, channel: 'EMAIL', recipient, message } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/communications/whatsapp', async (c) => {
    try {
      await ensureServiceTables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const { serviceRepairId, recipient, message } = await c.req.json();
      if (!recipient || !message) return c.json({ error: 'recipient and message required' }, 400);
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      await db.prepare('INSERT INTO communications (id, shopId, serviceRepairId, type, channel, recipient, message, status, createdAt) VALUES (?,?,?,?,?,?,?,?,?)').bind(id, shopId, serviceRepairId || null, 'MANUAL', 'WHATSAPP', recipient, message, 'SENT', now).run();
      return c.json({ data: { id, channel: 'WHATSAPP', recipient, message } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/communications/history', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const serviceRepairId = c.req.query('serviceRepairId') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      let where = 'WHERE shopId = ?'; const params: any[] = [shopId];
      if (serviceRepairId) { where += ' AND serviceRepairId = ?'; params.push(serviceRepairId); }
      const { results } = await db.prepare(`SELECT * FROM communications ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM communications ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== 11. PICKUP & DELIVERY ====================

  app.post('/api/deliveries', async (c) => {
    try {
      await ensureServiceTables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const { serviceRepairId, deliveredTo, relationship, notes } = await c.req.json();
      if (!serviceRepairId || !deliveredTo) return c.json({ error: 'serviceRepairId and deliveredTo required' }, 400);
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      await db.prepare("INSERT INTO deliveries (id, shopId, serviceRepairId, deliveredTo, relationship, notes, status, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?)").bind(id, shopId, serviceRepairId, deliveredTo, relationship || null, notes || null, 'PENDING', now, now).run();
      return c.json({ data: { id, serviceRepairId, deliveredTo, relationship, notes, status: 'PENDING', createdAt: now } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/deliveries', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const status = c.req.query('status') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      let where = 'WHERE d.shopId = ?'; const params: any[] = [shopId];
      if (status) { where += ' AND d.status = ?'; params.push(status); }
      const { results } = await db.prepare(`SELECT d.*, sr.ticketNumber, c.name as customerName FROM deliveries d LEFT JOIN service_repairs sr ON d.serviceRepairId = sr.id LEFT JOIN customers c ON sr.customerId = c.id ${where} ORDER BY d.createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM deliveries d ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/deliveries/:id', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const body = await c.req.json();
      const allowed = ['deliveredTo', 'relationship', 'notes', 'status'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) { if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); } }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      vals.push(new Date().toISOString(), c.req.param('id'), shopId);
      await db.prepare(`UPDATE deliveries SET ${sets.join(', ')}, updatedAt = ? WHERE id = ? AND shopId = ?`).bind(...vals).run();
      const delivery = await db.prepare('SELECT * FROM deliveries WHERE id = ?').bind(c.req.param('id')).first();
      return c.json({ data: delivery });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/deliveries/signature', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { id, signature } = await c.req.json();
      if (!id || !signature) return c.json({ error: 'id and signature required' }, 400);
      const now = new Date().toISOString();
      await db.prepare("UPDATE deliveries SET signature = ?, status = 'COMPLETED', updatedAt = ? WHERE id = ? AND shopId = ?").bind(signature, now, id, shopId).run();
      return c.json({ data: { id, signature, status: 'COMPLETED' } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/deliveries/history', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await db.prepare("SELECT d.*, sr.ticketNumber FROM deliveries d LEFT JOIN service_repairs sr ON d.serviceRepairId = sr.id WHERE d.shopId = ? ORDER BY d.updatedAt DESC LIMIT ? OFFSET ?").bind(shopId, limit, offset).all();
      const { results: countRes } = await db.prepare('SELECT COUNT(*) as total FROM deliveries WHERE shopId = ?').bind(shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== 12. SERVICE PAYMENTS ====================

  app.post('/api/service-payments', async (c) => {
    try {
      await ensureServiceTables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const { serviceRepairId, serviceInvoiceId, amount, method, reference } = await c.req.json();
      if (!serviceInvoiceId || !amount) return c.json({ error: 'serviceInvoiceId and amount required' }, 400);
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      await db.prepare('INSERT INTO service_payments (id, shopId, serviceRepairId, serviceInvoiceId, amount, method, reference, status, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id, shopId, serviceRepairId || null, serviceInvoiceId, amount, method || 'CASH', reference || null, 'COMPLETED', now, now).run();
      const inv = await db.prepare('SELECT * FROM service_invoices WHERE id = ? AND shopId = ?').bind(serviceInvoiceId, shopId).first() as any;
      if (inv) {
        const newPaid = (inv.paid || 0) + amount;
        const newDue = Math.max(0, (inv.total || 0) - newPaid);
        const newStatus = newDue <= 0 ? 'PAID' : 'PARTIAL';
        await db.prepare('UPDATE service_invoices SET paid = ?, due = ?, status = ?, updatedAt = ? WHERE id = ?').bind(newPaid, newDue, newStatus, now, serviceInvoiceId).run();
      }
      if (serviceRepairId) {
        await addTimelineEntry(db, shopId, serviceRepairId, 'PAYMENT_RECEIVED', `Payment of ${amount} received`, c.var.userId);
      }
      return c.json({ data: { id, serviceInvoiceId, amount, method, reference, status: 'COMPLETED' } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/service-payments', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const serviceInvoiceId = c.req.query('serviceInvoiceId') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      let where = 'WHERE sp.shopId = ?'; const params: any[] = [shopId];
      if (serviceInvoiceId) { where += ' AND sp.serviceInvoiceId = ?'; params.push(serviceInvoiceId); }
      const { results } = await db.prepare(`SELECT sp.*, si.invoiceNumber FROM service_payments sp LEFT JOIN service_invoices si ON sp.serviceInvoiceId = si.id ${where} ORDER BY sp.createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM service_payments sp ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/service-payments/:id', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const payment = await db.prepare("SELECT sp.*, si.invoiceNumber FROM service_payments sp LEFT JOIN service_invoices si ON sp.serviceInvoiceId = si.id WHERE sp.id = ? AND sp.shopId = ?").bind(c.req.param('id'), shopId).first();
      if (!payment) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: payment });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/service-payments/refund', async (c) => {
    try {
      await ensureServiceTables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const { serviceRepairId, serviceInvoiceId, amount, method, reference, reason } = await c.req.json();
      if (!serviceInvoiceId || !amount) return c.json({ error: 'serviceInvoiceId and amount required' }, 400);
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      const refundAmount = -Math.abs(amount);
      await db.prepare('INSERT INTO service_payments (id, shopId, serviceRepairId, serviceInvoiceId, amount, method, reference, status, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id, shopId, serviceRepairId || null, serviceInvoiceId, refundAmount, method || 'CASH', reference || reason || null, 'COMPLETED', now, now).run();
      const inv = await db.prepare('SELECT * FROM service_invoices WHERE id = ? AND shopId = ?').bind(serviceInvoiceId, shopId).first() as any;
      if (inv) {
        const newPaid = Math.max(0, (inv.paid || 0) + refundAmount);
        const newDue = (inv.total || 0) - newPaid;
        const newStatus = newDue <= 0 ? 'PAID' : 'PARTIAL';
        await db.prepare('UPDATE service_invoices SET paid = ?, due = ?, status = ?, updatedAt = ? WHERE id = ?').bind(newPaid, newDue, newStatus, now, serviceInvoiceId).run();
      }
      if (serviceRepairId) {
        await addTimelineEntry(db, shopId, serviceRepairId, 'REFUND_ISSUED', `Refund of ${Math.abs(amount)} issued`, c.var.userId);
      }
      return c.json({ data: { id, serviceInvoiceId, amount: refundAmount, method, reference, status: 'COMPLETED', type: 'REFUND' } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/service-payments/history', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await db.prepare("SELECT sp.*, si.invoiceNumber, sr.ticketNumber FROM service_payments sp LEFT JOIN service_invoices si ON sp.serviceInvoiceId = si.id LEFT JOIN service_repairs sr ON sp.serviceRepairId = sr.id WHERE sp.shopId = ? ORDER BY sp.createdAt DESC LIMIT ? OFFSET ?").bind(shopId, limit, offset).all();
      const { results: countRes } = await db.prepare('SELECT COUNT(*) as total FROM service_payments WHERE shopId = ?').bind(shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== 13. REPAIR TIMELINE & ACTIVITY ====================

  app.post('/api/service-timeline', async (c) => {
    try {
      await ensureServiceTables(c.env.DB);
      const db = c.env.DB; const shopId = c.var.shopId;
      const { serviceRepairId, action, description, performedBy } = await c.req.json();
      if (!serviceRepairId || !action) return c.json({ error: 'serviceRepairId and action required' }, 400);
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      await db.prepare('INSERT INTO service_timelines (id, shopId, serviceRepairId, action, description, performedBy, createdAt) VALUES (?,?,?,?,?,?,?)').bind(id, shopId, serviceRepairId, action, description || null, performedBy || c.var.userId, now).run();
      return c.json({ data: { id, serviceRepairId, action, description, performedBy, createdAt: now } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/service-timeline/:serviceId', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { results } = await db.prepare('SELECT st.*, u.name as performedByName FROM service_timelines st LEFT JOIN users u ON st.performedBy = u.id WHERE st.shopId = ? AND st.serviceRepairId = ? ORDER BY st.createdAt DESC').bind(shopId, c.req.param('serviceId')).all();
      return c.json({ data: results });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/service-timeline/:id', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const body = await c.req.json();
      const allowed = ['action', 'description', 'performedBy'];
      const sets: string[] = []; const vals: any[] = [];
      for (const k of allowed) { if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]); } }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      vals.push(c.req.param('id'), shopId);
      await db.prepare(`UPDATE service_timelines SET ${sets.join(', ')} WHERE id = ? AND shopId = ?`).bind(...vals).run();
      return c.json({ message: 'Updated' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.delete('/api/service-timeline/:id', async (c) => {
    try {
      await c.env.DB.prepare('DELETE FROM service_timelines WHERE id = ? AND shopId = ?').bind(c.req.param('id'), c.var.shopId).run();
      return c.json({ message: 'Deleted' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/service-timeline/activity', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const fromDate = c.req.query('fromDate') || ''; const toDate = c.req.query('toDate') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      let where = 'WHERE st.shopId = ?'; const params: any[] = [shopId];
      if (fromDate) { where += ' AND st.createdAt >= ?'; params.push(fromDate); }
      if (toDate) { where += ' AND st.createdAt <= ?'; params.push(toDate); }
      const { results } = await db.prepare(`SELECT st.*, u.name as performedByName, sr.ticketNumber FROM service_timelines st LEFT JOIN users u ON st.performedBy = u.id LEFT JOIN service_repairs sr ON st.serviceRepairId = sr.id ${where} ORDER BY st.createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare(`SELECT COUNT(*) as total FROM service_timelines st ${where}`).bind(...params).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== 14. CUSTOMER REPAIR PORTAL ====================

  app.get('/api/tracking/job/:jobNumber', async (c) => {
    try {
      const db = c.env.DB;
      const card = await db.prepare("SELECT j.*, sr.status as serviceStatus, sr.ticketNumber, sr.deviceType, sr.deviceBrand, sr.deviceModel, sr.imei, sr.issueDescription, sr.estimatedCost, sr.actualCost, sr.deliveryDate, c.name as customerName FROM job_cards j LEFT JOIN service_repairs sr ON j.serviceRepairId = sr.id LEFT JOIN customers c ON sr.customerId = c.id WHERE j.jobNumber = ?").bind(c.req.param('jobNumber')).first();
      if (!card) return c.json({ error: 'Not found' }, 404);
      const { results: timeline } = await db.prepare('SELECT * FROM service_timelines WHERE serviceRepairId = ? ORDER BY createdAt DESC').bind((card as any).serviceRepairId).all();
      return c.json({ data: { ...(card as any), timeline } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/tracking/mobile/:mobile', async (c) => {
    try {
      const db = c.env.DB;
      const mobile = c.req.param('mobile');
      const { results } = await db.prepare("SELECT s.*, c.name as customerName FROM service_repairs s JOIN customers c ON s.customerId = c.id WHERE c.phone = ? ORDER BY s.createdAt DESC").bind(mobile).all();
      return c.json({ data: results });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/tracking/imei/:imei', async (c) => {
    try {
      const db = c.env.DB;
      const imei = c.req.param('imei');
      const { results } = await db.prepare("SELECT s.*, c.name as customerName FROM service_repairs s LEFT JOIN customers c ON s.customerId = c.id WHERE s.imei = ? ORDER BY s.createdAt DESC").bind(imei).all();
      return c.json({ data: results });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/tracking/invoice/:id', async (c) => {
    try {
      const db = c.env.DB;
      const inv = await db.prepare("SELECT si.*, sr.ticketNumber, sr.deviceType, sr.deviceBrand, sr.deviceModel, sr.imei, c.name as customerName, c.phone as customerPhone FROM service_invoices si LEFT JOIN service_repairs sr ON si.serviceRepairId = sr.id LEFT JOIN customers c ON sr.customerId = c.id WHERE si.id = ?").bind(c.req.param('id')).first();
      if (!inv) return c.json({ error: 'Not found' }, 404);
      const { results: payments } = await db.prepare('SELECT * FROM service_payments WHERE serviceInvoiceId = ?').bind((inv as any).id).all();
      return c.json({ data: { ...(inv as any), payments } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/tracking/warranty/:id', async (c) => {
    try {
      const db = c.env.DB;
      const warranty = await db.prepare("SELECT w.*, p.name as productName, c.name as customerName FROM warranties w LEFT JOIN products p ON w.productId = p.id LEFT JOIN customers c ON w.customerId = c.id WHERE w.id = ?").bind(c.req.param('id')).first();
      if (!warranty) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: warranty });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/tracking/timeline/:id', async (c) => {
    try {
      const db = c.env.DB;
      const { results } = await db.prepare('SELECT st.*, u.name as performedByName FROM service_timelines st LEFT JOIN users u ON st.performedBy = u.id WHERE st.serviceRepairId = ? ORDER BY st.createdAt DESC').bind(c.req.param('id')).all();
      return c.json({ data: results });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== WARRANTY MANAGEMENT ====================

  app.post('/api/warranties', async (c) => {
    try {
      const body = await c.req.json();
      const { customerId, type, startDate, endDate, terms, productId, saleId, imei, serviceRepairId } = body;
      if (!startDate || !endDate) return c.json({ error: 'startDate, endDate required' }, 400);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await c.env.DB.prepare(
        'INSERT INTO warranties (id, shopId, customerId, productId, saleId, imei, type, startDate, endDate, terms, status, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
      ).bind(id, c.var.shopId, customerId || null, productId || null, saleId || null, imei || null, type || 'PRODUCT', startDate, endDate, terms || null, 'ACTIVE', now, now).run();
      return c.json({ data: { id, type: type || 'PRODUCT', startDate, endDate, terms: terms || null, status: 'ACTIVE', saleId: saleId || null, imei: imei || null } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/warranties', async (c) => {
    try {
      const db = c.env.DB;
      const status = c.req.query('status') || '';
      const type = c.req.query('type') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      let where = 'WHERE w.shopId = ?';
      const params: any[] = [c.var.shopId];
      const countParams: any[] = [c.var.shopId];
      let countWhere = 'WHERE shopId = ?';
      if (status) { where += ' AND w.status = ?'; countWhere += ' AND status = ?'; params.push(status); countParams.push(status); }
      if (type) { where += ' AND w.type = ?'; countWhere += ' AND type = ?'; params.push(type); countParams.push(type); }
      const { results } = await db.prepare('SELECT w.*, p.name as productName, c.name as customerName FROM warranties w LEFT JOIN products p ON w.productId = p.id LEFT JOIN customers c ON w.customerId = c.id ' + where + ' ORDER BY w.createdAt DESC LIMIT ? OFFSET ?').bind(...params, limit, offset).all();
      const { results: countRes } = await db.prepare('SELECT COUNT(*) as total FROM warranties ' + countWhere).bind(...countParams).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/warranties/active', async (c) => {
    try {
      const db = c.env.DB;
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await db.prepare('SELECT w.*, p.name as productName, c.name as customerName FROM warranties w LEFT JOIN products p ON w.productId = p.id LEFT JOIN customers c ON w.customerId = c.id WHERE w.shopId = ? AND w.status = \'ACTIVE\' ORDER BY w.endDate ASC LIMIT ? OFFSET ?').bind(c.var.shopId, limit, offset).all();
      const { results: countRes } = await db.prepare('SELECT COUNT(*) as total FROM warranties WHERE shopId = ? AND status = \'ACTIVE\'').bind(c.var.shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/warranties/expired', async (c) => {
    try {
      const db = c.env.DB;
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await db.prepare('SELECT w.*, p.name as productName, c.name as customerName FROM warranties w LEFT JOIN products p ON w.productId = p.id LEFT JOIN customers c ON w.customerId = c.id WHERE w.shopId = ? AND (w.status = \'EXPIRED\' OR w.endDate < date(\'now\')) ORDER BY w.endDate DESC LIMIT ? OFFSET ?').bind(c.var.shopId, limit, offset).all();
      const { results: countRes } = await db.prepare('SELECT COUNT(*) as total FROM warranties WHERE shopId = ? AND (status = \'EXPIRED\' OR endDate < date(\'now\'))').bind(c.var.shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/warranties/claims', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await db.prepare("SELECT w.*, p.name as productName, c.name as customerName FROM warranties w LEFT JOIN products p ON w.productId = p.id LEFT JOIN customers c ON w.customerId = c.id WHERE w.shopId = ? AND w.status = 'CLAIMED' ORDER BY w.updatedAt DESC LIMIT ? OFFSET ?").bind(shopId, limit, offset).all();
      const { results: countRes } = await db.prepare("SELECT COUNT(*) as total FROM warranties WHERE shopId = ? AND status = 'CLAIMED'").bind(shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/warranties/:id', async (c) => {
    try {
      const warranty = await c.env.DB.prepare('SELECT w.*, p.name as productName, c.name as customerName FROM warranties w LEFT JOIN products p ON w.productId = p.id LEFT JOIN customers c ON w.customerId = c.id WHERE w.id = ? AND w.shopId = ?').bind(c.req.param('id'), c.var.shopId).first();
      if (!warranty) return c.json({ error: 'Not found' }, 404);
      return c.json({ data: warranty });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/warranties/:id', async (c) => {
    try {
      const body = await c.req.json();
      const allowed = ['type', 'endDate', 'terms', 'status'];
      const sets: string[] = [];
      const vals: any[] = [];
      for (const [k, v] of Object.entries(body)) {
        if (allowed.includes(k)) { sets.push(`${k} = ?`); vals.push(v); }
      }
      if (!sets.length) return c.json({ error: 'No valid fields' }, 400);
      sets.push('updatedAt = ?');
      vals.push(new Date().toISOString(), c.req.param('id'), c.var.shopId);
      await c.env.DB.prepare(`UPDATE warranties SET ${sets.join(', ')} WHERE id = ? AND shopId = ?`).bind(...vals).run();
      return c.json({ message: 'Updated' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/warranties/claim', async (c) => {
    try {
      const { id, claimNotes } = await c.req.json();
      if (!id) return c.json({ error: 'id required' }, 400);
      const now = new Date().toISOString();
      await c.env.DB.prepare("UPDATE warranties SET status = 'CLAIMED', updatedAt = ? WHERE id = ? AND shopId = ?").bind(now, id, c.var.shopId).run();
      return c.json({ message: 'Claim submitted', data: { id, status: 'CLAIMED', claimNotes: claimNotes || null } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/service-reports/categories', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const { results } = await db.prepare("SELECT deviceType, COUNT(*) as count, SUM(CASE WHEN status IN ('COMPLETED','DELIVERED') THEN 1 ELSE 0 END) as completed FROM service_repairs WHERE shopId = ? AND deviceType IS NOT NULL GROUP BY deviceType ORDER BY count DESC").bind(shopId).all();
      const { results: totals } = await db.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN status IN ('COMPLETED','DELIVERED') THEN 1 ELSE 0 END) as done FROM service_repairs WHERE shopId = ?").bind(shopId).all();
      return c.json({ data: results || [], summary: (totals as any)?.[0] || { total: 0, done: 0 } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/service-reports/technician/:id', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const tech = await db.prepare("SELECT id, name, email, phone, designation, joinDate, status FROM employees WHERE id = ? AND shopId = ? AND (designation LIKE '%TECHNICIAN%' OR designation LIKE '%Service%')").bind(c.req.param('id'), shopId).first();
      if (!tech) return c.json({ error: 'Technician not found' }, 404);
      const [assigned, completed, inProgress, avgTime, recent] = await Promise.all([
        db.prepare("SELECT COUNT(*) as c FROM service_repairs WHERE technicianId = ? AND shopId = ?").bind(c.req.param('id'), shopId).first(),
        db.prepare("SELECT COUNT(*) as c FROM service_repairs WHERE technicianId = ? AND shopId = ? AND status IN ('COMPLETED','DELIVERED')").bind(c.req.param('id'), shopId).first(),
        db.prepare("SELECT COUNT(*) as c FROM service_repairs WHERE technicianId = ? AND shopId = ? AND status = 'IN_PROGRESS'").bind(c.req.param('id'), shopId).first(),
        db.prepare("SELECT AVG(julianday(updatedAt) - julianday(createdAt)) as avg FROM service_repairs WHERE technicianId = ? AND shopId = ? AND status IN ('COMPLETED','DELIVERED')").bind(c.req.param('id'), shopId).first(),
        db.prepare("SELECT id, ticketNumber, deviceType, deviceBrand, deviceModel, status, createdAt FROM service_repairs WHERE technicianId = ? AND shopId = ? ORDER BY createdAt DESC LIMIT 10").bind(c.req.param('id'), shopId).all(),
      ]);
      return c.json({ data: { technician: tech, stats: { assigned: (assigned as any)?.c || 0, completed: (completed as any)?.c || 0, inProgress: (inProgress as any)?.c || 0, avgCompletionDays: (avgTime as any)?.avg || 0 }, recentJobs: (recent as any)?.results || [] } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/service-parts/low-stock', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      const threshold = parseInt(c.req.query('threshold') || '5');
      const { results } = await db.prepare("SELECT sri.*, p.name as productName, p.sku FROM service_repair_items sri JOIN service_repairs sr ON sr.id = sri.serviceRepairId LEFT JOIN products p ON sri.productId = p.id WHERE sr.shopId = ? AND sri.quantity <= ? ORDER BY sri.quantity ASC LIMIT ? OFFSET ?").bind(shopId, threshold, limit, offset).all();
      const { results: countRes } = await db.prepare("SELECT COUNT(*) as total FROM service_repair_items sri JOIN service_repairs sr ON sr.id = sri.serviceRepairId WHERE sr.shopId = ? AND sri.quantity <= ?").bind(shopId, threshold).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

}
