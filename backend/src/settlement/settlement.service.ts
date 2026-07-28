import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettlementService {
  constructor(private prisma: PrismaService) {}

  async create(dto: any) {
    const wallet = await this.prisma.wallet.findUnique({ where: { id: dto.walletId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (wallet.balance < dto.amount) throw new BadRequestException('Insufficient wallet balance');

    return this.prisma.settlement.create({
      data: {
        shopId: dto.shopId,
        walletId: dto.walletId,
        amount: dto.amount,
        netAmount: dto.amount,
        bankAccountNumber: dto.bankAccountNumber,
        bankName: dto.bankName,
        ifscCode: dto.ifscCode,
        accountHolderName: dto.accountHolderName,
        status: 'REQUESTED',
      },
    });
  }

  async findAll(query: { shopId?: string; status?: string }) {
    const where: any = {};
    if (query.shopId) where.shopId = query.shopId;
    if (query.status) where.status = query.status;
    return this.prisma.settlement.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const settlement = await this.prisma.settlement.findUnique({ where: { id } });
    if (!settlement) throw new NotFoundException('Settlement not found');
    return settlement;
  }

  async approve(id: string, processedBy: string) {
    const settlement = await this.findOne(id);
    if (settlement.status !== 'REQUESTED') throw new BadRequestException('Settlement cannot be approved');
    return this.prisma.settlement.update({
      where: { id },
      data: { status: 'APPROVED', processedBy, processedAt: new Date() },
    });
  }

  async process(id: string, utrNumber: string) {
    const settlement = await this.findOne(id);
    if (settlement.status !== 'APPROVED') throw new BadRequestException('Settlement must be approved first');

    await this.prisma.$transaction([
      this.prisma.settlement.update({
        where: { id },
        data: { status: 'PROCESSING', utrNumber },
      }),
      this.prisma.wallet.update({
        where: { id: settlement.walletId },
        data: { balance: { decrement: settlement.amount } },
      }),
    ]);

    return this.prisma.settlement.update({
      where: { id },
      data: { status: 'COMPLETED', processedAt: new Date() },
    });
  }

  async fail(id: string, failureReason: string) {
    const settlement = await this.findOne(id);
    if (settlement.status === 'COMPLETED') throw new BadRequestException('Cannot fail a completed settlement');
    return this.prisma.settlement.update({
      where: { id },
      data: { status: 'FAILED', failureReason, retryCount: settlement.retryCount + 1 },
    });
  }

  async history(shopId: string) {
    return this.prisma.settlement.findMany({ where: { shopId }, orderBy: { createdAt: 'desc' } });
  }
}
