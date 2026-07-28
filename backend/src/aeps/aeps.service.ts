import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AepsService {
  constructor(private prisma: PrismaService) {}

  async createTransaction(data: any) {
    const ref = `AEPS-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    return this.prisma.aEPSTransaction.create({
      data: {
        shopId: data.shopId,
        aadhaarNumber: data.aadhaarNumber,
        biometricType: data.biometricType,
        transactionType: data.transactionType,
        amount: data.amount,
        bankIin: data.bankIin,
        referenceNumber: ref,
        status: 'INITIATED',
      },
    });
  }

  async findAll(shopId: string, status?: string, page = 1, limit = 20) {
    const where: any = { shopId };
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.aEPSTransaction.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.aEPSTransaction.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const tx = await this.prisma.aEPSTransaction.findUnique({ where: { id } });
    if (!tx) throw new NotFoundException('AEPS transaction not found');
    return tx;
  }

  async updateStatus(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.aEPSTransaction.update({
      where: { id },
      data: { status: data.status, failureReason: data.failureReason, providerReference: data.providerReference },
    });
  }
}
