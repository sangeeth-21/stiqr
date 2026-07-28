import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const { warehouseId, search, page = 1, limit = 20 } = query;
    const where: any = {};

    if (warehouseId) where.warehouseId = warehouseId;
    if (search) {
      where.OR = [
        { product: { name: { contains: search } } },
        { product: { sku: { contains: search } } },
        { batch: { contains: search } },
      ];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.stock.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: { product: true, variant: true, warehouse: true },
      }),
      this.prisma.stock.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(productId: string) {
    const items = await this.prisma.stock.findMany({
      where: { productId },
      include: { variant: true, warehouse: true },
      orderBy: { updatedAt: 'desc' },
    });
    if (!items.length) throw new NotFoundException('Inventory record not found');
    return items;
  }

  async getLowStock() {
    const items = await this.prisma.stock.findMany({
      where: {
        product: { deletedAt: null },
      },
      include: { product: true, variant: true, warehouse: true },
    });

    return items.filter((item) => {
      const minStock = item.product.minStock || 0;
      return item.quantity <= minStock && minStock > 0;
    });
  }

  async adjustStock(data: any) {
    const inventory = await this.prisma.stock.findFirst({
      where: {
        productId: data.productId,
        warehouseId: data.warehouseId,
        ...(data.variantId ? { variantId: data.variantId } : {}),
      },
    });

    if (inventory) {
      const newQuantity = inventory.quantity + data.quantity;
      await this.prisma.stock.update({
        where: { id: inventory.id },
        data: { quantity: newQuantity < 0 ? 0 : newQuantity },
      });
    } else {
      await this.prisma.stock.create({
        data: {
          productId: data.productId,
          warehouseId: data.warehouseId,
          variantId: data.variantId || null,
          quantity: data.quantity < 0 ? 0 : data.quantity,
          batch: data.batch || null,
        },
      });
    }

    await this.prisma.stockMovement.create({
      data: {
        productId: data.productId,
        warehouseId: data.warehouseId,
        variantId: data.variantId || null,
        quantity: data.quantity,
        type: data.reason || data.type,
        notes: data.notes || null,
      },
    });

    return this.prisma.stock.findMany({
      where: { productId: data.productId },
      include: { warehouse: true },
    });
  }

  async transfer(data: any) {
    const sourceInventory = await this.prisma.stock.findFirst({
      where: {
        productId: data.productId,
        warehouseId: data.fromWarehouseId,
        ...(data.variantId ? { variantId: data.variantId } : {}),
      },
    });

    if (!sourceInventory || sourceInventory.quantity < data.quantity) {
      throw new NotFoundException('Insufficient stock in source warehouse');
    }

    await this.prisma.stock.update({
      where: { id: sourceInventory.id },
      data: { quantity: sourceInventory.quantity - data.quantity },
    });

    const destInventory = await this.prisma.stock.findFirst({
      where: {
        productId: data.productId,
        warehouseId: data.toWarehouseId,
        ...(data.variantId ? { variantId: data.variantId } : {}),
      },
    });

    if (destInventory) {
      await this.prisma.stock.update({
        where: { id: destInventory.id },
        data: { quantity: destInventory.quantity + data.quantity },
      });
    } else {
      await this.prisma.stock.create({
        data: {
          productId: data.productId,
          warehouseId: data.toWarehouseId,
          variantId: data.variantId || null,
          quantity: data.quantity,
        },
      });
    }

    await this.prisma.stockMovement.create({
      data: {
        productId: data.productId,
        warehouseId: data.fromWarehouseId,
        variantId: data.variantId || null,
        quantity: -data.quantity,
        type: 'TRANSFER_OUT',
        notes: data.notes || `Transfer to warehouse ${data.toWarehouseId}`,
      },
    });

    await this.prisma.stockMovement.create({
      data: {
        productId: data.productId,
        warehouseId: data.toWarehouseId,
        variantId: data.variantId || null,
        quantity: data.quantity,
        type: 'TRANSFER_IN',
        notes: data.notes || `Transfer from warehouse ${data.fromWarehouseId}`,
      },
    });

    return { message: 'Transfer completed successfully' };
  }
}
