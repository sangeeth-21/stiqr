import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RefundService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.refund.create({
      data: {
        shopId: data.shopId,
        originalTransactionId: data.originalTransactionId,
        refundType: data.refundType,
        amount: data.amount,
        reason: data.reason,
      },
    });
  }

  async findAll(query: { shopId?: string; status?: string }) {
    const where: any = {};
    if (query.shopId) where.shopId = query.shopId;
    if (query.status) where.status = query.status;

    return this.prisma.refund.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id },
      include: { transaction: true },
    });
    if (!refund) throw new NotFoundException('Refund not found');
    return refund;
  }

  async approve(id: string, approvedBy: string) {
    const refund = await this.findOne(id);
    if (refund.status !== 'REQUESTED') {
      throw new BadRequestException('Only requested refunds can be approved');
    }
    return this.prisma.refund.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date(),
      },
    });
  }

  async process(id: string, utrNumber: string) {
    const refund = await this.findOne(id);
    if (refund.status !== 'APPROVED') {
      throw new BadRequestException('Only approved refunds can be processed');
    }
    return this.prisma.refund.update({
      where: { id },
      data: {
        status: 'PROCESSING',
        utrNumber,
      },
    });
  }

  async reject(id: string, reason: string) {
    const refund = await this.findOne(id);
    if (refund.status !== 'REQUESTED') {
      throw new BadRequestException('Only requested refunds can be rejected');
    }
    return this.prisma.refund.update({
      where: { id },
      data: {
        status: 'REJECTED',
        failureReason: reason,
      },
    });
  }
}
