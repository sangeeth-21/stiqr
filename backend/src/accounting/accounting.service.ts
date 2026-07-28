import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountingService {
  constructor(private prisma: PrismaService) {}

  async createLedgerEntry(data: any) {
    return this.prisma.ledger.create({
      data: {
        shopId: data.shopId,
        entityType: data.entityType,
        entityId: data.entityId,
        type: data.type,
        description: data.description,
        debit: data.debit || 0,
        credit: data.credit || 0,
        balance: data.balance,
        date: new Date(data.date),
        reference: data.reference,
      },
    });
  }

  async getLedger(shopId: string, query?: { entityType?: string; entityId?: string; from?: string; to?: string }) {
    const where: any = { shopId };
    if (query?.entityType) where.entityType = query.entityType;
    if (query?.entityId) where.entityId = query.entityId;
    if (query?.from || query?.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    return this.prisma.ledger.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }

  async createJournalEntry(data: any) {
    const totalDebit = data.lines.reduce((sum: number, line: any) => sum + line.debit, 0);
    const totalCredit = data.lines.reduce((sum: number, line: any) => sum + line.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error('Debit and credit must be equal');
    }

    return this.prisma.journal.create({
      data: {
        shopId: data.shopId,
        entryDate: new Date(data.entryDate),
        description: data.description,
        reference: data.reference,
        lines: {
          create: data.lines.map((line: any) => ({
            ledgerId: line.ledgerId,
            debit: line.debit,
            credit: line.credit,
            description: line.description,
          })),
        },
      },
      include: { lines: true },
    });
  }

  async getJournal(shopId: string, query?: { from?: string; to?: string }) {
    const where: any = { shopId };
    if (query?.from || query?.to) {
      where.entryDate = {};
      if (query.from) where.entryDate.gte = new Date(query.from);
      if (query.to) where.entryDate.lte = new Date(query.to);
    }

    return this.prisma.journal.findMany({
      where,
      include: { lines: true },
      orderBy: { entryDate: 'desc' },
    });
  }

  async getTrialBalance(shopId: string) {
    const entries = await this.prisma.ledger.findMany({
      where: { shopId },
    });

    const accounts: Record<string, { debit: number; credit: number }> = {};
    for (const entry of entries) {
      if (!accounts[entry.entityId]) accounts[entry.entityId] = { debit: 0, credit: 0 };
      accounts[entry.entityId].debit += entry.debit;
      accounts[entry.entityId].credit += entry.credit;
    }

    const totalDebit = Object.values(accounts).reduce((sum, a) => sum + a.debit, 0);
    const totalCredit = Object.values(accounts).reduce((sum, a) => sum + a.credit, 0);

    return { accounts, totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 0.01 };
  }

  async getProfitAndLoss(shopId: string, query?: { from?: string; to?: string }) {
    const where: any = { shopId };
    if (query?.from || query?.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    const sales = await this.prisma.sale.aggregate({
      where: { ...where, status: 'completed' },
      _sum: { total: true, taxAmount: true },
    });

    const expenses = await this.prisma.expense.aggregate({
      where,
      _sum: { amount: true },
    });

    const income = await this.prisma.income.aggregate({
      where,
      _sum: { amount: true },
    });

    const revenue = sales._sum.total || 0;
    const totalExpenses = expenses._sum.amount || 0;
    const otherIncome = income._sum.amount || 0;
    const profit = revenue - totalExpenses + otherIncome;

    return { revenue, totalExpenses, otherIncome, profit, taxCollected: sales._sum.taxAmount || 0 };
  }

  async getBalanceSheet(shopId: string) {
    const sales = await this.prisma.sale.aggregate({
      where: { shopId, status: 'completed' },
      _sum: { total: true, paidAmount: true, dueAmount: true },
    });

    const expenses = await this.prisma.expense.aggregate({
      where: { shopId },
      _sum: { amount: true },
    });

    const payments = await this.prisma.payment.aggregate({
      where: { shopId },
      _sum: { amount: true },
    });

    return {
      totalRevenue: sales._sum.total || 0,
      totalPaid: sales._sum.paidAmount || 0,
      totalDue: sales._sum.dueAmount || 0,
      totalExpenses: expenses._sum.amount || 0,
      totalPayments: payments._sum.amount || 0,
    };
  }
}
