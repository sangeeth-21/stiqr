import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantAdminService {
  constructor(private prisma: PrismaService) {}

  async recordUsage(data: any) {
    return this.prisma.tenantUsage.create({ data });
  }

  async listUsage(query: any) {
    const { tenantId, period, page = 1, limit = 50 } = query;
    const where: any = {};

    if (tenantId) where.tenantId = tenantId;
    if (period) where.period = period;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.tenantUsage.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.tenantUsage.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUsage(id: string) {
    const usage = await this.prisma.tenantUsage.findFirst({ where: { id } });
    if (!usage) throw new NotFoundException('Tenant usage not found');
    return usage;
  }

  async updateUsage(id: string, data: any) {
    await this.getUsage(id);
    return this.prisma.tenantUsage.update({ where: { id }, data });
  }

  async recordMetric(data: any) {
    return this.prisma.performanceMetric.create({ data });
  }

  async listMetrics(query: any) {
    const { metricType, name, source, page = 1, limit = 50 } = query;
    const where: any = {};

    if (metricType) where.metricType = metricType;
    if (name) where.name = name;
    if (source) where.source = source;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.performanceMetric.findMany({ where, skip, take: limit, orderBy: { recordedAt: 'desc' } }),
      this.prisma.performanceMetric.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getLatestMetrics() {
    const metricTypes = await this.prisma.performanceMetric.groupBy({
      by: ['metricType'],
    });

    const latestMetrics = await Promise.all(
      metricTypes.map(async (mt) => {
        const latest = await this.prisma.performanceMetric.findFirst({
          where: { metricType: mt.metricType },
          orderBy: { recordedAt: 'desc' },
        });
        return latest;
      }),
    );

    return latestMetrics.filter(Boolean);
  }

  async createAuditEntry(data: any) {
    return this.prisma.auditTrail.create({ data });
  }

  async listAuditEntries(query: any) {
    const { tenantId, shopId, userId, resource, action, page = 1, limit = 50 } = query;
    const where: any = {};

    if (tenantId) where.tenantId = tenantId;
    if (shopId) where.shopId = shopId;
    if (userId) where.userId = userId;
    if (resource) where.resource = resource;
    if (action) where.action = action;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.auditTrail.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.auditTrail.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getAuditEntry(id: string) {
    const entry = await this.prisma.auditTrail.findFirst({ where: { id } });
    if (!entry) throw new NotFoundException('Audit entry not found');
    return entry;
  }

  async createRetentionPolicy(data: any) {
    return this.prisma.dataRetention.create({ data });
  }

  async listRetentionPolicies() {
    return this.prisma.dataRetention.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async updateRetentionPolicy(id: string, data: any) {
    const policy = await this.prisma.dataRetention.findFirst({ where: { id } });
    if (!policy) throw new NotFoundException('Retention policy not found');
    return this.prisma.dataRetention.update({ where: { id }, data });
  }

  async deleteRetentionPolicy(id: string) {
    const policy = await this.prisma.dataRetention.findFirst({ where: { id } });
    if (!policy) throw new NotFoundException('Retention policy not found');
    return this.prisma.dataRetention.delete({ where: { id } });
  }
}
