import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletTransactionsService {
  constructor(private prisma: PrismaService) {}

  async credit(dto: { walletId: string; amount: number; description?: string; referenceType?: string; referenceId?: string; idempotencyKey?: string }) {
    const wallet = await this.prisma.wallet.findUnique({ where: { id: dto.walletId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (wallet.status !== 'ACTIVE') throw new BadRequestException('Wallet is not active');
    if (wallet.currentDayUsage + dto.amount > wallet.dailyLimit) throw new BadRequestException('Daily limit exceeded');
    if (wallet.currentMonthUsage + dto.amount > wallet.monthlyLimit) throw new BadRequestException('Monthly limit exceeded');

    const newBalance = wallet.balance + dto.amount;

    const [transaction, ledger] = await this.prisma.$transaction([
      this.prisma.walletTransaction.create({
        data: {
          walletId: dto.walletId,
          type: 'CREDIT',
          amount: dto.amount,
          balance: newBalance,
          description: dto.description,
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          idempotencyKey: dto.idempotencyKey,
          status: 'SUCCESS',
          processedAt: new Date(),
        },
      }),
      this.prisma.wallet.update({
        where: { id: dto.walletId },
        data: {
          balance: newBalance,
          currentDayUsage: wallet.currentDayUsage + dto.amount,
          currentMonthUsage: wallet.currentMonthUsage + dto.amount,
        },
      }),
    ]);

    await this.prisma.walletLedger.create({
      data: {
        walletId: dto.walletId,
        transactionId: transaction.id,
        type: 'CREDIT',
        amount: dto.amount,
        balanceAfter: newBalance,
        description: dto.description,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
      },
    });

    return transaction;
  }

  async debit(dto: { walletId: string; amount: number; description?: string; referenceType?: string; referenceId?: string; idempotencyKey?: string }) {
    const wallet = await this.prisma.wallet.findUnique({ where: { id: dto.walletId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (wallet.status !== 'ACTIVE') throw new BadRequestException('Wallet is not active');
    if (wallet.balance < dto.amount) throw new BadRequestException('Insufficient balance');
    if (wallet.currentDayUsage + dto.amount > wallet.dailyLimit) throw new BadRequestException('Daily limit exceeded');
    if (wallet.currentMonthUsage + dto.amount > wallet.monthlyLimit) throw new BadRequestException('Monthly limit exceeded');

    const newBalance = wallet.balance - dto.amount;

    const [transaction] = await this.prisma.$transaction([
      this.prisma.walletTransaction.create({
        data: {
          walletId: dto.walletId,
          type: 'DEBIT',
          amount: dto.amount,
          balance: newBalance,
          description: dto.description,
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          idempotencyKey: dto.idempotencyKey,
          status: 'SUCCESS',
          processedAt: new Date(),
        },
      }),
      this.prisma.wallet.update({
        where: { id: dto.walletId },
        data: {
          balance: newBalance,
          currentDayUsage: wallet.currentDayUsage + dto.amount,
          currentMonthUsage: wallet.currentMonthUsage + dto.amount,
        },
      }),
    ]);

    await this.prisma.walletLedger.create({
      data: {
        walletId: dto.walletId,
        transactionId: transaction.id,
        type: 'DEBIT',
        amount: dto.amount,
        balanceAfter: newBalance,
        description: dto.description,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
      },
    });

    return transaction;
  }

  async findAll(query: { walletId: string; page?: number; limit?: number; type?: string; status?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: any = { walletId: query.walletId };
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    const [data, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.walletTransaction.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const transaction = await this.prisma.walletTransaction.findUnique({ where: { id } });
    if (!transaction) throw new NotFoundException('Wallet transaction not found');
    return transaction;
  }

  async reverse(id: string) {
    const original = await this.findOne(id);
    if (original.status !== 'SUCCESS') throw new BadRequestException('Only successful transactions can be reversed');
    if (original.type === 'REVERSAL') throw new BadRequestException('Cannot reverse a reversal transaction');

    const wallet = await this.prisma.wallet.findUnique({ where: { id: original.walletId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const reverseType = original.type === 'CREDIT' ? 'DEBIT' : 'CREDIT';
    const newBalance = reverseType === 'CREDIT' ? wallet.balance + original.amount : wallet.balance - original.amount;

    if (reverseType === 'DEBIT' && wallet.balance < original.amount) {
      throw new BadRequestException('Insufficient balance to reverse');
    }

    const [reversalTransaction] = await this.prisma.$transaction([
      this.prisma.walletTransaction.create({
        data: {
          walletId: original.walletId,
          type: 'REVERSAL',
          amount: original.amount,
          balance: newBalance,
          description: `Reversal of ${original.id}`,
          referenceType: 'WALLET_TRANSACTION',
          referenceId: original.id,
          status: 'SUCCESS',
          processedAt: new Date(),
        },
      }),
      this.prisma.wallet.update({
        where: { id: original.walletId },
        data: { balance: newBalance },
      }),
    ]);

    await this.prisma.walletLedger.create({
      data: {
        walletId: original.walletId,
        transactionId: reversalTransaction.id,
        type: 'ADJUSTMENT',
        amount: original.amount,
        balanceAfter: newBalance,
        description: `Reversal of transaction ${original.id}`,
        referenceType: 'WALLET_TRANSACTION',
        referenceId: original.id,
      },
    });

    return reversalTransaction;
  }
}
