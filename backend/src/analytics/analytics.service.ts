import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async trackEvent(data: any) {
    return this.prisma.analyticsEvent.create({ data });
  }

  async listEvents(query: any) {
    const { shopId, eventType, category, startDate, endDate, page = 1, limit = 50 } = query;
    const where: any = {};

    if (shopId) where.shopId = shopId;
    if (eventType) where.eventType = eventType;
    if (category) where.category = category;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.analyticsEvent.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.analyticsEvent.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createDashboard(data: any) {
    return this.prisma.analyticsDashboard.create({ data });
  }

  async listDashboards() {
    return this.prisma.analyticsDashboard.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async getDashboard(id: string) {
    const dashboard = await this.prisma.analyticsDashboard.findFirst({
      where: { id },
      include: { widgets: { orderBy: { position: 'asc' } } },
    });
    if (!dashboard) throw new NotFoundException('Dashboard not found');
    return dashboard;
  }

  async updateDashboard(id: string, data: any) {
    await this.getDashboard(id);
    return this.prisma.analyticsDashboard.update({ where: { id }, data });
  }

  async deleteDashboard(id: string) {
    await this.getDashboard(id);
    await this.prisma.analyticsWidget.deleteMany({ where: { dashboardId: id } });
    return this.prisma.analyticsDashboard.delete({ where: { id } });
  }

  async addWidget(data: any) {
    await this.getDashboard(data.dashboardId);
    return this.prisma.analyticsWidget.create({ data });
  }

  async updateWidget(id: string, data: any) {
    const widget = await this.prisma.analyticsWidget.findFirst({ where: { id } });
    if (!widget) throw new NotFoundException('Widget not found');
    return this.prisma.analyticsWidget.update({ where: { id }, data });
  }

  async deleteWidget(id: string) {
    const widget = await this.prisma.analyticsWidget.findFirst({ where: { id } });
    if (!widget) throw new NotFoundException('Widget not found');
    return this.prisma.analyticsWidget.delete({ where: { id } });
  }

  async getSummary(shopId?: string) {
    const where: any = {};
    if (shopId) where.shopId = shopId;

    const [byType, byCategory, totalEvents] = await Promise.all([
      this.prisma.analyticsEvent.groupBy({ by: ['eventType'], where, _count: { eventType: true } }),
      this.prisma.analyticsEvent.groupBy({ by: ['category'], where, _count: { category: true } }),
      this.prisma.analyticsEvent.count({ where }),
    ]);

    return {
      totalEvents,
      byType: byType.map((item) => ({ type: item.eventType, count: item._count.eventType })),
      byCategory: byCategory.map((item) => ({ category: item.category, count: item._count.category })),
    };
  }

  async getTrends(shopId?: string, days = 30) {
    const where: any = {};
    if (shopId) where.shopId = shopId;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    where.createdAt = { gte: startDate };

    const events = await this.prisma.analyticsEvent.findMany({
      where,
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const dateCounts: Record<string, number> = {};
    events.forEach((e) => {
      const date = e.createdAt.toISOString().split('T')[0];
      dateCounts[date] = (dateCounts[date] || 0) + 1;
    });

    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      result.push({ date: dateStr, count: dateCounts[dateStr] || 0 });
    }

    return result;
  }
}
