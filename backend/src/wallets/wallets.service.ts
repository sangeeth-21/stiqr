import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: { shopId: string; holderType: string; holderId: string }) {
    const existing = await this.prisma.wallet.findUnique({
      where: { shopId_holderType_holderId: { shopId: dto.shopId, holderType: dto.holderType, holderId: dto.holderId } },
    });
    if (existing) {
      throw new BadRequestException('Wallet already exists for this holder');
    }
    return this.prisma.wallet.create({ data: dto });
  }

  async findAll(shopId: string) {
    return this.prisma.wallet.findMany({ where: { shopId }, orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { id } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  async getBalance(id: string) {
    const wallet = await this.findOne(id);
    return { id: wallet.id, balance: wallet.balance, holdBalance: wallet.holdBalance, reservedBalance: wallet.reservedBalance };
  }

  async freeze(id: string) {
    const wallet = await this.findOne(id);
    if (wallet.status === 'FROZEN') throw new BadRequestException('Wallet is already frozen');
    return this.prisma.wallet.update({ where: { id }, data: { status: 'FROZEN', frozenAt: new Date() } });
  }

  async unfreeze(id: string) {
    const wallet = await this.findOne(id);
    if (wallet.status !== 'FROZEN') throw new BadRequestException('Wallet is not frozen');
    return this.prisma.wallet.update({ where: { id }, data: { status: 'ACTIVE', frozenAt: null } });
  }

  async statement(id: string, query: { page?: number; limit?: number; startDate?: string; endDate?: string }) {
    await this.findOne(id);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: any = { walletId: id };
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }
    const [data, total] = await Promise.all([
      this.prisma.walletLedger.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.walletLedger.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
