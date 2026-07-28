import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinancialReportsService {
  constructor(private prisma: PrismaService) {}

  private buildDateFilter(startDate?: string, endDate?: string) {
    const filter: any = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.gte = new Date(startDate);
      if (endDate) filter.createdAt.lte = new Date(endDate);
    }
    return filter;
  }

  async getWalletReport(shopId: string, query: { startDate?: string; endDate?: string }) {
    const wallets = await this.prisma.wallet.findMany({
      where: { shopId },
      include: {
        transactions: {
          where: this.buildDateFilter(query.startDate, query.endDate),
        },
      },
    });

    let totalCredit = 0;
    let totalDebit = 0;

    for (const wallet of wallets) {
      for (const txn of wallet.transactions) {
        if (txn.type === 'CREDIT' || txn.type === 'REFUND') {
          totalCredit += txn.amount;
        } else if (txn.type === 'DEBIT' || txn.type === 'HOLD') {
          totalDebit += txn.amount;
        }
      }
    }

    return {
      shopId,
      totalCredit,
      totalDebit,
      netBalance: totalCredit - totalDebit,
      walletCount: wallets.length,
    };
  }

  async getTransactionReport(shopId: string, query: { type?: string; startDate?: string; endDate?: string }) {
    const where: any = { shopId };
    if (query.type) where.type = query.type;
    Object.assign(where, this.buildDateFilter(query.startDate, query.endDate));

    const transactions = await this.prisma.financialTransaction.findMany({ where });
    const totalCount = transactions.length;
    const totalAmount = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const successCount = transactions.filter((t) => t.status === 'SUCCESS').length;
    const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;

    const byStatus = transactions.reduce((acc, t) => {
      if (!acc[t.status]) acc[t.status] = { count: 0, totalAmount: 0 };
      acc[t.status].count += 1;
      acc[t.status].totalAmount += t.totalAmount;
      return acc;
    }, {} as Record<string, { count: number; totalAmount: number }>);

    return { shopId, totalCount, totalAmount, successRate, byStatus };
  }

  async getCommissionReport(shopId: string, query: { startDate?: string; endDate?: string }) {
    const where: any = { shopId };
    Object.assign(where, this.buildDateFilter(query.startDate, query.endDate));

    const entries = await this.prisma.commissionLedger.findMany({ where });
    const totalCount = entries.length;
    const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);
    const totalCommission = entries.reduce((sum, e) => sum + e.commissionAmount, 0);

    const byStatus = entries.reduce((acc, e) => {
      if (!acc[e.status]) acc[e.status] = { count: 0, totalAmount: 0, totalCommission: 0 };
      acc[e.status].count += 1;
      acc[e.status].totalAmount += e.amount;
      acc[e.status].totalCommission += e.commissionAmount;
      return acc;
    }, {} as Record<string, { count: number; totalAmount: number; totalCommission: number }>);

    return { shopId, totalCount, totalAmount, totalCommission, byStatus };
  }

  async getSettlementReport(shopId: string, query: { startDate?: string; endDate?: string }) {
    const where: any = { shopId };
    Object.assign(where, this.buildDateFilter(query.startDate, query.endDate));

    const settlements = await this.prisma.settlement.findMany({ where });
    const totalCount = settlements.length;
    const totalAmount = settlements.reduce((sum, s) => sum + s.amount, 0);
    const totalCharges = settlements.reduce((sum, s) => sum + s.charges, 0);
    const totalNetAmount = settlements.reduce((sum, s) => sum + s.netAmount, 0);

    const byStatus = settlements.reduce((acc, s) => {
      if (!acc[s.status]) acc[s.status] = { count: 0, totalAmount: 0, totalCharges: 0, totalNetAmount: 0 };
      acc[s.status].count += 1;
      acc[s.status].totalAmount += s.amount;
      acc[s.status].totalCharges += s.charges;
      acc[s.status].totalNetAmount += s.netAmount;
      return acc;
    }, {} as Record<string, { count: number; totalAmount: number; totalCharges: number; totalNetAmount: number }>);

    return { shopId, totalCount, totalAmount, totalCharges, totalNetAmount, byStatus };
  }

  async getDmtReport(shopId: string, query: { startDate?: string; endDate?: string }) {
    const where: any = { shopId };
    Object.assign(where, this.buildDateFilter(query.startDate, query.endDate));

    const transfers = await this.prisma.dMTTransfer.findMany({ where });
    const totalCount = transfers.length;
    const totalAmount = transfers.reduce((sum, t) => sum + t.amount, 0);
    const totalCharges = transfers.reduce((sum, t) => sum + t.charges, 0);

    const byStatus = transfers.reduce((acc, t) => {
      if (!acc[t.status]) acc[t.status] = { count: 0, totalAmount: 0, totalCharges: 0 };
      acc[t.status].count += 1;
      acc[t.status].totalAmount += t.amount;
      acc[t.status].totalCharges += t.charges;
      return acc;
    }, {} as Record<string, { count: number; totalAmount: number; totalCharges: number }>);

    return { shopId, totalCount, totalAmount, totalCharges, byStatus };
  }

  async getRechargeReport(shopId: string, query: { startDate?: string; endDate?: string }) {
    const where: any = { shopId };
    Object.assign(where, this.buildDateFilter(query.startDate, query.endDate));

    const recharges = await this.prisma.recharge.findMany({ where });
    const totalCount = recharges.length;
    const totalAmount = recharges.reduce((sum, r) => sum + r.amount, 0);
    const totalConvenienceFee = recharges.reduce((sum, r) => sum + r.convenienceFee, 0);

    const byType = recharges.reduce((acc, r) => {
      if (!acc[r.type]) acc[r.type] = { count: 0, totalAmount: 0 };
      acc[r.type].count += 1;
      acc[r.type].totalAmount += r.amount;
      return acc;
    }, {} as Record<string, { count: number; totalAmount: number }>);

    const byStatus = recharges.reduce((acc, r) => {
      if (!acc[r.status]) acc[r.status] = { count: 0, totalAmount: 0 };
      acc[r.status].count += 1;
      acc[r.status].totalAmount += r.amount;
      return acc;
    }, {} as Record<string, { count: number; totalAmount: number }>);

    return { shopId, totalCount, totalAmount, totalConvenienceFee, byType, byStatus };
  }

  async getRefundReport(shopId: string, query: { startDate?: string; endDate?: string }) {
    const where: any = { shopId };
    Object.assign(where, this.buildDateFilter(query.startDate, query.endDate));

    const refunds = await this.prisma.refund.findMany({ where });
    const totalCount = refunds.length;
    const totalAmount = refunds.reduce((sum, r) => sum + r.amount, 0);

    const byStatus = refunds.reduce((acc, r) => {
      if (!acc[r.status]) acc[r.status] = { count: 0, totalAmount: 0 };
      acc[r.status].count += 1;
      acc[r.status].totalAmount += r.amount;
      return acc;
    }, {} as Record<string, { count: number; totalAmount: number }>);

    return { shopId, totalCount, totalAmount, byStatus };
  }

  async getProfitReport(shopId: string, query: { startDate?: string; endDate?: string }) {
    const dateFilter = this.buildDateFilter(query.startDate, query.endDate);

    const transactions = await this.prisma.financialTransaction.findMany({
      where: { shopId, status: 'SUCCESS', ...dateFilter },
    });

    const commissions = await this.prisma.commissionLedger.findMany({
      where: { shopId, ...dateFilter },
    });

    const settlements = await this.prisma.settlement.findMany({
      where: { shopId, ...dateFilter },
    });

    const totalRevenue = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalCommissionEarned = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
    const totalCharges = transactions.reduce((sum, t) => sum + t.charges, 0) +
      settlements.reduce((sum, s) => sum + s.charges, 0);
    const netProfit = totalCommissionEarned - totalCharges;

    return {
      shopId,
      totalRevenue,
      totalCommissionEarned,
      totalCharges,
      netProfit,
    };
  }
}
