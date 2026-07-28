import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BarcodesService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    const existing = await this.prisma.barcode.findFirst({
      where: { code: data.code },
    });
    if (existing) throw new ConflictException('Barcode already exists');

    return this.prisma.barcode.create({ data });
  }

  async findAll(query?: any) {
    const where: any = {};
    if (query?.productId) where.productId = query.productId;
    if (query?.type) where.type = query.type;
    if (query?.isActive !== undefined) where.isActive = query.isActive;

    return this.prisma.barcode.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { product: true, variant: true },
    });
  }

  async findOne(id: string) {
    const barcode = await this.prisma.barcode.findFirst({
      where: { id },
      include: { product: true, variant: true },
    });
    if (!barcode) throw new NotFoundException('Barcode not found');
    return barcode;
  }

  async searchByCode(code: string) {
    const barcode = await this.prisma.barcode.findFirst({
      where: { code },
      include: { product: true, variant: true },
    });
    if (!barcode) throw new NotFoundException('Barcode not found');
    return barcode;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.barcode.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
