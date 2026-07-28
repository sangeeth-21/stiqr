import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSalesReport(shopId: string, query?: { from?: string; to?: string; branchId?: string }) {
    const where: any = { shopId, status: 'completed' };
    if (query?.branchId) where.branchId = query.branchId;
    if (query?.from || query?.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    const sales = await this.prisma.sale.findMany({ where, include: { items: true } });
    const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
    const totalCount = sales.length;
    const avgSale = totalCount > 0 ? totalSales / totalCount : 0;

    return { sales, totalSales, totalCount, avgSale };
  }

  async getPurchasesReport(shopId: string, query?: { from?: string; to?: string }) {
    const where: any = { shopId };
    if (query?.from || query?.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    const purchases = await this.prisma.purchase.findMany({ where, include: { items: true } });
    const totalPurchases = purchases.reduce((sum, p) => sum + p.total, 0);

    return { purchases, totalPurchases, totalCount: purchases.length };
  }

  async getProfitReport(shopId: string, query?: { from?: string; to?: string }) {
    const where: any = { shopId };
    if (query?.from || query?.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    const sales = await this.prisma.sale.aggregate({
      where: { ...where, status: 'completed' },
      _sum: { total: true },
    });

    const purchases = await this.prisma.purchase.aggregate({
      where,
      _sum: { total: true },
    });

    const expenses = await this.prisma.expense.aggregate({
      where,
      _sum: { amount: true },
    });

    const revenue = sales._sum.total || 0;
    const cogs = purchases._sum.total || 0;
    const operatingExpenses = expenses._sum.amount || 0;
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - operatingExpenses;

    return { revenue, cogs, operatingExpenses, grossProfit, netProfit, margin: revenue > 0 ? (netProfit / revenue) * 100 : 0 };
  }

  async getExpensesReport(shopId: string, query?: { from?: string; to?: string }) {
    const where: any = { shopId };
    if (query?.from || query?.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    const expenses = await this.prisma.expense.findMany({ where, orderBy: { date: 'desc' } });
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const byCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);

    return { expenses, totalExpenses, totalCount: expenses.length, byCategory };
  }

  async getCustomersReport(shopId: string) {
    const customers = await this.prisma.customer.findMany({
      where: { shopId },
      include: { sales: { where: { status: 'completed' } } },
    });

    const report = customers.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      totalPurchases: c.sales.length,
      totalSpent: c.sales.reduce((sum, s) => sum + s.total, 0),
    }));

    return { customers: report, totalCount: report.length };
  }

  async getSuppliersReport(shopId: string) {
    const suppliers = await this.prisma.supplier.findMany({
      where: { shopId },
      include: { purchases: true },
    });

    const report = suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      totalPurchases: s.purchases.length,
      totalSpent: s.purchases.reduce((sum, p) => sum + p.total, 0),
    }));

    return { suppliers: report, totalCount: report.length };
  }

  async getInventoryReport(shopId: string) {
    const products = await this.prisma.product.findMany({
      where: { shopId },
      include: { stock: true },
    });

    const totalProducts = products.length;
    const totalStockValue = products.reduce((sum, p) => {
      const stockQty = p.stock.reduce((s, st) => s + st.quantity, 0);
      return sum + stockQty * p.sellingPrice;
    }, 0);
    const lowStock = products.filter((p) => {
      const total = p.stock.reduce((s, st) => s + st.quantity, 0);
      return total <= (p.minStock || 10);
    });

    return { products, totalProducts, totalStockValue, lowStockCount: lowStock.length, lowStock };
  }

  async getTaxReport(shopId: string, query?: { from?: string; to?: string }) {
    const where: any = { shopId, status: 'completed' };
    if (query?.from || query?.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    const sales = await this.prisma.sale.aggregate({
      where,
      _sum: { taxAmount: true, total: true },
    });

    return { totalSales: sales._sum.total || 0, totalTax: sales._sum.taxAmount || 0 };
  }

  async getEmployeesReport(shopId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { shopId },
    });

    return { employees, totalCount: employees.length };
  }

  async getDashboard(shopId: string) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [dailySales, monthlySales, totalProducts, lowStockProducts, pendingOrders, recentSales, topProducts, recentCustomers] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { shopId, status: 'completed', date: { gte: startOfDay } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.sale.aggregate({
        where: { shopId, status: 'completed', date: { gte: startOfMonth } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.product.count({ where: { shopId } }),
      this.prisma.product.findMany({
        where: { shopId, stock: { some: { quantity: { lte: 10 } } } },
        take: 5,
      }),
      this.prisma.serviceRepair.count({
        where: { shopId, status: { in: ['received', 'diagnosed', 'in_repair', 'waiting_parts'] } },
      }),
      this.prisma.sale.findMany({
        where: { shopId, status: 'completed' },
        take: 10,
        orderBy: { date: 'desc' },
      }),
      this.prisma.saleItem.groupBy({
        by: ['productId'],
        where: { sale: { shopId, status: 'completed' } },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
      this.prisma.customer.findMany({
        where: { shopId },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      dailySales: { total: dailySales._sum.total || 0, count: dailySales._count },
      monthlySales: { total: monthlySales._sum.total || 0, count: monthlySales._count },
      totalProducts,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
      pendingOrders,
      recentSales,
      topProducts,
      recentCustomers,
    };
  }
}
