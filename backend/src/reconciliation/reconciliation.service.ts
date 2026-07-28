import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReconciliationService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.reconciliation.create({
      data: {
        date: new Date(data.date),
        shopId: data.shopId,
        serviceType: data.serviceType,
      },
    });
  }

  async findAll(query: { shopId?: string; serviceType?: string; status?: string }) {
    const where: any = {};
    if (query.shopId) where.shopId = query.shopId;
    if (query.serviceType) where.serviceType = query.serviceType;
    if (query.status) where.status = query.status;

    return this.prisma.reconciliation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const reconciliation = await this.prisma.reconciliation.findUnique({
      where: { id },
      include: { logs: true },
    });
    if (!reconciliation) throw new NotFoundException('Reconciliation not found');
    return reconciliation;
  }

  async resolve(id: string, logId: string, resolution: string, resolvedBy: string) {
    await this.findOne(id);
    const log = await this.prisma.reconciliationLog.findUnique({ where: { id: logId } });
    if (!log) throw new NotFoundException('Reconciliation log not found');
    if (log.resolvedAt) throw new BadRequestException('Log is already resolved');

    return this.prisma.reconciliationLog.update({
      where: { id: logId },
      data: {
        resolution,
        resolvedBy,
        resolvedAt: new Date(),
      },
    });
  }

  async complete(id: string) {
    const reconciliation = await this.findOne(id);
    if (reconciliation.status === 'COMPLETED') {
      throw new BadRequestException('Reconciliation is already completed');
    }
    return this.prisma.reconciliation.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        reconciledAt: new Date(),
      },
    });
  }
}
