import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  private async generateInvoiceNumber(shopId: string): Promise<string> {
    const count = await this.prisma.sale.count({ where: { shopId } });
    const num = (count + 1).toString().padStart(6, '0');
    return `INV-${num}`;
  }

  async create(data: any) {
    const invoiceNumber = data.invoiceNumber || await this.generateInvoiceNumber(data.shopId);
    const { items, ...saleData } = data;

    return this.prisma.sale.create({
      data: {
        ...saleData,
        invoiceNumber,
        items: items ? {
          create: items.map((item: any) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            taxAmount: item.taxAmount || 0,
            total: item.total,
          })),
        } : undefined,
      },
      include: { items: true },
    });
  }

  async findAll(shopId: string, query?: { status?: string; customerId?: string; branchId?: string; from?: string; to?: string }) {
    const where: any = { shopId };
    if (query?.status) where.status = query.status;
    if (query?.customerId) where.customerId = query.customerId;
    if (query?.branchId) where.branchId = query.branchId;
    if (query?.from || query?.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    return this.prisma.sale.findMany({
      where,
      include: { items: true, customer: true },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: { items: true, customer: true },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    const { items, ...updateData } = data;
    return this.prisma.sale.update({
      where: { id },
      data: updateData,
      include: { items: true },
    });
  }

  async processReturn(id: string, returnData: { items: { saleItemId: string; quantity: number; reason: string }[] }) {
    const sale = await this.findOne(id);
    if (sale.status === 'cancelled') throw new BadRequestException('Cannot return a cancelled sale');

    await this.prisma.sale.update({
      where: { id },
      data: { status: 'returned' },
    });

    return { message: 'Return processed successfully', saleId: id };
  }
}
