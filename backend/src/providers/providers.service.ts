import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProviderConfigDto } from './dto/create-provider-config.dto';
import { UpdateProviderConfigDto } from './dto/update-provider-config.dto';
import { CreateProviderLogDto } from './dto/create-provider-log.dto';

@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

  async createConfig(dto: CreateProviderConfigDto) {
    return this.prisma.providerConfig.create({
      data: {
        provider: dto.provider,
        serviceType: dto.serviceType,
        apiEndpoint: dto.apiEndpoint,
        merchantId: dto.merchantId,
        isActive: dto.isActive ?? true,
        config: dto.config,
        priority: dto.priority ?? 0,
      },
    });
  }

  async listConfigs(query: { provider?: string; serviceType?: string }) {
    const where: any = {};
    if (query.provider) where.provider = query.provider;
    if (query.serviceType) where.serviceType = query.serviceType;
    return this.prisma.providerConfig.findMany({ where, orderBy: { priority: 'desc' } });
  }

  async getConfig(id: string) {
    const config = await this.prisma.providerConfig.findUnique({ where: { id } });
    if (!config) throw new NotFoundException('Provider config not found');
    return config;
  }

  async updateConfig(id: string, dto: UpdateProviderConfigDto) {
    await this.getConfig(id);
    return this.prisma.providerConfig.update({ where: { id }, data: dto });
  }

  async deleteConfig(id: string) {
    await this.getConfig(id);
    return this.prisma.providerConfig.delete({ where: { id } });
  }

  async listLogs(query: { provider?: string; success?: string; page?: string; limit?: string }) {
    const where: any = {};
    if (query.provider) where.provider = query.provider;
    if (query.success !== undefined) where.success = query.success === 'true';
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);
    const [data, total] = await Promise.all([
      this.prisma.providerLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.providerLog.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getLog(id: string) {
    const log = await this.prisma.providerLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('Provider log not found');
    return log;
  }

  async createLog(dto: CreateProviderLogDto) {
    return this.prisma.providerLog.create({
      data: {
        provider: dto.provider,
        serviceType: dto.serviceType,
        requestUrl: dto.requestUrl,
        requestBody: dto.requestBody,
        responseBody: dto.responseBody,
        statusCode: dto.statusCode,
        latency: dto.latency,
        success: dto.success ?? true,
        error: dto.error,
        transactionId: dto.transactionId,
      },
    });
  }

  async getStatus() {
    const logs = await this.prisma.providerLog.groupBy({
      by: ['provider'],
      _count: { id: true },
      _sum: { latency: true },
    });

    const statuses = await Promise.all(
      logs.map(async (log) => {
        const successCount = await this.prisma.providerLog.count({
          where: { provider: log.provider, success: true },
        });
        const failureCount = await this.prisma.providerLog.count({
          where: { provider: log.provider, success: false },
        });
        return {
          provider: log.provider,
          totalRequests: log._count.id,
          successCount,
          failureCount,
          avgLatency: log._count.id > 0 ? (log._sum.latency ?? 0) / log._count.id : 0,
        };
      }),
    );

    return statuses;
  }
}
