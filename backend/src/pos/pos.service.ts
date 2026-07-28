import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PosService {
  constructor(private prisma: PrismaService) {}

  async openSession(data: any) {
    const activeSession = await this.prisma.posSession.findFirst({
      where: { shopId: data.shopId, cashierId: data.cashierId, status: 'open' },
    });
    if (activeSession) throw new BadRequestException('Cashier already has an open session');

    return this.prisma.posSession.create({
      data: {
        shopId: data.shopId,
        branchId: data.branchId,
        cashierId: data.cashierId,
        openingBalance: data.openingBalance,
        status: 'open',
      },
    });
  }

  async findAll(shopId: string, query?: { status?: string; branchId?: string; cashierId?: string }) {
    const where: any = { shopId };
    if (query?.status) where.status = query.status;
    if (query?.branchId) where.branchId = query.branchId;
    if (query?.cashierId) where.cashierId = query.cashierId;

    return this.prisma.posSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const session = await this.prisma.posSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('POS session not found');
    return session;
  }

  async closeSession(id: string, data: { closingBalance: number }) {
    const session = await this.prisma.posSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('POS session not found');
    if (session.status === 'closed') throw new BadRequestException('Session is already closed');

    const totalSales = session.totalSales || 0;
    const totalReturns = session.totalReturns || 0;

    return this.prisma.posSession.update({
      where: { id },
      data: {
        closingBalance: data.closingBalance,
        totalSales,
        totalReturns,
        status: 'closed',
        endedAt: new Date(),
      },
    });
  }

  async processSale(data: any) {
    const session = await this.prisma.posSession.findUnique({ where: { id: data.sessionId } });
    if (!session || session.status !== 'open') throw new BadRequestException('Invalid or closed POS session');

    const invoiceCount = await this.prisma.sale.count({ where: { shopId: data.shopId } });
    const invoiceNumber = `POS-${(invoiceCount + 1).toString().padStart(6, '0')}`;

    const sale = await this.prisma.sale.create({
      data: {
        shopId: data.shopId,
        branchId: data.branchId,
        customerId: data.customerId,
        invoiceNumber,
        date: new Date(),
        subtotal: data.subtotal,
        taxAmount: data.taxAmount || 0,
        discount: data.discount || 0,
        total: data.total,
        paidAmount: data.paidAmount,
        dueAmount: data.total - data.paidAmount,
        paymentMethod: data.paymentMethod,
        status: 'completed',
        notes: data.notes,
        createdBy: data.cashierId,
        items: {
          create: data.items.map((item: any) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            total: item.total,
          })),
        },
      },
      include: { items: true },
    });

    await this.prisma.posSession.update({
      where: { id: data.sessionId },
      data: {
        totalSales: { increment: data.total },
      },
    });

    return sale;
  }

  async getSessionSummary(id: string) {
    const session = await this.prisma.posSession.findUnique({
      where: { id },
    });
    if (!session) throw new NotFoundException('POS session not found');

    return {
      sessionId: id,
      openingBalance: session.openingBalance,
      closingBalance: session.closingBalance,
      totalSales: session.totalSales || 0,
      totalReturns: session.totalReturns || 0,
      netSales: (session.totalSales || 0) - (session.totalReturns || 0),
      status: session.status,
    };
  }
}
