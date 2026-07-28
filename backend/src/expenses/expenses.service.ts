import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.expense.create({
      data: {
        shopId: data.shopId,
        branchId: data.branchId,
        category: data.category,
        description: data.description,
        amount: data.amount,
        date: new Date(data.date),
        paymentMethod: data.paymentMethod,
        reference: data.reference,
        receipt: data.receipt,
        createdBy: data.createdBy,
      },
    });
  }

  async findAll(shopId: string, query?: { category?: string; branchId?: string; from?: string; to?: string }) {
    const where: any = { shopId };
    if (query?.category) where.category = query.category;
    if (query?.branchId) where.branchId = query.branchId;
    if (query?.from || query?.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    return this.prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.expense.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.expense.delete({ where: { id } });
  }
}
