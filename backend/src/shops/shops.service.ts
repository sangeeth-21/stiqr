import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShopsService {
  constructor(private prisma: PrismaService) {}

  async create(data: { name: string; description?: string; address?: string; phone?: string; email?: string }) {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await this.prisma.shop.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('Shop with this name already exists');

    return this.prisma.shop.create({ data: { ...data, slug } });
  }

  async findAll() {
    return this.prisma.shop.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const shop = await this.prisma.shop.findFirst({ where: { id, deletedAt: null } });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  async update(id: string, data: Partial<{ name: string; description: string; address: string; phone: string; email: string }>) {
    await this.findOne(id);
    return this.prisma.shop.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.shop.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }
}
