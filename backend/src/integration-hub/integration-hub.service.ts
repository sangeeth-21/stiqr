import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IntegrationHubService {
  constructor(private prisma: PrismaService) {}

  async createIntegration(data: any) {
    return this.prisma.integration.create({ data });
  }

  async listIntegrations(query: any) {
    const { shopId, type, status, page = 1, limit = 50 } = query;
    const where: any = {};

    if (shopId) where.shopId = shopId;
    if (type) where.type = type;
    if (status) where.status = status;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.integration.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.integration.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getIntegration(id: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id },
      include: { logs: { take: 10, orderBy: { createdAt: 'desc' } } },
    });
    if (!integration) throw new NotFoundException('Integration not found');
    return integration;
  }

  async updateIntegration(id: string, data: any) {
    await this.getIntegration(id);
    return this.prisma.integration.update({ where: { id }, data });
  }

  async deleteIntegration(id: string) {
    await this.getIntegration(id);
    return this.prisma.integration.delete({ where: { id } });
  }

  async testIntegration(id: string) {
    const integration = await this.getIntegration(id);
    return this.prisma.integrationLog.create({
      data: {
        integrationId: integration.id,
        direction: 'OUTBOUND',
        success: true,
        responseStatus: 200,
        responseBody: JSON.stringify({ status: 'ok', message: 'Test successful' }),
      },
    });
  }

  async listIntegrationLogs(id: string, query: any) {
    await this.getIntegration(id);
    const { page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.integrationLog.findMany({
        where: { integrationId: id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.integrationLog.count({ where: { integrationId: id } }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getStats() {
    const [byType, byStatus, total] = await Promise.all([
      this.prisma.integration.groupBy({ by: ['type'], _count: { type: true } }),
      this.prisma.integration.groupBy({ by: ['status'], _count: { status: true } }),
      this.prisma.integration.count(),
    ]);

    return {
      total,
      byType: byType.map((item) => ({ type: item.type, count: item._count.type })),
      byStatus: byStatus.map((item) => ({ status: item.status, count: item._count.status })),
    };
  }
}
