import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    const invoiceNumber = data.invoiceNumber || await this.generateInvoiceNumber(data.shopId);

    const purchase = await this.prisma.purchase.create({
      data: {
        shopId: data.shopId,
        supplierId: data.supplierId,
        warehouseId: data.warehouseId,
        invoiceNumber,
        date: data.date,
        subtotal: data.subtotal,
        taxAmount: data.taxAmount || 0,
        discount: data.discount || 0,
        total: data.total,
        paidAmount: data.paidAmount || 0,
        status: data.status || 'PENDING',
        paymentStatus: data.paymentStatus || 'UNPAID',
        notes: data.notes || null,
        createdBy: data.createdBy || null,
      },
      include: { supplier: true },
    });

    if (data.items && data.items.length > 0) {
      await this.prisma.purchaseItem.createMany({
        data: data.items.map((item: any) => ({
          purchaseId: purchase.id,
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate || 0,
          total: item.total,
          batch: item.batch || null,
          expiryDate: item.expiryDate || null,
        })),
      });

      if (data.status === 'RECEIVED') {
        await this.updateStockForItems(purchase.id, data.warehouseId, data.items);
      }
    }

    return this.findOne(purchase.id);
  }

  async findAll(query: any) {
    const { search, supplierId, warehouseId, status, paymentStatus, shopId, page = 1, limit = 20 } = query;
    const where: any = {};

    if (shopId) where.shopId = shopId;
    if (supplierId) where.supplierId = supplierId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { supplier: true, items: true },
      }),
      this.prisma.purchase.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id },
      include: {
        supplier: true,
        items: { include: { product: true, variant: true } },
      },
    });
    if (!purchase) throw new NotFoundException('Purchase not found');
    return purchase;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.purchase.update({
      where: { id },
      data,
      include: { supplier: true, items: true },
    });
  }

  async addItems(purchaseId: string, items: any[]) {
    const purchase = await this.findOne(purchaseId);

    await this.prisma.purchaseItem.createMany({
      data: items.map((item) => ({
        purchaseId,
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate || 0,
        total: item.total,
        batch: item.batch || null,
        expiryDate: item.expiryDate || null,
      })),
    });

    const newSubtotal = purchase.subtotal + items.reduce((sum, item) => sum + item.total, 0);
    await this.prisma.purchase.update({
      where: { id: purchaseId },
      data: { subtotal: newSubtotal, total: newSubtotal + purchase.taxAmount - purchase.discount },
    });

    return this.findOne(purchaseId);
  }

  private async updateStockForItems(purchaseId: string, warehouseId: string, items: any[]) {
    for (const item of items) {
      const inventory = await this.prisma.stock.findFirst({
        where: {
          productId: item.productId,
          warehouseId,
          ...(item.variantId ? { variantId: item.variantId } : {}),
        },
      });

      if (inventory) {
        await this.prisma.stock.update({
          where: { id: inventory.id },
          data: { quantity: inventory.quantity + item.quantity },
        });
      } else {
        await this.prisma.stock.create({
          data: {
            productId: item.productId,
            warehouseId,
            variantId: item.variantId || null,
            quantity: item.quantity,
            batch: item.batch || null,
          },
        });
      }

      await this.prisma.stockMovement.create({
        data: {
          productId: item.productId,
          warehouseId,
          variantId: item.variantId || null,
          quantity: item.quantity,
          type: 'PURCHASE',
          notes: `Purchase ${purchaseId}`,
        },
      });
    }
  }

  private async generateInvoiceNumber(shopId: string): Promise<string> {
    const count = await this.prisma.purchase.count({ where: { shopId } });
    const year = new Date().getFullYear();
    return `PO-${year}-${String(count + 1).padStart(5, '0')}`;
  }
}
