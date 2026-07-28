import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WarehousesService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    const existing = await this.prisma.warehouse.findFirst({
      where: { name: data.name, shopId: data.shopId },
    });
    if (existing) throw new ConflictException('Warehouse with this name already exists');

    return this.prisma.warehouse.create({ data });
  }

  async findAll(query?: any) {
    const where: any = {};
    if (query?.shopId) where.shopId = query.shopId;
    if (query?.isActive !== undefined) where.isActive = query.isActive;

    return this.prisma.warehouse.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    return warehouse;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.warehouse.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.warehouse.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
