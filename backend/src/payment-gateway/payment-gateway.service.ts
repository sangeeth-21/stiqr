import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentGatewayService {
  constructor(private prisma: PrismaService) {}

  async initiate(data: any) {
    return this.prisma.paymentGatewayTransaction.create({
      data: {
        shopId: data.shopId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        provider: data.provider,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        description: data.description,
      },
    });
  }

  async findAll(query: { shopId?: string; provider?: string; status?: string }) {
    const where: any = {};
    if (query.shopId) where.shopId = query.shopId;
    if (query.provider) where.provider = query.provider;
    if (query.status) where.status = query.status;

    return this.prisma.paymentGatewayTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const transaction = await this.prisma.paymentGatewayTransaction.findUnique({
      where: { id },
      include: { webhooks: true },
    });
    if (!transaction) throw new NotFoundException('Payment transaction not found');
    return transaction;
  }

  async verify(id: string) {
    const transaction = await this.findOne(id);
    if (transaction.status === 'CAPTURED') {
      throw new BadRequestException('Payment is already captured');
    }
    return this.prisma.paymentGatewayTransaction.update({
      where: { id },
      data: {
        status: 'CAPTURED',
        capturedAt: new Date(),
      },
    });
  }

  async refund(id: string) {
    const transaction = await this.findOne(id);
    if (transaction.status !== 'CAPTURED') {
      throw new BadRequestException('Only captured payments can be refunded');
    }
    return this.prisma.paymentGatewayTransaction.update({
      where: { id },
      data: {
        status: 'REFUNDED',
        refundAmount: transaction.amount,
      },
    });
  }

  async handleWebhook(data: any) {
    const webhook = await this.prisma.paymentWebhook.create({
      data: {
        provider: data.provider,
        eventType: data.eventType,
        payload: data.payload,
        signature: data.signature,
      },
    });
    return webhook;
  }
}
