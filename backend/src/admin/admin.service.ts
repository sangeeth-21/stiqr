import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { AdminCreateSubscriptionDto } from './dto/create-admin-subscription.dto';
import { AdminUpdateSubscriptionDto } from './dto/update-admin-subscription.dto';
import { QueryDto } from './dto/query.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const [totalShops, activeShops, totalUsers, activeStaff, totalSales, totalRepairs] =
      await Promise.all([
        this.prisma.shop.count(),
        this.prisma.shop.count({ where: { isActive: true, deletedAt: null } }),
        this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
        this.prisma.employee.count({ where: { status: 'ACTIVE' } }),
        this.prisma.sale.aggregate({ _sum: { total: true } }),
        this.prisma.serviceRepair.count(),
      ]);

    const totalRevenue = await this.prisma.payment.aggregate({
      _sum: { amount: true },
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthlyRevenue = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    const expiredShops = await this.prisma.shop.count({
      where: {
        isActive: false,
        deletedAt: null,
      },
    });

    return {
      totalShops,
      activeShops,
      expiredShops,
      totalRevenue: totalRevenue._sum.amount ?? 0,
      monthlyRevenue: monthlyRevenue._sum.amount ?? 0,
      activeUsers: totalUsers,
      activeStaff,
      totalSales: totalSales._sum.total ?? 0,
      totalRepairs,
    };
  }

  async getShops(query: QueryDto) {
    const { search, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.shop.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { _count: { select: { users: true, products: true, customers: true } } },
      }),
      this.prisma.shop.count({ where }),
    ]);

    return { data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getShopDetails(id: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, email: true, name: true, role: true, status: true } },
        branches: { where: { deletedAt: null } },
        _count: { select: { products: true, customers: true, suppliers: true } },
      },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    const tenant = await this.prisma.tenant.findFirst({ where: { id } });
    let subscription = null;
    if (tenant) {
      subscription = await this.prisma.subscription.findFirst({
        where: { tenantId: tenant.id, status: 'ACTIVE' },
        include: { subscriptionPlan: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    return { ...shop, tenant, subscription };
  }

  async createShop(dto: CreateShopDto) {
    const existing = await this.prisma.shop.findUnique({ where: { slug: dto.slug } });
    if (existing) {
      throw new BadRequestException('Shop with this slug already exists');
    }
    return this.prisma.shop.create({ data: dto });
  }

  async updateShop(id: string, dto: UpdateShopDto) {
    const shop = await this.prisma.shop.findUnique({ where: { id } });
    if (!shop) throw new NotFoundException('Shop not found');

    if (dto.slug && dto.slug !== shop.slug) {
      const existing = await this.prisma.shop.findUnique({ where: { slug: dto.slug } });
      if (existing) throw new BadRequestException('Slug already in use');
    }

    return this.prisma.shop.update({ where: { id }, data: dto });
  }

  async deleteShop(id: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id } });
    if (!shop) throw new NotFoundException('Shop not found');
    return this.prisma.shop.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async suspendShop(id: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id } });
    if (!shop) throw new NotFoundException('Shop not found');
    return this.prisma.shop.update({ where: { id }, data: { isActive: false } });
  }

  async activateShop(id: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id } });
    if (!shop) throw new NotFoundException('Shop not found');
    return this.prisma.shop.update({ where: { id }, data: { isActive: true } });
  }

  async getSubscriptions(query: QueryDto) {
    const { search, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { plan: { contains: search } },
        { status: { contains: search } },
        { tenant: { name: { contains: search } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { tenant: true, subscriptionPlan: true },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return { data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async createSubscription(dto: AdminCreateSubscriptionDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const plan = await this.prisma.subscriptionPlan.findFirst({ where: { code: dto.plan } });

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const endDate = dto.endDate
      ? new Date(dto.endDate)
      : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const subscription = await this.prisma.subscription.create({
      data: {
        tenantId: dto.tenantId,
        plan: dto.plan,
        subscriptionPlanId: plan?.id ?? null,
        status: dto.status ?? 'ACTIVE',
        startDate,
        endDate,
        autoRenew: dto.autoRenew ?? false,
        maxUsers: plan?.maxUsers ?? 5,
        maxShops: plan?.maxShops ?? 1,
        maxProducts: plan?.maxProducts ?? 500,
        monthlyPrice: plan?.monthlyPrice ?? 0,
        yearlyPrice: plan?.yearlyPrice ?? 0,
      },
    });

    await this.prisma.subscriptionHistory.create({
      data: {
        subscriptionId: subscription.id,
        action: 'CREATED',
        newPlan: dto.plan,
        newEndDate: endDate,
        amount: dto.plan === 'TRIAL' ? 0 : plan?.monthlyPrice ?? 0,
        notes: 'Created by admin',
      },
    });

    return subscription;
  }

  async updateSubscription(id: string, dto: AdminUpdateSubscriptionDto) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Subscription not found');

    const data: any = {};
    if (dto.plan) {
      data.plan = dto.plan;
      const plan = await this.prisma.subscriptionPlan.findFirst({ where: { code: dto.plan } });
      if (plan) {
        data.subscriptionPlanId = plan.id;
        data.maxUsers = plan.maxUsers;
        data.maxShops = plan.maxShops;
        data.maxProducts = plan.maxProducts;
        data.monthlyPrice = plan.monthlyPrice;
        data.yearlyPrice = plan.yearlyPrice;
      }
    }
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    if (dto.autoRenew !== undefined) data.autoRenew = dto.autoRenew;
    if (dto.status) data.status = dto.status;

    return this.prisma.subscription.update({ where: { id }, data });
  }

  async deleteSubscription(id: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Subscription not found');
    await this.prisma.subscriptionHistory.deleteMany({ where: { subscriptionId: id } });
    await this.prisma.subscription.delete({ where: { id } });
    return { message: 'Subscription deleted successfully' };
  }

  async getPayments(query: QueryDto) {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { sale: { select: { invoiceNumber: true } } },
      }),
      this.prisma.payment.count(),
    ]);

    return { data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getPaymentDetails(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { sale: { include: { items: true, customer: true } } },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async getReports(type: string, query: QueryDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    switch (type) {
      case 'revenue': {
        const payments = await this.prisma.payment.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        });
        const total = await this.prisma.payment.count();
        const sum = await this.prisma.payment.aggregate({ _sum: { amount: true } });
        return {
          data: payments,
 summary: { totalRevenue: sum._sum.amount ?? 0, totalTransactions: total },
          pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
      }
      case 'sales': {
        const sales = await this.prisma.sale.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { items: true } } },
        });
        const total = await this.prisma.sale.count();
        const sum = await this.prisma.sale.aggregate({ _sum: { total: true } });
        return {
          data: sales,
          summary: { totalSales: sum._sum.total ?? 0, totalOrders: total },
          pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
      }
      case 'shops': {
        const shops = await this.prisma.shop.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          where: { deletedAt: null },
        });
        const total = await this.prisma.shop.count({ where: { deletedAt: null } });
        return {
          data: shops,
          pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
      }
      case 'subscriptions': {
        const subs = await this.prisma.subscription.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { tenant: true, subscriptionPlan: true },
        });
        const total = await this.prisma.subscription.count();
        return {
          data: subs,
          pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
      }
      default:
        throw new BadRequestException(`Unknown report type: ${type}. Use: revenue, sales, shops, subscriptions`);
    }
  }

  async getAnalytics(query: { period?: string; startDate?: string; endDate?: string }) {
    const { period = 'monthly', startDate, endDate } = query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const salesData = await this.prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const paymentsData = await this.prisma.payment.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const shopRegistrations = await this.prisma.shop.count({
      where: { createdAt: { gte: start, lte: end }, deletedAt: null },
    });

    const totalRevenue = paymentsData.reduce((sum, p) => sum + p.amount, 0);
    const totalSales = salesData.reduce((sum, s) => sum + s.total, 0);

    return {
      period,
      dateRange: { start, end },
      summary: {
        totalRevenue,
        totalSales,
        shopRegistrations,
        transactionCount: paymentsData.length,
        orderCount: salesData.length,
      },
      salesData,
      paymentsData,
    };
  }
}
