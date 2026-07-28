import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ErrorTrackingService {
  constructor(private prisma: PrismaService) {}

  async logError(data: any) {
    const existing = await this.prisma.errorLog.findFirst({
      where: { message: data.message, source: data.source },
    });

    if (existing) {
      return this.prisma.errorLog.update({
        where: { id: existing.id },
        data: {
          occurrenceCount: existing.occurrenceCount + 1,
          lastOccurrence: new Date(),
        },
      });
    }

    return this.prisma.errorLog.create({
      data: {
        ...data,
        occurrenceCount: 1,
        lastOccurrence: new Date(),
      },
    });
  }

  async listErrors(query: any) {
    const { shopId, errorType, severity, resolved, source, page = 1, limit = 50 } = query;
    const where: any = {};

    if (shopId) where.shopId = shopId;
    if (errorType) where.errorType = errorType;
    if (severity) where.severity = severity;
    if (source) where.source = source;
    if (resolved !== undefined) where.resolved = resolved === 'true';

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.errorLog.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.errorLog.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getError(id: string) {
    const error = await this.prisma.errorLog.findFirst({ where: { id } });
    if (!error) throw new NotFoundException('Error log not found');
    return error;
  }

  async resolveError(id: string) {
    await this.getError(id);
    return this.prisma.errorLog.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
      },
    });
  }

  async deleteError(id: string) {
    await this.getError(id);
    return this.prisma.errorLog.delete({ where: { id } });
  }

  async getStats() {
    const [byErrorType, bySeverity, total, resolvedCount, unresolvedCount] = await Promise.all([
      this.prisma.errorLog.groupBy({ by: ['errorType'], _count: { errorType: true } }),
      this.prisma.errorLog.groupBy({ by: ['severity'], _count: { severity: true } }),
      this.prisma.errorLog.count(),
      this.prisma.errorLog.count({ where: { resolved: true } }),
      this.prisma.errorLog.count({ where: { resolved: false } }),
    ]);

    return {
      total,
      resolved: resolvedCount,
      unresolved: unresolvedCount,
      byErrorType: byErrorType.map((item) => ({ errorType: item.errorType, count: item._count.errorType })),
      bySeverity: bySeverity.map((item) => ({ severity: item.severity, count: item._count.severity })),
    };
  }
}
