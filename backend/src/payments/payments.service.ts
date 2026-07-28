import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.payment.create({
      data: {
        shopId: data.shopId,
        entityType: data.entityType,
        entityId: data.entityId,
        saleId: data.saleId,
        method: data.method,
        amount: data.amount,
        reference: data.reference,
        notes: data.notes,
        processedAt: data.processedAt ? new Date(data.processedAt) : new Date(),
        createdBy: data.createdBy,
      },
    });
  }

  async findAll(shopId: string, query?: { entityType?: string; entityId?: string; method?: string; from?: string; to?: string }) {
    const where: any = { shopId };
    if (query?.entityType) where.entityType = query.entityType;
    if (query?.entityId) where.entityId = query.entityId;
    if (query?.method) where.method = query.method;
    if (query?.from || query?.to) {
      where.processedAt = {};
      if (query.from) where.processedAt.gte = new Date(query.from);
      if (query.to) where.processedAt.lte = new Date(query.to);
    }

    return this.prisma.payment.findMany({
      where,
      orderBy: { processedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async refund(id: string, data: { amount: number; reason: string }) {
    const payment = await this.findOne(id);

    return this.prisma.payment.create({
      data: {
        shopId: payment.shopId,
        entityType: payment.entityType,
        entityId: payment.entityId,
        saleId: payment.saleId,
        method: payment.method,
        amount: -Math.abs(data.amount),
        reference: `REFUND-${payment.reference || id}`,
        notes: data.reason,
        processedAt: new Date(),
        createdBy: 'system',
      },
    });
  }
}
