import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RechargeService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    const ref = `RC-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    return this.prisma.recharge.create({
      data: {
        shopId: data.shopId,
        type: data.type,
        operator: data.operator,
        operatorCode: data.operatorCode,
        mobileOrAccountNumber: data.mobileOrAccountNumber,
        amount: data.amount,
        convenienceFee: data.convenienceFee || 0,
        totalDebited: data.totalDebited || data.amount + (data.convenienceFee || 0),
        referenceNumber: ref,
        status: 'INITIATED',
      },
    });
  }

  async findAll(shopId: string, type?: string, status?: string, page = 1, limit = 20) {
    const where: any = { shopId };
    if (type) where.type = type;
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.recharge.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.recharge.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const rc = await this.prisma.recharge.findUnique({ where: { id } });
    if (!rc) throw new NotFoundException('Recharge not found');
    return rc;
  }

  async updateStatus(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.recharge.update({
      where: { id },
      data: {
        status: data.status,
        failureReason: data.failureReason,
        providerReference: data.providerReference,
        paidAt: data.status === 'SUCCESS' ? new Date() : undefined,
      },
    });
  }
}
