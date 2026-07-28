import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  private async generateInvoiceNumber(shopId: string): Promise<string> {
    const count = await this.prisma.invoice.count({ where: { shopId } });
    const num = (count + 1).toString().padStart(6, '0');
    return `INV-${num}`;
  }

  async create(data: any) {
    const invoiceNumber = data.invoiceNumber || await this.generateInvoiceNumber(data.shopId);

    return this.prisma.invoice.create({
      data: {
        shopId: data.shopId,
        entityType: data.entityType,
        entityId: data.entityId,
        invoiceNumber,
        date: new Date(data.date),
        dueDate: new Date(data.dueDate),
        subtotal: data.subtotal,
        taxAmount: data.taxAmount || 0,
        discount: data.discount || 0,
        total: data.total,
        paidAmount: data.paidAmount || 0,
        status: data.status || 'draft',
        notes: data.notes,
      },
    });
  }

  async findAll(shopId: string, query?: { status?: string; entityType?: string; entityId?: string }) {
    const where: any = { shopId };
    if (query?.status) where.status = query.status;
    if (query?.entityType) where.entityType = query.entityType;
    if (query?.entityId) where.entityId = query.entityId;

    return this.prisma.invoice.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.invoice.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });
  }
}
