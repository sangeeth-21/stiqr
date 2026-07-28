import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinancialTransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: any) {
    return this.prisma.financialTransaction.create({
      data: {
        shopId: dto.shopId,
        type: dto.type,
        amount: dto.amount,
        charges: dto.charges || 0,
        totalAmount: dto.totalAmount,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        initiatedBy: dto.initiatedBy,
        metadata: dto.metadata,
        status: 'INITIATED',
      },
    });
  }

  async findAll(query: { shopId: string; type?: string; status?: string; page?: number; limit?: number; startDate?: string; endDate?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: any = { shopId: query.shopId };
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }
    const [data, total] = await Promise.all([
      this.prisma.financialTransaction.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.financialTransaction.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const transaction = await this.prisma.financialTransaction.findUnique({ where: { id } });
    if (!transaction) throw new NotFoundException('Financial transaction not found');
    return transaction;
  }

  async getLogs(id: string) {
    await this.findOne(id);
    return this.prisma.transactionLog.findMany({ where: { transactionId: id }, orderBy: { createdAt: 'desc' } });
  }

  async updateStatus(id: string, dto: { status: string; message?: string }) {
    const transaction = await this.findOne(id);
    if (transaction.status === 'SUCCESS' || transaction.status === 'FAILED') {
      throw new BadRequestException('Cannot update status of a terminal transaction');
    }

    await this.prisma.transactionLog.create({
      data: {
        transactionId: id,
        action: 'STATUS_UPDATE',
        status: dto.status,
        message: dto.message,
      },
    });

    return this.prisma.financialTransaction.update({
      where: { id },
      data: {
        status: dto.status,
        failureReason: dto.status === 'FAILED' ? dto.message : undefined,
      },
    });
  }
}
