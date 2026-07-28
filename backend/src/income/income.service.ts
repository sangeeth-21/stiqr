import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IncomeService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.income.create({
      data: {
        shopId: data.shopId,
        branchId: data.branchId,
        source: data.source,
        description: data.description,
        amount: data.amount,
        date: new Date(data.date),
        paymentMethod: data.paymentMethod,
        reference: data.reference,
        createdBy: data.createdBy,
      },
    });
  }

  async findAll(shopId: string, query?: { source?: string; branchId?: string; from?: string; to?: string }) {
    const where: any = { shopId };
    if (query?.source) where.source = query.source;
    if (query?.branchId) where.branchId = query.branchId;
    if (query?.from || query?.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    return this.prisma.income.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string) {
    const income = await this.prisma.income.findUnique({ where: { id } });
    if (!income) throw new NotFoundException('Income not found');
    return income;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.income.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.income.delete({ where: { id } });
  }
}
