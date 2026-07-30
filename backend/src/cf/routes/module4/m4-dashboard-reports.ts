export function m4DashboardReportsRoutes(app: any) {

  // ==================== DASHBOARD: SERVICES ====================

  app.get('/api/dashboard/services', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const today = new Date().toISOString().slice(0, 10);

      const [byStatus, todayCount, pendingCount, avgTime] = await Promise.all([
        db.prepare("SELECT status, COUNT(*) as count FROM service_repairs WHERE shopId = ? GROUP BY status").bind(shopId).all(),
        db.prepare("SELECT COUNT(*) as count FROM service_repairs WHERE shopId = ? AND date(createdAt) = ?").bind(shopId, today).first(),
        db.prepare("SELECT COUNT(*) as count FROM service_repairs WHERE shopId = ? AND status IN ('RECEIVED','PENDING','IN_PROGRESS','AWAITING_APPROVAL','QC_PASSED','READY_FOR_DELIVERY')").bind(shopId).first(),
        db.prepare("SELECT AVG(julianday(updatedAt) - julianday(createdAt)) as avgDays FROM service_repairs WHERE shopId = ? AND status IN ('COMPLETED','DELIVERED')").bind(shopId).first(),
      ]);

      return c.json({
        byStatus: (byStatus as any)?.results || [],
        todayCount: (todayCount as any)?.count || 0,
        pendingCount: (pendingCount as any)?.count || 0,
        avgRepairDays: (avgTime as any)?.avgDays || 0,
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== DASHBOARD: EXPENSES ====================

  app.get('/api/dashboard/expenses', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const today = new Date().toISOString().slice(0, 10);
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

      const [todayTotal, monthTotal, byCategory, recent] = await Promise.all([
        db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE shopId = ? AND date(createdAt) = ?").bind(shopId, today).first(),
        db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE shopId = ? AND date(createdAt) >= ?").bind(shopId, monthStart).first(),
        db.prepare("SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM expenses WHERE shopId = ? GROUP BY category ORDER BY total DESC").bind(shopId).all(),
        db.prepare("SELECT * FROM expenses WHERE shopId = ? ORDER BY createdAt DESC LIMIT 5").bind(shopId).all(),
      ]);

      return c.json({
        todayTotal: (todayTotal as any)?.total || 0,
        monthTotal: (monthTotal as any)?.total || 0,
        byCategory: (byCategory as any)?.results || [],
        recent: (recent as any)?.results || [],
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== DASHBOARD: STAFF ====================

  app.get('/api/dashboard/staff', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;

      const [activeCount, byDesignation, recentActive] = await Promise.all([
        db.prepare("SELECT COUNT(*) as count FROM employees WHERE shopId = ? AND status = 'ACTIVE' AND deletedAt IS NULL").bind(shopId).first(),
        db.prepare("SELECT designation, COUNT(*) as count FROM employees WHERE shopId = ? AND status = 'ACTIVE' AND deletedAt IS NULL GROUP BY designation ORDER BY count DESC").bind(shopId).all(),
        db.prepare("SELECT id, name, designation, updatedAt FROM employees WHERE shopId = ? AND status = 'ACTIVE' AND deletedAt IS NULL ORDER BY updatedAt DESC LIMIT 10").bind(shopId).all(),
      ]);

      return c.json({
        activeStaff: (activeCount as any)?.count || 0,
        byDesignation: (byDesignation as any)?.results || [],
        recentlyActive: (recentActive as any)?.results || [],
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== DASHBOARD: SUBSCRIPTION ====================

  app.get('/api/dashboard/subscription', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;

      const shop = await db.prepare("SELECT id, name, slug, isActive, createdAt FROM shops WHERE id = ?").bind(shopId).first() as any;
      if (!shop) return c.json({ error: 'Shop not found' }, 404);

      const sub = await db.prepare(
        "SELECT s.*, sp.name as planName, sp.monthlyPrice, sp.yearlyPrice, sp.features, sp.code as planCode FROM subscriptions s LEFT JOIN subscription_plans sp ON sp.id = s.subscriptionPlanId WHERE s.tenantId = (SELECT tenantId FROM users WHERE shopId = ? AND tenantId IS NOT NULL LIMIT 1) ORDER BY s.createdAt DESC LIMIT 1"
      ).bind(shopId).first();

      return c.json({
        data: {
          shop: { id: shop.id, name: shop.name, slug: shop.slug, isActive: shop.isActive, createdAt: shop.createdAt },
          subscription: sub || null,
        },
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== DASHBOARD: CHARTS ====================

  app.get('/api/dashboard/charts', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;

      const [dailySales, salesByCategory, expensesByCategory, profitTrend] = await Promise.all([
        db.prepare("SELECT date as label, COALESCE(SUM(total), 0) as value FROM sales WHERE shopId = ? AND status != 'CANCELLED' AND date >= date('now','-30 days') GROUP BY date ORDER BY date ASC").bind(shopId).all(),
        db.prepare("SELECT c.name as label, COALESCE(SUM(si.quantity * si.unitPrice), 0) as value FROM sale_items si JOIN sales s ON s.id = si.saleId AND s.status != 'CANCELLED' LEFT JOIN products p ON p.id = si.productId LEFT JOIN categories c ON c.id = p.categoryId WHERE s.shopId = ? GROUP BY c.id ORDER BY value DESC").bind(shopId).all(),
        db.prepare("SELECT category as label, COALESCE(SUM(amount), 0) as value FROM expenses WHERE shopId = ? GROUP BY category ORDER BY value DESC").bind(shopId).all(),
        db.prepare("SELECT date as label, COALESCE(SUM(total), 0) as revenue, 0 as cost, COALESCE(SUM(total), 0) as profit FROM sales WHERE shopId = ? AND status != 'CANCELLED' AND date >= date('now','-30 days') GROUP BY date ORDER BY date ASC").bind(shopId).all(),
      ]);

      return c.json({
        dailySales: ((dailySales as any)?.results || []).map((r: any) => ({ label: r.label, value: r.value })),
        salesByCategory: ((salesByCategory as any)?.results || []).map((r: any) => ({ label: r.label, value: r.value })),
        expensesByCategory: ((expensesByCategory as any)?.results || []).map((r: any) => ({ label: r.label, value: r.value })),
        profitTrend: ((profitTrend as any)?.results || []).map((r: any) => ({ label: r.label, revenue: r.revenue, cost: r.cost, profit: r.profit })),
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== DASHBOARD: ANALYTICS ====================

  app.get('/api/dashboard/analytics', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
      const prevMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 10);
      const prevMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().slice(0, 10);

      const [totalRevenue, totalExpenses, monthRevenue, prevMonthRevenue, orderCount, customerCount, topProducts, categorySales, repeatCustomers] = await Promise.all([
        db.prepare("SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE shopId = ? AND status != 'CANCELLED'").bind(shopId).first(),
        db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE shopId = ?").bind(shopId).first(),
        db.prepare("SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE shopId = ? AND status != 'CANCELLED' AND date >= ?").bind(shopId, monthStart).first(),
        db.prepare("SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE shopId = ? AND status != 'CANCELLED' AND date >= ? AND date <= ?").bind(shopId, prevMonthStart, prevMonthEnd).first(),
        db.prepare("SELECT COUNT(*) as count FROM sales WHERE shopId = ? AND status != 'CANCELLED'").bind(shopId).first(),
        db.prepare("SELECT COUNT(*) as count FROM customers WHERE shopId = ? AND deletedAt IS NULL").bind(shopId).first(),
        db.prepare("SELECT p.id, p.name as label, COALESCE(SUM(si.quantity), 0) as value FROM sale_items si JOIN sales s ON s.id = si.saleId AND s.status != 'CANCELLED' JOIN products p ON p.id = si.productId WHERE s.shopId = ? GROUP BY p.id ORDER BY value DESC LIMIT 10").bind(shopId).all(),
        db.prepare("SELECT c.name as label, COALESCE(SUM(si.quantity * si.unitPrice), 0) as value FROM sale_items si JOIN sales s ON s.id = si.saleId AND s.status != 'CANCELLED' LEFT JOIN products p ON p.id = si.productId LEFT JOIN categories c ON c.id = p.categoryId WHERE s.shopId = ? GROUP BY c.name ORDER BY value DESC").bind(shopId).all(),
        db.prepare("SELECT COUNT(*) as count FROM (SELECT customerId, COUNT(*) as orderCount FROM sales WHERE shopId = ? AND status != 'CANCELLED' AND customerId IS NOT NULL GROUP BY customerId HAVING orderCount > 1)").bind(shopId).first(),
      ]);

      const revenue = (totalRevenue as any)?.total || 0;
      const expenses = (totalExpenses as any)?.total || 0;
      const profit = revenue - expenses;
      const mRev = (monthRevenue as any)?.total || 0;
      const pRev = (prevMonthRevenue as any)?.total || 0;
      const growthPct = pRev > 0 ? ((mRev - pRev) / pRev) * 100 : 0;
      const totalOrders = (orderCount as any)?.count || 0;
      const avgOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;
      const totalCustomers = (customerCount as any)?.count || 0;
      const repeatCount = (repeatCustomers as any)?.count || 0;

      return c.json({
        totalRevenue: revenue,
        totalExpenses: expenses,
        totalProfit: profit,
        growthPercentage: Math.round(growthPct * 100) / 100,
        averageOrderValue: Math.round(avgOrderValue * 100) / 100,
        repeatCustomerRate: totalCustomers > 0 ? Math.round((repeatCount / totalCustomers) * 10000) / 100 : 0,
        topProducts: (topProducts as any)?.results || [],
        topCategories: (categorySales as any)?.results || [],
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== DASHBOARD: KPI ====================

  app.get('/api/dashboard/kpi', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const today = new Date().toISOString().slice(0, 10);
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

      const [revToday, revMonth, expToday, expMonth, pendingOrders, lowStock, activeCustomers] = await Promise.all([
        db.prepare("SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE shopId = ? AND status != 'CANCELLED' AND date = ?").bind(shopId, today).first(),
        db.prepare("SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE shopId = ? AND status != 'CANCELLED' AND date >= ?").bind(shopId, monthStart).first(),
        db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE shopId = ? AND date(createdAt) = ?").bind(shopId, today).first(),
        db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE shopId = ? AND date(createdAt) >= ?").bind(shopId, monthStart).first(),
        db.prepare("SELECT COUNT(*) as count FROM sales WHERE shopId = ? AND status IN ('PENDING','PROCESSING')").bind(shopId).first(),
        db.prepare("SELECT COUNT(*) as count FROM products p WHERE p.shopId = ? AND p.status = 'ACTIVE' AND (SELECT COALESCE(SUM(quantity), 0) FROM stock WHERE productId = p.id) <= p.minStock").bind(shopId).first(),
        db.prepare("SELECT COUNT(*) as count FROM customers WHERE shopId = ? AND deletedAt IS NULL AND id IN (SELECT DISTINCT customerId FROM sales WHERE shopId = ? AND status != 'CANCELLED' AND date >= ? AND customerId IS NOT NULL)").bind(shopId, shopId, monthStart).first(),
      ]);

      const rToday = (revToday as any)?.total || 0;
      const rMonth = (revMonth as any)?.total || 0;
      const eToday = (expToday as any)?.total || 0;
      const eMonth = (expMonth as any)?.total || 0;
      const profitMargin = rMonth > 0 ? Math.round(((rMonth - eMonth) / rMonth) * 10000) / 100 : 0;

      return c.json({
        revenueToday: rToday,
        revenueThisMonth: rMonth,
        expensesToday: eToday,
        expensesThisMonth: eMonth,
        profitMarginPercentage: profitMargin,
        pendingOrdersCount: (pendingOrders as any)?.count || 0,
        lowStockCount: (lowStock as any)?.count || 0,
        activeCustomersThisMonth: (activeCustomers as any)?.count || 0,
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== REPORT: STAFF ====================

  app.get('/api/reports/staff', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const fromDate = c.req.query('fromDate') || '';
      const toDate = c.req.query('toDate') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');

      let where = 'WHERE e.shopId = ? AND e.deletedAt IS NULL';
      const params: any[] = [shopId];
      if (fromDate) { where += ' AND e.createdAt >= ?'; params.push(fromDate); }
      if (toDate) { where += ' AND e.createdAt <= ?'; params.push(toDate); }

      const { results } = await db.prepare(
        `SELECT e.id, e.name, e.email, e.phone, e.designation, e.salary, e.joinDate, e.status, e.createdAt, (SELECT COUNT(*) FROM attendance a WHERE a.employeeId = e.id) as attendanceCount, (SELECT COUNT(*) FROM sales s WHERE s.createdBy = e.id) as salesCount FROM employees e ${where} ORDER BY e.name ASC LIMIT ? OFFSET ?`
      ).bind(...params, limit, offset).all();

      const { results: countRes } = await db.prepare(
        `SELECT COUNT(*) as total FROM employees e ${where}`
      ).bind(...params).all();

      const { results: summaryRes } = await db.prepare(
        `SELECT COUNT(*) as total, AVG(e.salary) as avgSalary, COUNT(DISTINCT e.designation) as designationCount FROM employees e ${where}`
      ).bind(...params).all();

      const summary = (summaryRes as any)?.[0] || {};

      return c.json({
        data: results || [],
        total: (countRes as any)[0]?.total || 0,
        summary: {
          totalEmployees: summary.total || 0,
          averageSalary: summary.avgSalary || 0,
          designationCount: summary.designationCount || 0,
        },
        limit,
        offset,
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== REPORT: SERVICES ====================

  app.get('/api/reports/services', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const fromDate = c.req.query('fromDate') || '';
      const toDate = c.req.query('toDate') || '';

      let dateFilter = '';
      const params: any[] = [shopId];
      if (fromDate) { dateFilter += ' AND sr.createdAt >= ?'; params.push(fromDate); }
      if (toDate) { dateFilter += ' AND sr.createdAt <= ?'; params.push(toDate); }

      const [totalRes, byStatus, avgTime, revenueRes] = await Promise.all([
        db.prepare(`SELECT COUNT(*) as total FROM service_repairs sr WHERE sr.shopId = ?${dateFilter}`).bind(...params).first(),
        db.prepare(`SELECT sr.status, COUNT(*) as count FROM service_repairs sr WHERE sr.shopId = ?${dateFilter} GROUP BY sr.status`).bind(...params).all(),
        db.prepare(`SELECT AVG(julianday(sr.updatedAt) - julianday(sr.createdAt)) as avgDays FROM service_repairs sr WHERE sr.shopId = ? AND sr.status IN ('COMPLETED','DELIVERED')${dateFilter.replace(/sr\.createdAt/g, 'sr.updatedAt')}`).bind(...params).first(),
        db.prepare(`SELECT COALESCE(SUM(si.total), 0) as revenue, COALESCE(SUM(si.laborCharges), 0) as laborRevenue, COALESCE(SUM(si.sparePartsCost), 0) as partsRevenue FROM service_invoices si JOIN service_repairs sr ON sr.id = si.serviceRepairId WHERE sr.shopId = ? AND si.status = 'PAID'${dateFilter}`).bind(...params).first(),
      ]);

      return c.json({
        totalServices: (totalRes as any)?.total || 0,
        byStatus: (byStatus as any)?.results || [],
        avgRepairDays: (avgTime as any)?.avgDays || 0,
        revenue: {
          total: (revenueRes as any)?.revenue || 0,
          labor: (revenueRes as any)?.laborRevenue || 0,
          parts: (revenueRes as any)?.partsRevenue || 0,
        },
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== REPORT: EXPENSES ====================

  app.get('/api/reports/expenses', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const fromDate = c.req.query('fromDate') || '';
      const toDate = c.req.query('toDate') || '';

      let dateFilter = '';
      const params: any[] = [shopId];
      if (fromDate) { dateFilter += ' AND date(createdAt) >= ?'; params.push(fromDate); }
      if (toDate) { dateFilter += ' AND date(createdAt) <= ?'; params.push(toDate); }

      const [byCategory, byMonth, totalRes, prevTotalRes] = await Promise.all([
        db.prepare(`SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM expenses WHERE shopId = ?${dateFilter} GROUP BY category ORDER BY total DESC`).bind(...params).all(),
        db.prepare(`SELECT strftime('%Y-%m', createdAt) as month, COALESCE(SUM(amount), 0) as total FROM expenses WHERE shopId = ?${dateFilter} GROUP BY month ORDER BY month ASC`).bind(...params).all(),
        db.prepare(`SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM expenses WHERE shopId = ?${dateFilter}`).bind(...params).first(),
        db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE shopId = ? AND date(createdAt) >= date('now','-60 days') AND date(createdAt) < date('now','-30 days')`).bind(shopId).first(),
      ]);

      const curTotal = (totalRes as any)?.total || 0;
      const prevTotal = (prevTotalRes as any)?.total || 0;
      const changePct = prevTotal > 0 ? ((curTotal - prevTotal) / prevTotal) * 100 : 0;

      return c.json({
        byCategory: (byCategory as any)?.results || [],
        byMonth: (byMonth as any)?.results || [],
        total: curTotal,
        count: (totalRes as any)?.count || 0,
        previousPeriodTotal: prevTotal,
        changePercentage: Math.round(changePct * 100) / 100,
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== REPORT: GST ====================

  app.get('/api/reports/gst', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const fromDate = c.req.query('fromDate') || '';
      const toDate = c.req.query('toDate') || '';

      let saleFilter = 'WHERE s.shopId = ? AND s.status != \'CANCELLED\'';
      let purchaseFilter = 'WHERE p.shopId = ?';
      const saleParams: any[] = [shopId];
      const purchaseParams: any[] = [shopId];
      if (fromDate) { saleFilter += ' AND s.date >= ?'; saleParams.push(fromDate); purchaseFilter += ' AND p.date >= ?'; purchaseParams.push(fromDate); }
      if (toDate) { saleFilter += ' AND s.date <= ?'; saleParams.push(toDate); purchaseFilter += ' AND p.date <= ?'; purchaseParams.push(toDate); }

      const [taxCollected, taxPaid, bySaleMonth, byPurchaseMonth] = await Promise.all([
        db.prepare(`SELECT COALESCE(SUM(si.taxAmount), 0) as total FROM sale_items si JOIN sales s ON s.id = si.saleId ${saleFilter}`).bind(...saleParams).first(),
        db.prepare(`SELECT COALESCE(SUM(pi.taxAmount), 0) as total FROM purchase_items pi JOIN purchases p ON p.id = pi.purchaseId ${purchaseFilter}`).bind(...purchaseParams).first(),
        db.prepare(`SELECT strftime('%Y-%m', s.date) as month, COALESCE(SUM(si.taxAmount), 0) as taxCollected FROM sale_items si JOIN sales s ON s.id = si.saleId ${saleFilter} GROUP BY month ORDER BY month ASC`).bind(...saleParams).all(),
        db.prepare(`SELECT strftime('%Y-%m', p.date) as month, COALESCE(SUM(pi.taxAmount), 0) as taxPaid FROM purchase_items pi JOIN purchases p ON p.id = pi.purchaseId ${purchaseFilter} GROUP BY month ORDER BY month ASC`).bind(...purchaseParams).all(),
      ]);

      const collected = (taxCollected as any)?.total || 0;
      const paid = (taxPaid as any)?.total || 0;

      return c.json({
        totalTaxCollected: collected,
        totalTaxPaid: paid,
        netGstLiability: collected - paid,
        byMonth: {
          collected: (bySaleMonth as any)?.results || [],
          paid: (byPurchaseMonth as any)?.results || [],
        },
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== REPORT: SUBSCRIPTION ====================

  app.get('/api/reports/subscription', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;

      const [planDist, statusCounts, revenueByMonth, totalRevenue] = await Promise.all([
        db.prepare("SELECT s.plan, COUNT(*) as count FROM subscriptions s WHERE s.tenantId = (SELECT tenantId FROM users WHERE shopId = ? AND tenantId IS NOT NULL LIMIT 1) GROUP BY s.plan ORDER BY count DESC").bind(shopId).all(),
        db.prepare("SELECT status, COUNT(*) as count FROM subscriptions s WHERE s.tenantId = (SELECT tenantId FROM users WHERE shopId = ? AND tenantId IS NOT NULL LIMIT 1) GROUP BY status").bind(shopId).all(),
        db.prepare("SELECT strftime('%Y-%m', s.createdAt) as month, COALESCE(SUM(sp.monthlyPrice), 0) as revenue FROM subscriptions s LEFT JOIN subscription_plans sp ON sp.id = s.subscriptionPlanId WHERE s.tenantId = (SELECT tenantId FROM users WHERE shopId = ? AND tenantId IS NOT NULL LIMIT 1) GROUP BY month ORDER BY month ASC").bind(shopId).all(),
        db.prepare("SELECT COALESCE(SUM(sp.monthlyPrice), 0) as total FROM subscriptions s LEFT JOIN subscription_plans sp ON sp.id = s.subscriptionPlanId WHERE s.tenantId = (SELECT tenantId FROM users WHERE shopId = ? AND tenantId IS NOT NULL LIMIT 1)").bind(shopId).first(),
      ]);

      const statusMap: Record<string, number> = {};
      for (const r of ((statusCounts as any)?.results || [])) {
        statusMap[(r as any).status] = (r as any).count;
      }

      return c.json({
        planDistribution: (planDist as any)?.results || [],
        activeCount: statusMap['ACTIVE'] || 0,
        trialCount: statusMap['TRIAL'] || 0,
        expiredCount: statusMap['EXPIRED'] || 0,
        cancelledCount: statusMap['CANCELLED'] || 0,
        totalRevenue: (totalRevenue as any)?.total || 0,
        revenueByMonth: (revenueByMonth as any)?.results || [],
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/dashboard/sales', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const today = new Date().toISOString().slice(0, 10);
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
      const [todaySales, monthSales, totalSales, todayCount, monthCount] = await Promise.all([
        db.prepare("SELECT COALESCE(SUM(total),0) as t FROM sales WHERE shopId = ? AND status != 'CANCELLED' AND date = ?").bind(shopId, today).first(),
        db.prepare("SELECT COALESCE(SUM(total),0) as t FROM sales WHERE shopId = ? AND status != 'CANCELLED' AND date >= ?").bind(shopId, monthStart).first(),
        db.prepare("SELECT COALESCE(SUM(total),0) as t FROM sales WHERE shopId = ? AND status != 'CANCELLED'").bind(shopId).first(),
        db.prepare("SELECT COUNT(*) as c FROM sales WHERE shopId = ? AND status != 'CANCELLED' AND date = ?").bind(shopId, today).first(),
        db.prepare("SELECT COUNT(*) as c FROM sales WHERE shopId = ? AND status != 'CANCELLED' AND date >= ?").bind(shopId, monthStart).first(),
      ]);
      return c.json({ data: { todayRevenue: (todaySales as any)?.t || 0, monthRevenue: (monthSales as any)?.t || 0, totalRevenue: (totalSales as any)?.t || 0, todayOrders: (todayCount as any)?.c || 0, monthOrders: (monthCount as any)?.c || 0 } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/dashboard/inventory', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const [totalProducts, lowStock, outOfStock, totalValue] = await Promise.all([
        db.prepare("SELECT COUNT(*) as c FROM products WHERE shopId = ? AND deletedAt IS NULL").bind(shopId).first(),
        db.prepare("SELECT COUNT(*) as c FROM products p WHERE p.shopId = ? AND p.status = 'ACTIVE' AND (SELECT COALESCE(SUM(quantity),0) FROM stock WHERE productId = p.id) <= COALESCE(p.minStock, 5) AND (SELECT COALESCE(SUM(quantity),0) FROM stock WHERE productId = p.id) > 0").bind(shopId).first(),
        db.prepare("SELECT COUNT(*) as c FROM products p WHERE p.shopId = ? AND p.status = 'ACTIVE' AND (SELECT COALESCE(SUM(quantity),0) FROM stock WHERE productId = p.id) <= 0").bind(shopId).first(),
        db.prepare("SELECT COALESCE(SUM(p.costPrice * s.quantity),0) as t FROM products p JOIN stock s ON s.productId = p.id WHERE p.shopId = ? AND p.deletedAt IS NULL").bind(shopId).first(),
      ]);
      return c.json({ data: { totalProducts: (totalProducts as any)?.c || 0, lowStock: (lowStock as any)?.c || 0, outOfStock: (outOfStock as any)?.c || 0, totalValue: (totalValue as any)?.t || 0 } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/reports/inventory', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await db.prepare("SELECT p.id, p.name, p.sku, p.costPrice, p.sellingPrice, COALESCE(SUM(s.quantity),0) as stockQty, COALESCE(p.minStock,5) as minStock FROM products p LEFT JOIN stock s ON s.productId = p.id WHERE p.shopId = ? AND p.deletedAt IS NULL GROUP BY p.id ORDER BY stockQty ASC LIMIT ? OFFSET ?").bind(shopId, limit, offset).all();
      const { results: countRes } = await db.prepare("SELECT COUNT(*) as total FROM products WHERE shopId = ? AND deletedAt IS NULL").bind(shopId).all();
      return c.json({ data: results, total: (countRes as any)[0]?.total || 0, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/reports/customers', async (c) => {
    try {
      const db = c.env.DB; const shopId = c.var.shopId;
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100); const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await db.prepare("SELECT c.id, c.name, c.email, c.phone, c.totalPurchases, c.totalSpent, c.lastPurchaseDate, c.createdAt FROM customers c WHERE c.shopId = ? AND c.deletedAt IS NULL ORDER BY c.totalSpent DESC LIMIT ? OFFSET ?").bind(shopId, limit, offset).all();
      const { results: countRes } = await db.prepare("SELECT COUNT(*) as total, COALESCE(SUM(totalSpent),0) as totalSpent, AVG(totalSpent) as avgSpent FROM customers WHERE shopId = ? AND deletedAt IS NULL").bind(shopId).all();
      const summary = (countRes as any)?.[0] || {};
      return c.json({ data: results, total: summary.total || 0, summary: { totalSpent: summary.totalSpent || 0, avgSpent: summary.avgSpent || 0 }, limit, offset });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });
}
