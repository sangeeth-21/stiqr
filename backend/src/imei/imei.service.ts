import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ImeiService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    const existing = await this.prisma.imeiRecord.findFirst({
      where: { imei: data.imei },
    });
    if (existing) throw new ConflictException('IMEI already exists');

    return this.prisma.imeiRecord.create({
      data: { ...data, status: data.status || 'AVAILABLE' },
      include: { product: true, variant: true },
    });
  }

  async findAll(query?: any) {
    const where: any = {};
    if (query?.productId) where.productId = query.productId;
    if (query?.status) where.status = query.status;
    if (query?.search) {
      where.OR = [
        { imei: { contains: query.search } },
        { serialNumber: { contains: query.search } },
      ];
    }

    const { page = 1, limit = 20, ...rest } = query || {};
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.imeiRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { product: true, variant: true },
      }),
      this.prisma.imeiRecord.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const record = await this.prisma.imeiRecord.findFirst({
      where: { id },
      include: { product: true, variant: true },
    });
    if (!record) throw new NotFoundException('IMEI record not found');
    return record;
  }

  async searchByImei(imei: string) {
    const record = await this.prisma.imeiRecord.findFirst({
      where: { imei },
      include: { product: true, variant: true },
    });
    if (!record) throw new NotFoundException('IMEI not found');
    return record;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    if (data.status === 'SOLD' && !data.soldAt) {
      data.soldAt = new Date().toISOString();
    }
    return this.prisma.imeiRecord.update({
      where: { id },
      data,
      include: { product: true, variant: true },
    });
  }
}
