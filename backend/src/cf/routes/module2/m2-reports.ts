export function reportsRoutes(app: any) {

  // ==================== DASHBOARD ====================

  app.get('/api/dashboard', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const today = new Date().toISOString().slice(0, 10);

      const [prodRes, custRes, suppRes, salesRes, purchRes, todaySalesRes, todayExpRes, lowStockRes] = await Promise.all([
        db.prepare('SELECT COUNT(*) as total FROM products WHERE shopId = ? AND status != \'INACTIVE\'').bind(shopId).first(),
        db.prepare('SELECT COUNT(*) as total FROM customers WHERE shopId = ? AND deletedAt IS NULL').bind(shopId).first(),
        db.prepare('SELECT COUNT(*) as total FROM suppliers WHERE shopId = ? AND deletedAt IS NULL').bind(shopId).first(),
        db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales WHERE shopId = ? AND status != \'CANCELLED\'').bind(shopId).first(),
        db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM purchases WHERE shopId = ? AND status != \'CANCELLED\'').bind(shopId).first(),
        db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales WHERE shopId = ? AND date = ? AND status != \'CANCELLED\'').bind(shopId, today).first(),
        db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE shopId = ? AND date(createdAt) = ?').bind(shopId, today).first(),
        db.prepare('SELECT COUNT(*) as total FROM products WHERE shopId = ? AND status = \'ACTIVE\' AND (SELECT COALESCE(SUM(quantity), 0) FROM stock WHERE productId = products.id) <= minStock').bind(shopId).first(),
      ]);

      return c.json({
        totalProducts: (prodRes as any)?.total || 0,
        totalCustomers: (custRes as any)?.total || 0,
        totalSuppliers: (suppRes as any)?.total || 0,
        totalSales: (salesRes as any)?.total || 0,
        totalPurchases: (purchRes as any)?.total || 0,
        todaySales: (todaySalesRes as any)?.total || 0,
        todayExpenses: (todayExpRes as any)?.total || 0,
        pendingOrders: 0,
        lowStockCount: (lowStockRes as any)?.total || 0,
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/dashboard/sales', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString().slice(0, 10);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);

      const [todayRes, weekRes, monthRes, yearRes] = await Promise.all([
        db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales WHERE shopId = ? AND date = ? AND status != \'CANCELLED\'').bind(shopId, today).first(),
        db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales WHERE shopId = ? AND date >= ? AND status != \'CANCELLED\'').bind(shopId, weekStart).first(),
        db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales WHERE shopId = ? AND date >= ? AND status != \'CANCELLED\'').bind(shopId, monthStart).first(),
        db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales WHERE shopId = ? AND date >= ? AND status != \'CANCELLED\'').bind(shopId, yearStart).first(),
      ]);

      return c.json({
        today: { count: (todayRes as any)?.count || 0, total: (todayRes as any)?.total || 0 },
        week: { count: (weekRes as any)?.count || 0, total: (weekRes as any)?.total || 0 },
        month: { count: (monthRes as any)?.count || 0, total: (monthRes as any)?.total || 0 },
        year: { count: (yearRes as any)?.count || 0, total: (yearRes as any)?.total || 0 },
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/dashboard/inventory', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;

      const [totalRes, lowStockRes, outOfStockRes] = await Promise.all([
        db.prepare('SELECT COUNT(*) as totalProducts, COALESCE(SUM((SELECT COALESCE(SUM(quantity), 0) FROM stock WHERE productId = products.id)), 0) as totalStock, COALESCE(SUM((SELECT COALESCE(SUM(quantity), 0) FROM stock WHERE productId = products.id) * purchasePrice), 0) as totalValue FROM products WHERE shopId = ? AND status = \'ACTIVE\'').bind(shopId).first(),
        db.prepare('SELECT p.id, p.name, p.sku, (SELECT COALESCE(SUM(quantity), 0) FROM stock WHERE productId = p.id) as stockQty, p.minStock, p.sellingPrice FROM products p WHERE p.shopId = ? AND p.status = \'ACTIVE\' AND (SELECT COALESCE(SUM(quantity), 0) FROM stock WHERE productId = p.id) <= p.minStock ORDER BY stockQty ASC').bind(shopId).all(),
        db.prepare('SELECT COUNT(*) as total FROM products WHERE shopId = ? AND status = \'ACTIVE\' AND (SELECT COALESCE(SUM(quantity), 0) FROM stock WHERE productId = products.id) = 0').bind(shopId).first(),
      ]);

      return c.json({
        totalProducts: (totalRes as any)?.totalProducts || 0,
        totalStock: (totalRes as any)?.totalStock || 0,
        totalValue: (totalRes as any)?.totalValue || 0,
        lowStock: (lowStockRes as any)?.results || [],
        outOfStock: (outOfStockRes as any)?.total || 0,
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/dashboard/products', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;

      const [totalRes, categoryRes, topSellingRes] = await Promise.all([
        db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN status = \'ACTIVE\' THEN 1 ELSE 0 END) as active, SUM(CASE WHEN status != \'ACTIVE\' THEN 1 ELSE 0 END) as inactive FROM products WHERE shopId = ?').bind(shopId).first(),
        db.prepare('SELECT c.name as category, COUNT(p.id) as count FROM products p LEFT JOIN categories c ON c.id = p.categoryId WHERE p.shopId = ? GROUP BY p.categoryId ORDER BY count DESC').bind(shopId).all(),
        db.prepare('SELECT p.id, p.name as product, COALESCE(SUM(si.quantity), 0) as totalSold FROM products p LEFT JOIN sale_items si ON si.productId = p.id LEFT JOIN sales s ON s.id = si.saleId AND s.status != \'CANCELLED\' WHERE p.shopId = ? GROUP BY p.id ORDER BY totalSold DESC LIMIT 10').bind(shopId).all(),
      ]);

      return c.json({
        total: (totalRes as any)?.total || 0,
        active: (totalRes as any)?.active || 0,
        inactive: (totalRes as any)?.inactive || 0,
        byCategory: (categoryRes as any)?.results || [],
        topSelling: (topSellingRes as any)?.results || [],
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/dashboard/customers', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

      const [totalRes, newRes, topRes] = await Promise.all([
        db.prepare('SELECT COUNT(*) as total FROM customers WHERE shopId = ? AND deletedAt IS NULL').bind(shopId).first(),
        db.prepare('SELECT COUNT(*) as total FROM customers WHERE shopId = ? AND createdAt >= ? AND deletedAt IS NULL').bind(shopId, monthStart).first(),
        db.prepare('SELECT c.id, c.name as customer, c.email, c.phone, COALESCE(SUM(s.total), 0) as totalSpent FROM customers c LEFT JOIN sales s ON s.customerId = c.id AND s.status != \'CANCELLED\' WHERE c.shopId = ? GROUP BY c.id ORDER BY totalSpent DESC LIMIT 10').bind(shopId).all(),
      ]);

      return c.json({
        total: (totalRes as any)?.total || 0,
        newThisMonth: (newRes as any)?.total || 0,
        topCustomers: (topRes as any)?.results || [],
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/dashboard/profit', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;

      const [totalRes, byMonthRes] = await Promise.all([
        db.prepare("SELECT COALESCE(SUM(total), 0) as totalRevenue FROM sales WHERE shopId = ? AND status != 'CANCELLED'").bind(shopId).first(),
        db.prepare("SELECT strftime('%Y-%m', date) as month, COALESCE(SUM(total), 0) as revenue FROM sales WHERE shopId = ? AND status != 'CANCELLED' GROUP BY month ORDER BY month DESC LIMIT 12").bind(shopId).all(),
      ]);

      const revenue = (totalRes as any)?.totalRevenue || 0;
      const grossProfit = revenue;
      const margin = revenue > 0 ? 100 : 0;

      const byMonth = ((byMonthRes as any)?.results || []).map((r: any) => ({
        month: r.month,
        revenue: r.revenue,
        cost: 0,
        profit: r.revenue,
      }));

      return c.json({
        totalRevenue: revenue,
        totalCost: 0,
        grossProfit,
        margin: Math.round(margin * 100) / 100,
        byMonth,
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/dashboard/revenue', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString().slice(0, 10);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);

      const [todayRes, weekRes, monthRes, yearRes, byMethodRes, byDayRes] = await Promise.all([
        db.prepare('SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE shopId = ? AND date = ? AND status != \'CANCELLED\'').bind(shopId, today).first(),
        db.prepare('SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE shopId = ? AND date >= ? AND status != \'CANCELLED\'').bind(shopId, weekStart).first(),
        db.prepare('SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE shopId = ? AND date >= ? AND status != \'CANCELLED\'').bind(shopId, monthStart).first(),
        db.prepare('SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE shopId = ? AND date >= ? AND status != \'CANCELLED\'').bind(shopId, yearStart).first(),
        db.prepare('SELECT paymentMethod as method, COALESCE(SUM(total), 0) as total FROM sales WHERE shopId = ? AND status != \'CANCELLED\' GROUP BY paymentMethod').bind(shopId).all(),
        db.prepare('SELECT date as date, COALESCE(SUM(total), 0) as total FROM sales WHERE shopId = ? AND status != \'CANCELLED\' GROUP BY date ORDER BY date DESC LIMIT 30').bind(shopId).all(),
      ]);

      return c.json({
        today: (todayRes as any)?.total || 0,
        week: (weekRes as any)?.total || 0,
        month: (monthRes as any)?.total || 0,
        year: (yearRes as any)?.total || 0,
        byPaymentMethod: (byMethodRes as any)?.results || [],
        byDay: ((byDayRes as any)?.results || []).map((r: any) => ({ date: r.date, total: r.total })),
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== REPORTS ====================

  app.get('/api/reports/sales', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const fromDate = c.req.query('fromDate') || '';
      const toDate = c.req.query('toDate') || '';
      const customerId = c.req.query('customerId') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '100'), 500);
      const offset = parseInt(c.req.query('offset') || '0');

      let where = 'WHERE s.shopId = ? AND s.status != \'CANCELLED\'';
      const params: any[] = [shopId];
      if (fromDate) { where += ' AND s.date >= ?'; params.push(fromDate); }
      if (toDate) { where += ' AND s.date <= ?'; params.push(toDate); }
      if (customerId) { where += ' AND s.customerId = ?'; params.push(customerId); }

      const { results } = await db.prepare(
        `SELECT s.id, s.invoiceNumber, s.date as saleDate, s.total, s.discount, s.taxAmount, s.paymentMethod, s.status, c.name as customerName, c.phone as customerPhone FROM sales s LEFT JOIN customers c ON c.id = s.customerId ${where} ORDER BY s.date DESC LIMIT ? OFFSET ?`
      ).bind(...params, limit, offset).all();

      const { results: countRes } = await db.prepare(
        `SELECT COUNT(*) as total, COALESCE(SUM(s.total), 0) as grandTotal FROM sales s ${where}`
      ).bind(...params).all();

      const agg = (countRes as any)?.[0] || {};
      return c.json({
        data: results,
        total: agg.total || 0,
        grandTotal: agg.grandTotal || 0,
        grandCost: 0,
        limit,
        offset,
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/reports/products', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const fromDate = c.req.query('fromDate') || '';
      const toDate = c.req.query('toDate') || '';
      const categoryId = c.req.query('categoryId') || '';

      let saleJoin = 'LEFT JOIN sale_items si ON si.productId = p.id LEFT JOIN sales s ON s.id = si.saleId AND s.status != \'CANCELLED\'';
      let where = 'WHERE p.shopId = ?';
      const params: any[] = [shopId];
      if (fromDate) { where += ' AND s.date >= ?'; params.push(fromDate); }
      if (toDate) { where += ' AND s.date <= ?'; params.push(toDate); }
      if (categoryId) { where += ' AND p.categoryId = ?'; params.push(categoryId); }

      const { results: topSellers } = await db.prepare(
        `SELECT p.id, p.name, p.sku, (SELECT COALESCE(SUM(quantity), 0) FROM stock WHERE productId = p.id) as stockQty, p.sellingPrice, p.purchasePrice, c.name as category, COALESCE(SUM(si.quantity), 0) as totalSold, COALESCE(SUM(si.quantity * si.unitPrice), 0) as totalRevenue FROM products p ${saleJoin} LEFT JOIN categories c ON c.id = p.categoryId ${where} GROUP BY p.id ORDER BY totalSold DESC LIMIT 50`
      ).bind(...params).all();

      const { results: slowMovers } = await db.prepare(
        `SELECT p.id, p.name, p.sku, (SELECT COALESCE(SUM(quantity), 0) FROM stock WHERE productId = p.id) as stockQty, p.sellingPrice, p.purchasePrice, c.name as category, COALESCE(SUM(si.quantity), 0) as totalSold FROM products p ${saleJoin} LEFT JOIN categories c ON c.id = p.categoryId ${where} GROUP BY p.id HAVING totalSold = 0 ORDER BY (SELECT COALESCE(SUM(quantity), 0) FROM stock WHERE productId = p.id) DESC LIMIT 50`
      ).bind(...params).all();

      return c.json({
        topSellers: topSellers || [],
        slowMovers: slowMovers || [],
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/reports/inventory', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const categoryId = c.req.query('categoryId') || '';

      let where = 'WHERE p.shopId = ? AND p.status = \'ACTIVE\'';
      const params: any[] = [shopId];
      if (categoryId) { where += ' AND p.categoryId = ?'; params.push(categoryId); }

      const [stockRes, totalRes] = await Promise.all([
        db.prepare(
          `SELECT p.id, p.name, p.sku, p.barcode, (SELECT COALESCE(SUM(quantity), 0) FROM stock WHERE productId = p.id) as stockQty, p.minStock, p.maxStock, p.purchasePrice, p.sellingPrice, c.name as category, ((SELECT COALESCE(SUM(quantity), 0) FROM stock WHERE productId = p.id) * p.purchasePrice) as stockValue FROM products p LEFT JOIN categories c ON c.id = p.categoryId ${where} ORDER BY p.name ASC`
        ).bind(...params).all(),
        db.prepare(
          `SELECT COUNT(*) as totalProducts, COALESCE(SUM((SELECT COALESCE(SUM(quantity), 0) FROM stock WHERE productId = p.id)), 0) as totalStock, COALESCE(SUM((SELECT COALESCE(SUM(quantity), 0) FROM stock WHERE productId = p.id) * p.purchasePrice), 0) as totalValue FROM products p ${where}`
        ).bind(...params).first(),
      ]);

      return c.json({
        data: stockRes || [],
        totalProducts: (totalRes as any)?.totalProducts || 0,
        totalStock: (totalRes as any)?.totalStock || 0,
        totalValue: (totalRes as any)?.totalValue || 0,
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/reports/customers', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const fromDate = c.req.query('fromDate') || '';
      const toDate = c.req.query('toDate') || '';
      const minSpend = c.req.query('minSpend') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 200);
      const offset = parseInt(c.req.query('offset') || '0');

      let where = 'WHERE c.shopId = ? AND c.deletedAt IS NULL';
      const params: any[] = [shopId];
      if (fromDate) { where += ' AND s.date >= ?'; params.push(fromDate); }
      if (toDate) { where += ' AND s.date <= ?'; params.push(toDate); }

      let having = '';
      const havingParams: any[] = [];
      if (minSpend) { having = 'HAVING totalSpent >= ?'; havingParams.push(parseFloat(minSpend)); }

      const { results } = await db.prepare(
        `SELECT c.id, c.name, c.email, c.phone, c.address, c.createdAt, COUNT(s.id) as visitCount, COALESCE(SUM(s.total), 0) as totalSpent, COALESCE(AVG(s.total), 0) as avgOrderValue FROM customers c LEFT JOIN sales s ON s.customerId = c.id AND s.status != 'CANCELLED' ${where} GROUP BY c.id ${having} ORDER BY totalSpent DESC LIMIT ? OFFSET ?`
      ).bind(...params, ...havingParams, limit, offset).all();

      const { results: countRes } = await db.prepare(
        `SELECT COUNT(*) as total FROM (SELECT c.id FROM customers c LEFT JOIN sales s ON s.customerId = c.id AND s.status != 'CANCELLED' ${where} GROUP BY c.id ${having})`
      ).bind(...params, ...havingParams).all();

      return c.json({
        data: results || [],
        total: (countRes as any)?.[0]?.total || 0,
        limit,
        offset,
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/reports/suppliers', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const fromDate = c.req.query('fromDate') || '';
      const toDate = c.req.query('toDate') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 200);
      const offset = parseInt(c.req.query('offset') || '0');

      let where = 'WHERE s.shopId = ? AND s.deletedAt IS NULL';
      const params: any[] = [shopId];
      if (fromDate) { where += ' AND p.date >= ?'; params.push(fromDate); }
      if (toDate) { where += ' AND p.date <= ?'; params.push(toDate); }

      const { results } = await db.prepare(
        `SELECT s.id, s.name, s.email, s.phone, s.address, s.contactPerson, COUNT(p.id) as purchaseCount, COALESCE(SUM(p.total), 0) as totalPurchases, COALESCE(AVG(p.total), 0) as avgPurchaseValue FROM suppliers s LEFT JOIN purchases p ON p.supplierId = s.id AND p.status != 'CANCELLED' ${where} GROUP BY s.id ORDER BY totalPurchases DESC LIMIT ? OFFSET ?`
      ).bind(...params, limit, offset).all();

      const { results: countRes } = await db.prepare(
        `SELECT COUNT(*) as total FROM (SELECT s.id FROM suppliers s LEFT JOIN purchases p ON p.supplierId = s.id AND p.status != 'CANCELLED' ${where} GROUP BY s.id)`
      ).bind(...params).all();

      return c.json({
        data: results || [],
        total: (countRes as any)?.[0]?.total || 0,
        limit,
        offset,
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/reports/payments', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const fromDate = c.req.query('fromDate') || '';
      const toDate = c.req.query('toDate') || '';
      const method = c.req.query('method') || '';

      let where = 'WHERE shopId = ? AND status != \'CANCELLED\'';
      const params: any[] = [shopId];
      if (fromDate) { where += ' AND date >= ?'; params.push(fromDate); }
      if (toDate) { where += ' AND date <= ?'; params.push(toDate); }
      if (method) { where += ' AND paymentMethod = ?'; params.push(method); }

      const { results: byMethod } = await db.prepare(
        `SELECT paymentMethod as method, COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales ${where} GROUP BY paymentMethod ORDER BY total DESC`
      ).bind(...params).all();

      const { results: byDate } = await db.prepare(
        `SELECT date as date, paymentMethod as method, COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales ${where} GROUP BY date, paymentMethod ORDER BY date DESC LIMIT 100`
      ).bind(...params).all();

      const { results: totalRes } = await db.prepare(
        `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales ${where}`
      ).bind(...params).all();

      const agg = (totalRes as any)?.[0] || {};
      return c.json({
        byMethod: byMethod || [],
        byDate: byDate || [],
        totalCount: agg.count || 0,
        totalAmount: agg.total || 0,
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/reports/profit', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const fromDate = c.req.query('fromDate') || '';
      const toDate = c.req.query('toDate') || '';

      let where = 'WHERE shopId = ? AND status != \'CANCELLED\'';
      const params: any[] = [shopId];
      if (fromDate) { where += ' AND date >= ?'; params.push(fromDate); }
      if (toDate) { where += ' AND date <= ?'; params.push(toDate); }

      const [summaryRes, monthlyRes, expenseRes] = await Promise.all([
        db.prepare(`SELECT COALESCE(SUM(total), 0) as revenue, COALESCE(SUM(taxAmount), 0) as tax, COALESCE(SUM(discount), 0) as discount FROM sales ${where}`).bind(...params).first(),
        db.prepare(`SELECT strftime('%Y-%m', date) as month, COALESCE(SUM(total), 0) as revenue FROM sales ${where} GROUP BY month ORDER BY month DESC`).bind(...params).all(),
        db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE shopId = ?').bind(shopId).first(),
      ]);

      const revenue = (summaryRes as any)?.revenue || 0;
      const expenses = (expenseRes as any)?.total || 0;
      const grossProfit = revenue;
      const netProfit = grossProfit - expenses;
      const margin = revenue > 0 ? 100 : 0;

      return c.json({
        revenue,
        cost: 0,
        grossProfit,
        expenses,
        netProfit,
        tax: (summaryRes as any)?.tax || 0,
        discount: (summaryRes as any)?.discount || 0,
        margin: Math.round(margin * 100) / 100,
        byMonth: ((monthlyRes as any)?.results || []).map((r: any) => ({
          month: r.month,
          revenue: r.revenue,
          cost: 0,
          profit: r.revenue,
        })),
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/reports/purchases', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const fromDate = c.req.query('fromDate') || '';
      const toDate = c.req.query('toDate') || '';
      const supplierId = c.req.query('supplierId') || '';
      const status = c.req.query('status') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '100'), 500);
      const offset = parseInt(c.req.query('offset') || '0');

      let where = 'WHERE p.shopId = ?';
      const params: any[] = [shopId];
      if (fromDate) { where += ' AND p.date >= ?'; params.push(fromDate); }
      if (toDate) { where += ' AND p.date <= ?'; params.push(toDate); }
      if (supplierId) { where += ' AND p.supplierId = ?'; params.push(supplierId); }
      if (status) { where += ' AND p.status = ?'; params.push(status); }

      const { results } = await db.prepare(
        `SELECT p.id, p.invoiceNumber, p.date as orderDate, p.total, p.discount, p.taxAmount, p.paymentStatus, p.status, p.notes, s.name as supplierName, s.contactPerson FROM purchases p LEFT JOIN suppliers s ON s.id = p.supplierId ${where} ORDER BY p.date DESC LIMIT ? OFFSET ?`
      ).bind(...params, limit, offset).all();

      const { results: countRes } = await db.prepare(
        `SELECT COUNT(*) as total, COALESCE(SUM(p.total), 0) as grandTotal FROM purchases p ${where}`
      ).bind(...params).all();

      const agg = (countRes as any)?.[0] || {};
      return c.json({
        data: results || [],
        total: agg.total || 0,
        grandTotal: agg.grandTotal || 0,
        limit,
        offset,
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/reports/tax', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const fromDate = c.req.query('fromDate') || '';
      const toDate = c.req.query('toDate') || '';

      let where = 'WHERE s.shopId = ? AND s.status != \'CANCELLED\'';
      const params: any[] = [shopId];
      if (fromDate) { where += ' AND s.date >= ?'; params.push(fromDate); }
      if (toDate) { where += ' AND s.date <= ?'; params.push(toDate); }

      const [summaryRes, detailRes] = await Promise.all([
        db.prepare(`SELECT COALESCE(SUM(s.taxAmount), 0) as totalTax, COALESCE(SUM(s.total), 0) as totalSales, COUNT(*) as invoiceCount FROM sales s ${where}`).bind(...params).first(),
        db.prepare(`SELECT s.id, s.invoiceNumber, s.date as saleDate, s.total, s.taxAmount, c.name as customerName FROM sales s LEFT JOIN customers c ON c.id = s.customerId ${where} ORDER BY s.date DESC LIMIT 200`).bind(...params).all(),
      ]);

      const { results: byRate } = await db.prepare(
        `SELECT COALESCE(si.taxRate, 0) as taxRate, COUNT(DISTINCT s.id) as invoiceCount, COALESCE(SUM(si.quantity * si.unitPrice), 0) as taxableValue, COALESCE(SUM(si.taxAmount), 0) as taxCollected FROM sale_items si JOIN sales s ON s.id = si.saleId ${where} GROUP BY si.taxRate ORDER BY taxRate`
      ).bind(...params).all();

      return c.json({
        totalTax: (summaryRes as any)?.totalTax || 0,
        totalSales: (summaryRes as any)?.totalSales || 0,
        invoiceCount: (summaryRes as any)?.invoiceCount || 0,
        byRate: byRate || [],
        invoices: (detailRes as any)?.results || [],
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/reports/stock', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;

      const { results } = await db.prepare(
        `SELECT p.id, p.name, p.sku, p.barcode, (SELECT COALESCE(SUM(quantity), 0) FROM stock WHERE productId = p.id) as stockQty, p.minStock, p.maxStock, p.purchasePrice, p.sellingPrice, ((SELECT COALESCE(SUM(quantity), 0) FROM stock WHERE productId = p.id) * p.purchasePrice) as stockValue, c.name as category, b.name as brand FROM products p LEFT JOIN categories c ON c.id = p.categoryId LEFT JOIN brands b ON b.id = p.brandId WHERE p.shopId = ? AND p.status = 'ACTIVE' ORDER BY p.name ASC`
      ).bind(shopId).all();

      const [summaryRes, lowStockRes] = await Promise.all([
        db.prepare('SELECT COUNT(*) as totalProducts, COALESCE(SUM((SELECT COALESCE(SUM(quantity), 0) FROM stock WHERE productId = products.id)), 0) as totalStock, COALESCE(SUM((SELECT COALESCE(SUM(quantity), 0) FROM stock WHERE productId = products.id) * purchasePrice), 0) as totalValue FROM products WHERE shopId = ? AND status = \'ACTIVE\'').bind(shopId).first(),
        db.prepare('SELECT COUNT(*) as total FROM products WHERE shopId = ? AND status = \'ACTIVE\' AND (SELECT COALESCE(SUM(quantity), 0) FROM stock WHERE productId = products.id) <= minStock').bind(shopId).first(),
      ]);

      const data = (results as any[] || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        sku: r.sku,
        barcode: r.barcode,
        stockQty: r.stockQty,
        minStock: r.minStock,
        maxStock: r.maxStock,
        purchasePrice: r.purchasePrice,
        sellingPrice: r.sellingPrice,
        stockValue: r.stockValue,
        category: r.category,
        brand: r.brand,
        status: r.stockQty <= r.minStock ? 'LOW' : (r.stockQty === 0 ? 'OUT_OF_STOCK' : 'OK'),
      }));

      return c.json({
        data,
        totalProducts: (summaryRes as any)?.totalProducts || 0,
        totalStock: (summaryRes as any)?.totalStock || 0,
        totalValue: (summaryRes as any)?.totalValue || 0,
        lowStockCount: (lowStockRes as any)?.total || 0,
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/reports/imei', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const status = c.req.query('status') || '';
      const fromDate = c.req.query('fromDate') || '';
      const toDate = c.req.query('toDate') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '100'), 500);
      const offset = parseInt(c.req.query('offset') || '0');

      let where = 'WHERE p.shopId = ?';
      const params: any[] = [shopId];
      if (status) { where += ' AND ir.status = ?'; params.push(status); }
      if (fromDate) { where += ' AND ir.createdAt >= ?'; params.push(fromDate); }
      if (toDate) { where += ' AND ir.createdAt <= ?'; params.push(toDate); }

      const { results } = await db.prepare(
        `SELECT ir.id, ir.imei, ir.status, ir.productId, ir.saleItemId, ir.purchaseItemId, ir.warrantyStart, ir.warrantyEnd, ir.notes, ir.createdAt, p.name as productName, p.sku as productSku FROM imei_records ir JOIN products p ON p.id = ir.productId ${where} ORDER BY ir.createdAt DESC LIMIT ? OFFSET ?`
      ).bind(...params, limit, offset).all();

      const { results: countRes } = await db.prepare(
        `SELECT COUNT(*) as total, ir.status FROM imei_records ir JOIN products p ON p.id = ir.productId ${where}`
      ).bind(...params).all();

      const { results: statusBreakdown } = await db.prepare(
        `SELECT ir.status, COUNT(*) as count FROM imei_records ir JOIN products p ON p.id = ir.productId WHERE p.shopId = ? GROUP BY ir.status`
      ).bind(shopId).all();

      return c.json({
        data: results || [],
        total: (countRes as any)?.[0]?.total || 0,
        statusBreakdown: statusBreakdown || [],
        limit,
        offset,
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/reports/warranty', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;
      const fromDate = c.req.query('fromDate') || '';
      const toDate = c.req.query('toDate') || '';
      const status = c.req.query('status') || '';
      const limit = Math.min(parseInt(c.req.query('limit') || '100'), 500);
      const offset = parseInt(c.req.query('offset') || '0');

      let where = 'WHERE p.shopId = ?';
      const params: any[] = [shopId];
      if (status) { where += ' AND wr.status = ?'; params.push(status); }
      if (fromDate) { where += ' AND wr.createdAt >= ?'; params.push(fromDate); }
      if (toDate) { where += ' AND wr.createdAt <= ?'; params.push(toDate); }

      const { results } = await db.prepare(
        `SELECT wr.id, wr.productId, wr.saleItemId, wr.customerId, wr.warrantyPeriod, wr.warrantyStart, wr.warrantyEnd, wr.status, wr.claimDate, wr.claimReason, wr.notes, wr.createdAt, p.name as productName, p.sku as productSku, c.name as customerName, c.phone as customerPhone FROM warranty_records wr JOIN products p ON p.id = wr.productId LEFT JOIN customers c ON c.id = wr.customerId ${where} ORDER BY wr.createdAt DESC LIMIT ? OFFSET ?`
      ).bind(...params, limit, offset).all();

      const { results: countRes } = await db.prepare(
        `SELECT COUNT(*) as total FROM warranty_records wr JOIN products p ON p.id = wr.productId ${where}`
      ).bind(...params).all();

      const { results: statusBreakdown } = await db.prepare(
        `SELECT wr.status, COUNT(*) as count FROM warranty_records wr JOIN products p ON p.id = wr.productId WHERE p.shopId = ? GROUP BY wr.status`
      ).bind(shopId).all();

      return c.json({
        data: results || [],
        total: (countRes as any)?.[0]?.total || 0,
        statusBreakdown: statusBreakdown || [],
        limit,
        offset,
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/reports/export/pdf', async (c) => {
    try {
      const { type, params: reportParams } = await c.req.json();
      if (!type) return c.json({ error: 'Report type required' }, 400);
      const exportId = crypto.randomUUID();
      const now = new Date().toISOString();
      await c.env.DB.prepare(
        'INSERT INTO report_exports (id, shopId, userId, type, format, params, status, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?)'
      ).bind(exportId, c.var.shopId, c.var.userId, type, 'pdf', JSON.stringify(reportParams || {}), 'QUEUED', now, now).run();
      const url = `/api/reports/exports/${exportId}/download`;
      return c.json({ message: 'PDF export queued', url, exportId }, 202);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/reports/export/excel', async (c) => {
    try {
      const { type, params: reportParams } = await c.req.json();
      if (!type) return c.json({ error: 'Report type required' }, 400);
      const exportId = crypto.randomUUID();
      const now = new Date().toISOString();
      await c.env.DB.prepare(
        'INSERT INTO report_exports (id, shopId, userId, type, format, params, status, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?)'
      ).bind(exportId, c.var.shopId, c.var.userId, type, 'excel', JSON.stringify(reportParams || {}), 'QUEUED', now, now).run();
      const url = `/api/reports/exports/${exportId}/download`;
      return c.json({ message: 'Excel export queued', url, exportId }, 202);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/reports/export/csv', async (c) => {
    try {
      const { type, params: reportParams } = await c.req.json();
      if (!type) return c.json({ error: 'Report type required' }, 400);
      const exportId = crypto.randomUUID();
      const now = new Date().toISOString();
      await c.env.DB.prepare(
        'INSERT INTO report_exports (id, shopId, userId, type, format, params, status, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?)'
      ).bind(exportId, c.var.shopId, c.var.userId, type, 'csv', JSON.stringify(reportParams || {}), 'QUEUED', now, now).run();
      const url = `/api/reports/exports/${exportId}/download`;
      return c.json({ message: 'CSV export queued', url, exportId }, 202);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  // ==================== SHOP SETTINGS ====================

  app.get('/api/shop/settings', async (c) => {
    try {
      const db = c.env.DB;
      const shopId = c.var.shopId;

      const [shopRes, settingsRes] = await Promise.all([
        db.prepare('SELECT id, name, slug, email, phone, address, logo, invoiceTemplate, taxConfig, printerConfig, isActive FROM shops WHERE id = ?').bind(shopId).first(),
        db.prepare('SELECT key, value FROM settings WHERE shopId = ?').bind(shopId).all(),
      ]);

      const shop = shopRes as any || {};
      const settingsList = (settingsRes as any)?.results || [];
      const settingsMap: Record<string, any> = {};
      for (const s of settingsList) {
        try { settingsMap[s.key] = JSON.parse(s.value); } catch { settingsMap[s.key] = s.value; }
      }

      return c.json({
        shop: {
          id: shop.id,
          name: shop.name,
          slug: shop.slug,
          email: shop.email,
          phone: shop.phone,
          address: shop.address,
          logo: shop.logo,
          invoiceTemplate: shop.invoiceTemplate ? JSON.parse(shop.invoiceTemplate) : null,
          taxConfig: shop.taxConfig ? JSON.parse(shop.taxConfig) : null,
          printerConfig: shop.printerConfig ? JSON.parse(shop.printerConfig) : null,
        },
        settings: settingsMap,
      });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/shop/settings', async (c) => {
    try {
      const body = await c.req.json();
      const shopId = c.var.shopId;
      const db = c.env.DB;
      const now = new Date().toISOString();

      const shopFields = ['name', 'slug', 'email', 'phone', 'address', 'logo'];
      const shopUpdates: string[] = [];
      const shopVals: any[] = [];
      const settingsEntries: { key: string; value: string }[] = [];

      for (const [key, value] of Object.entries(body)) {
        if (shopFields.includes(key)) {
          shopUpdates.push(`${key} = ?`);
          shopVals.push(value);
        } else if (key !== 'id') {
          settingsEntries.push({ key, value: typeof value === 'string' ? value : JSON.stringify(value) });
        }
      }

      const ops: any[] = [];
      if (shopUpdates.length) {
        shopVals.push(now, shopId);
        ops.push(db.prepare(`UPDATE shops SET ${shopUpdates.join(', ')}, updatedAt = ? WHERE id = ?`).bind(...shopVals));
      }
      for (const entry of settingsEntries) {
        ops.push(
          db.prepare('INSERT INTO settings (id, shopId, key, value, createdAt, updatedAt) VALUES (?,?,?,?,?,?) ON CONFLICT(shopId, key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt')
            .bind(crypto.randomUUID(), shopId, entry.key, entry.value, now, now)
        );
      }

      if (ops.length) await db.batch(ops);
      return c.json({ message: 'Settings updated' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/shop/invoice', async (c) => {
    try {
      const body = await c.req.json();
      const shopId = c.var.shopId;
      const now = new Date().toISOString();
      await c.env.DB.prepare('UPDATE shops SET invoiceTemplate = ?, updatedAt = ? WHERE id = ?').bind(JSON.stringify(body), now, shopId).run();
      return c.json({ message: 'Invoice template updated' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/shop/gst', async (c) => {
    try {
      const body = await c.req.json();
      const shopId = c.var.shopId;
      const now = new Date().toISOString();
      await c.env.DB.prepare('UPDATE shops SET taxConfig = ?, updatedAt = ? WHERE id = ?').bind(JSON.stringify(body), now, shopId).run();
      return c.json({ message: 'GST config updated' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/shop/printer', async (c) => {
    try {
      const body = await c.req.json();
      const shopId = c.var.shopId;
      const now = new Date().toISOString();
      await c.env.DB.prepare('UPDATE shops SET printerConfig = ?, updatedAt = ? WHERE id = ?').bind(JSON.stringify(body), now, shopId).run();
      return c.json({ message: 'Printer config updated' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/shop/barcode', async (c) => {
    try {
      const body = await c.req.json();
      const shopId = c.var.shopId;
      const db = c.env.DB;
      const now = new Date().toISOString();
      const existing = await db.prepare('SELECT id FROM settings WHERE shopId = ? AND key = ?').bind(shopId, 'barcode_config').first();
      if (existing) {
        await db.prepare('UPDATE settings SET value = ?, updatedAt = ? WHERE shopId = ? AND key = ?').bind(JSON.stringify(body), now, shopId, 'barcode_config').run();
      } else {
        await db.prepare('INSERT INTO settings (id, shopId, key, value, createdAt, updatedAt) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(), shopId, 'barcode_config', JSON.stringify(body), now, now).run();
      }
      return c.json({ message: 'Barcode settings updated' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/shop/receipt', async (c) => {
    try {
      const body = await c.req.json();
      const shopId = c.var.shopId;
      const db = c.env.DB;
      const now = new Date().toISOString();
      const existing = await db.prepare('SELECT id FROM settings WHERE shopId = ? AND key = ?').bind(shopId, 'receipt_config').first();
      if (existing) {
        await db.prepare('UPDATE settings SET value = ?, updatedAt = ? WHERE shopId = ? AND key = ?').bind(JSON.stringify(body), now, shopId, 'receipt_config').run();
      } else {
        await db.prepare('INSERT INTO settings (id, shopId, key, value, createdAt, updatedAt) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(), shopId, 'receipt_config', JSON.stringify(body), now, now).run();
      }
      return c.json({ message: 'Receipt settings updated' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });
}
