import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WarrantyService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.warranty.create({
      data: {
        shopId: data.shopId,
        productId: data.productId,
        customerId: data.customerId,
        saleId: data.saleId,
        imei: data.imei,
        type: data.type,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        terms: data.terms,
        status: data.status || 'active',
      },
      include: { product: true, customer: true },
    });
  }

  async findAll(shopId: string, query?: { status?: string; productId?: string; customerId?: string }) {
    const where: any = { shopId };
    if (query?.status) where.status = query.status;
    if (query?.productId) where.productId = query.productId;
    if (query?.customerId) where.customerId = query.customerId;

    return this.prisma.warranty.findMany({
      where,
      include: { product: true, customer: true },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const warranty = await this.prisma.warranty.findUnique({
      where: { id },
      include: { product: true, customer: true },
    });
    if (!warranty) throw new NotFoundException('Warranty not found');
    return warranty;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.warranty.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  }

  async validateByImei(shopId: string, imei: string) {
    const warranties = await this.prisma.warranty.findMany({
      where: { shopId, imei, status: 'active' },
      include: { product: true },
    });

    if (warranties.length === 0) {
      throw new NotFoundException('No active warranty found for this IMEI');
    }

    const now = new Date();
    const results = warranties.map((w) => {
      const isExpired = now > w.endDate;
      return {
        ...w,
        isExpired,
        daysRemaining: isExpired ? 0 : Math.ceil((w.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      };
    });

    return { imei, warranties: results, hasActiveWarranty: results.some((r) => !r.isExpired) };
  }
}
