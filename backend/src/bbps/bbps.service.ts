import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BbpsService {
  constructor(private prisma: PrismaService) {}

  async createBiller(data: any) {
    return this.prisma.bBPSBiller.create({
      data: {
        name: data.name,
        category: data.category,
        providerCode: data.providerCode,
        description: data.description,
        logoUrl: data.logoUrl,
      },
    });
  }

  async findAllBillers(category?: string, isActive?: boolean) {
    const where: any = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive;
    return this.prisma.bBPSBiller.findMany({ where, orderBy: { name: 'asc' } });
  }

  async findOneBiller(id: string) {
    const biller = await this.prisma.bBPSBiller.findUnique({ where: { id } });
    if (!biller) throw new NotFoundException('Bill payment biller not found');
    return biller;
  }

  async createPayment(data: any) {
    return this.prisma.bBPSBillPayment.create({
      data: {
        shopId: data.shopId,
        billerId: data.billerId,
        consumerNumber: data.consumerNumber,
        customerName: data.customerName,
        billAmount: data.billAmount,
        convenienceFee: data.convenienceFee || 0,
        totalAmount: data.totalAmount,
        paymentMode: data.paymentMode,
        status: 'BILL_FETCHED',
      },
    });
  }

  async findAllPayments(shopId: string, status?: string) {
    const where: any = { shopId };
    if (status) where.status = status;
    return this.prisma.bBPSBillPayment.findMany({
      where, orderBy: { createdAt: 'desc' }, include: { biller: true },
    });
  }

  async findOnePayment(id: string) {
    const payment = await this.prisma.bBPSBillPayment.findUnique({ where: { id }, include: { biller: true } });
    if (!payment) throw new NotFoundException('BBPS payment not found');
    return payment;
  }

  async updatePaymentStatus(id: string, data: any) {
    await this.findOnePayment(id);
    return this.prisma.bBPSBillPayment.update({
      where: { id },
      data: {
        status: data.status,
        receiptNumber: data.receiptNumber,
        providerReference: data.providerReference,
        paidAt: data.status === 'PAYMENT_SUCCESS' ? new Date() : undefined,
      },
    });
  }
}
