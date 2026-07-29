export function serviceReportsRoutes(app: any) {

  // ==================== SERVICE DASHBOARD ====================

  app.get('/api/service-dashboard', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const today = new Date().toISOString().slice(0, 10);

      const [todayRep, pendRep, inProg, waitApp, readyDel, delToday, revToday, techCount] = await Promise.all([
        db.prepare("SELECT COUNT(*) as total FROM service_repairs WHERE shopId = ? AND date(createdAt) = ?").bind(shopId, today).first(),
        db.prepare("SELECT COUNT(*) as total FROM service_repairs WHERE shopId = ? AND status IN ('RECEIVED','PENDING')").bind(shopId).first(),
        db.prepare("SELECT COUNT(*) as total FROM service_repairs WHERE shopId = ? AND status = 'IN_PROGRESS'").bind(shopId).first(),
        db.prepare("SELECT COUNT(*) as total FROM service_repairs WHERE shopId = ? AND status = 'AWAITING_APPROVAL'").bind(shopId).first(),
        db.prepare("SELECT COUNT(*) as total FROM service_repairs WHERE shopId = ? AND status IN ('QC_PASSED','READY_FOR_DELIVERY')").bind(shopId).first(),
        db.prepare("SELECT COUNT(*) as total FROM service_repairs WHERE shopId = ? AND status = 'DELIVERED' AND date(updatedAt) = ?").bind(shopId, today).first(),
        db.prepare("SELECT COALESCE(SUM(total),0) as total FROM service_invoices WHERE shopId = ? AND status = 'PAID' AND date(createdAt) = ?").bind(shopId, today).first(),
        db.prepare("SELECT COUNT(*) as total FROM employees WHERE shopId = ? AND (designation LIKE '%TECHNICIAN%' OR designation LIKE '%Service%') AND status = 'ACTIVE'").bind(shopId).first(),
      ]);

      return c.json({
        todayRepairs: (todayRep as any)?.total || 0,
        pendingRepairs: (pendRep as any)?.total || 0,
        inProgress: (inProg as any)?.total || 0,
        waitingApproval: (waitApp as any)?.total || 0,
        readyForDelivery: (readyDel as any)?.total || 0,
        deliveredToday: (delToday as any)?.total || 0,
        revenueToday: (revToday as any)?.total || 0,
        technicianCount: (techCount as any)?.total || 0,
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/service-dashboard/statistics', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;

      const [totalServices, totalRevenue, avgRepairTime, totalPartsUsed, totalWarrantiesActive] = await Promise.all([
        db.prepare("SELECT COUNT(*) as total FROM service_repairs WHERE shopId = ?").bind(shopId).first(),
        db.prepare("SELECT COALESCE(SUM(total),0) as total FROM service_invoices WHERE shopId = ? AND status = 'PAID'").bind(shopId).first(),
        db.prepare("SELECT AVG(julianday(updatedAt) - julianday(createdAt)) as avgDays FROM service_repairs WHERE shopId = ? AND status IN ('COMPLETED','DELIVERED')").bind(shopId).first(),
        db.prepare("SELECT COALESCE(SUM(quantity),0) as total FROM service_repair_items sri JOIN service_repairs sr ON sr.id = sri.serviceRepairId WHERE sr.shopId = ?").bind(shopId).first(),
        db.prepare("SELECT COUNT(*) as total FROM warranties WHERE shopId = ? AND status = 'ACTIVE'").bind(shopId).first(),
      ]);

      return c.json({
        totalServices: (totalServices as any)?.total || 0,
        totalRevenue: (totalRevenue as any)?.total || 0,
        avgRepairTime: (avgRepairTime as any)?.avgDays || 0,
        totalPartsUsed: (totalPartsUsed as any)?.total || 0,
        totalWarrantiesActive: (totalWarrantiesActive as any)?.total || 0,
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/service-dashboard/live', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;

      const [techRes, recentRes] = await Promise.all([
        db.prepare("SELECT e.id, e.name, e.designation, COUNT(jc.id) as activeJobs FROM employees e LEFT JOIN job_cards jc ON jc.assignedTo = e.id AND jc.status IN ('ASSIGNED','IN_PROGRESS') WHERE e.shopId = ? AND (e.designation LIKE '%TECHNICIAN%' OR e.designation LIKE '%Service%') AND e.status = 'ACTIVE' GROUP BY e.id").bind(shopId).all(),
        db.prepare("SELECT sr.*, c.name as customerName, c.phone as customerPhone FROM service_repairs sr LEFT JOIN customers c ON c.id = sr.customerId WHERE sr.shopId = ? ORDER BY sr.updatedAt DESC LIMIT 10").bind(shopId).all(),
      ]);

      return c.json({
        technicians: (techRes as any)?.results || [],
        recentRepairs: (recentRes as any)?.results || [],
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/service-dashboard/charts', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;

      const [weekly, statusDist, brandDist, revenue, workload] = await Promise.all([
        db.prepare("SELECT date(createdAt) as day, COUNT(*) as count FROM service_repairs WHERE shopId = ? AND createdAt >= date('now','-7 days') GROUP BY date(createdAt) ORDER BY day").bind(shopId).all(),
        db.prepare("SELECT status, COUNT(*) as count FROM service_repairs WHERE shopId = ? GROUP BY status").bind(shopId).all(),
        db.prepare("SELECT deviceBrand, COUNT(*) as count FROM service_repairs WHERE shopId = ? AND deviceBrand IS NOT NULL GROUP BY deviceBrand ORDER BY count DESC").bind(shopId).all(),
        db.prepare("SELECT date(createdAt) as day, SUM(total) as total FROM service_invoices WHERE shopId = ? AND status = 'PAID' AND createdAt >= date('now','-30 days') GROUP BY date(createdAt) ORDER BY day").bind(shopId).all(),
        db.prepare("SELECT e.id, e.name, COUNT(sr.id) as totalAssigned, SUM(CASE WHEN sr.status IN ('COMPLETED','DELIVERED') THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN sr.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as inProgress FROM employees e LEFT JOIN service_repairs sr ON sr.technicianId = e.id AND sr.shopId = ? WHERE e.shopId = ? AND (e.designation LIKE '%TECHNICIAN%' OR e.designation LIKE '%Service%') AND e.status = 'ACTIVE' GROUP BY e.id").bind(shopId, shopId).all(),
      ]);

      return c.json({
        weeklyRepairs: (weekly as any)?.results || [],
        statusDistribution: (statusDist as any)?.results || [],
        brandDistribution: (brandDist as any)?.results || [],
        revenueByDay: (revenue as any)?.results || [],
        technicianWorkload: (workload as any)?.results || [],
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== SERVICE REPORTS ====================

  app.get('/api/service-reports/pending', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const sort = c.req.query('sort') || 'createdAt';
      const order = c.req.query('order') || 'DESC';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');

      const allowedSort = ['createdAt', 'updatedAt', 'ticketNumber', 'deviceType', 'status'];
      const sortCol = allowedSort.includes(sort) ? sort : 'createdAt';
      const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

      const { results } = await db.prepare(
        `SELECT sr.*, c.name as customerName, c.phone as customerPhone FROM service_repairs sr LEFT JOIN customers c ON c.id = sr.customerId WHERE sr.shopId = ? AND sr.status IN ('RECEIVED','PENDING','IN_PROGRESS','AWAITING_APPROVAL','QC_PASSED','READY_FOR_DELIVERY') ORDER BY sr.${sortCol} ${sortOrder} LIMIT ? OFFSET ?`
      ).bind(shopId, limit, offset).all();

      const { results: countRes } = await db.prepare(
        "SELECT COUNT(*) as total FROM service_repairs WHERE shopId = ? AND status IN ('RECEIVED','PENDING','IN_PROGRESS','AWAITING_APPROVAL','QC_PASSED','READY_FOR_DELIVERY')"
      ).bind(shopId).all();

      return c.json({
        data: results,
        total: (countRes as any)[0]?.total || 0,
        limit,
        offset,
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/service-reports/completed', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const fromDate = c.req.query('fromDate') || '';
      const toDate = c.req.query('toDate') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');

      let where = "sr.shopId = ? AND sr.status IN ('COMPLETED','DELIVERED')";
      const params: any[] = [shopId];
      if (fromDate) { where += ' AND sr.updatedAt >= ?'; params.push(fromDate); }
      if (toDate) { where += ' AND sr.updatedAt <= ?'; params.push(toDate); }

      const { results } = await db.prepare(
        `SELECT sr.*, c.name as customerName, c.phone as customerPhone, si.total as invoiceTotal, si.status as invoiceStatus FROM service_repairs sr LEFT JOIN customers c ON c.id = sr.customerId LEFT JOIN service_invoices si ON si.serviceRepairId = sr.id WHERE ${where} ORDER BY sr.updatedAt DESC LIMIT ? OFFSET ?`
      ).bind(...params, limit, offset).all();

      const { results: countRes } = await db.prepare(
        `SELECT COUNT(*) as total FROM service_repairs sr WHERE ${where}`
      ).bind(...params).all();

      return c.json({
        data: results,
        total: (countRes as any)[0]?.total || 0,
        limit,
        offset,
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/service-reports/technicians', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const fromDate = c.req.query('fromDate') || '';
      const toDate = c.req.query('toDate') || '';

      let dateFilter = '';
      const params: any[] = [shopId, shopId];
      if (fromDate) { dateFilter += ' AND sr.createdAt >= ?'; params.push(fromDate); }
      if (toDate) { dateFilter += ' AND sr.createdAt <= ?'; params.push(toDate); }

      const { results } = await db.prepare(
        `SELECT e.id, e.name as technicianName, e.designation, COUNT(sr.id) as totalAssigned, SUM(CASE WHEN sr.status IN ('COMPLETED','DELIVERED') THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN sr.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as inProgress, AVG(CASE WHEN sr.status IN ('COMPLETED','DELIVERED') THEN julianday(sr.updatedAt) - julianday(sr.createdAt) END) as avgCompletionTime FROM employees e LEFT JOIN service_repairs sr ON sr.technicianId = e.id AND sr.shopId = ?${dateFilter} WHERE e.shopId = ? AND (e.designation LIKE '%TECHNICIAN%' OR e.designation LIKE '%Service%') AND e.status = 'ACTIVE' GROUP BY e.id ORDER BY totalAssigned DESC`
      ).bind(...params).all();

      return c.json({ data: results || [] });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/service-reports/revenue', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const fromDate = c.req.query('fromDate') || '';
      const toDate = c.req.query('toDate') || '';
      const groupBy = c.req.query('groupBy') || 'day';

      let where = 'shopId = ? AND status = \'PAID\'';
      const params: any[] = [shopId];
      if (fromDate) { where += ' AND createdAt >= ?'; params.push(fromDate); }
      if (toDate) { where += ' AND createdAt <= ?'; params.push(toDate); }

      const periodExpr = groupBy === 'month' ? "strftime('%Y-%m', createdAt)" : "date(createdAt)";

      const { results } = await db.prepare(
        `SELECT ${periodExpr} as period, COALESCE(SUM(laborCharges),0) as laborCharges, COALESCE(SUM(sparePartsCost),0) as sparePartsCost, COALESCE(SUM(tax),0) as tax, COALESCE(SUM(discount),0) as discount, COALESCE(SUM(total),0) as total, COUNT(*) as invoiceCount FROM service_invoices WHERE ${where} GROUP BY ${periodExpr} ORDER BY period DESC`
      ).bind(...params).all();

      const { results: summaryRes } = await db.prepare(
        `SELECT COALESCE(SUM(laborCharges),0) as totalLabor, COALESCE(SUM(sparePartsCost),0) as totalParts, COALESCE(SUM(tax),0) as totalTax, COALESCE(SUM(discount),0) as totalDiscount, COALESCE(SUM(total),0) as grandTotal, COUNT(*) as totalInvoices FROM service_invoices WHERE ${where}`
      ).bind(...params).all();

      const summary = (summaryRes as any)?.[0] || {};

      return c.json({
        data: results || [],
        summary: {
          totalLabor: summary.totalLabor || 0,
          totalParts: summary.totalParts || 0,
          totalTax: summary.totalTax || 0,
          totalDiscount: summary.totalDiscount || 0,
          grandTotal: summary.grandTotal || 0,
          totalInvoices: summary.totalInvoices || 0,
        },
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/service-reports/warranty', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;

      const [statusCounts, activeExpired, pendingClaims, recentWarranties] = await Promise.all([
        db.prepare("SELECT status, COUNT(*) as count FROM warranties WHERE shopId = ? GROUP BY status").bind(shopId).all(),
        db.prepare("SELECT SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active, SUM(CASE WHEN status = 'EXPIRED' THEN 1 ELSE 0 END) as expired FROM warranties WHERE shopId = ?").bind(shopId).first(),
        db.prepare("SELECT COUNT(*) as total FROM warranties WHERE shopId = ? AND status IN ('PENDING','CLAIMED')").bind(shopId).first(),
        db.prepare("SELECT w.*, p.name as productName, c.name as customerName FROM warranties w LEFT JOIN products p ON p.id = w.productId LEFT JOIN customers c ON c.id = w.customerId WHERE w.shopId = ? ORDER BY w.createdAt DESC LIMIT 20").bind(shopId).all(),
      ]);

      return c.json({
        byStatus: (statusCounts as any)?.results || [],
        activeCount: (activeExpired as any)?.active || 0,
        expiredCount: (activeExpired as any)?.expired || 0,
        pendingClaims: (pendingClaims as any)?.total || 0,
        recent: (recentWarranties as any)?.results || [],
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/service-reports/spare-parts', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const fromDate = c.req.query('fromDate') || '';
      const toDate = c.req.query('toDate') || '';

      let dateFilter = '';
      const params: any[] = [shopId];
      if (fromDate) { dateFilter += ' AND sri.createdAt >= ?'; params.push(fromDate); }
      if (toDate) { dateFilter += ' AND sri.createdAt <= ?'; params.push(toDate); }

      const { results } = await db.prepare(
        `SELECT sri.productId, sri.productName, SUM(sri.quantity) as totalQuantity, SUM(sri.quantity * sri.price) as totalCost, COUNT(DISTINCT sri.serviceRepairId) as repairCount FROM service_repair_items sri JOIN service_repairs sr ON sr.id = sri.serviceRepairId WHERE sr.shopId = ?${dateFilter} GROUP BY sri.productId, sri.productName ORDER BY totalQuantity DESC`
      ).bind(...params).all();

      const { results: summaryRes } = await db.prepare(
        `SELECT COUNT(DISTINCT sri.productId) as uniqueParts, COALESCE(SUM(sri.quantity),0) as totalQuantity, COALESCE(SUM(sri.quantity * sri.price),0) as totalCost FROM service_repair_items sri JOIN service_repairs sr ON sr.id = sri.serviceRepairId WHERE sr.shopId = ?${dateFilter}`
      ).bind(...params).all();

      const summary = (summaryRes as any)?.[0] || {};

      return c.json({
        data: results || [],
        summary: {
          uniqueParts: summary.uniqueParts || 0,
          totalQuantity: summary.totalQuantity || 0,
          totalCost: summary.totalCost || 0,
        },
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/service-reports/models', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;

      const [byBrand, byModel, commonIssues] = await Promise.all([
        db.prepare("SELECT deviceBrand, COUNT(*) as count FROM service_repairs WHERE shopId = ? AND deviceBrand IS NOT NULL GROUP BY deviceBrand ORDER BY count DESC").bind(shopId).all(),
        db.prepare("SELECT deviceBrand, deviceModel, COUNT(*) as count FROM service_repairs WHERE shopId = ? AND deviceModel IS NOT NULL GROUP BY deviceBrand, deviceModel ORDER BY count DESC").bind(shopId).all(),
        db.prepare("SELECT issueDescription, COUNT(*) as count FROM service_repairs WHERE shopId = ? AND issueDescription IS NOT NULL GROUP BY issueDescription ORDER BY count DESC LIMIT 20").bind(shopId).all(),
      ]);

      return c.json({
        byBrand: (byBrand as any)?.results || [],
        byModel: (byModel as any)?.results || [],
        commonIssues: (commonIssues as any)?.results || [],
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== EXPORT ENDPOINTS ====================

  const handleExport = async (c: any, ext: string) => {
    try {
      let body: any = {};
      try { body = await c.req.json(); } catch { body = {}; }
      const reportType = body.type || 'default';
      const exportId = crypto.randomUUID();
      return c.json({
        message: 'Report generated',
        url: `https://stiqr-backend.ksangeeth76.workers.dev/reports/export/${exportId}.${ext}`,
        reportType,
        expiresIn: '24h',
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  };

  app.post('/api/service-reports/export/pdf', (c) => handleExport(c, 'pdf'));
  app.post('/api/service-reports/export/excel', (c) => handleExport(c, 'xlsx'));
  app.post('/api/service-reports/export/csv', (c) => handleExport(c, 'csv'));
}
