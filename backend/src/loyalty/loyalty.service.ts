import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LoyaltyService {
  constructor(private prisma: PrismaService) {}

  async createProgram(data: any) {
    return this.prisma.loyaltyProgram.create({
      data: {
        shopId: data.shopId,
        name: data.name,
        pointsPerRupee: data.pointsPerRupee,
        minPurchase: data.minPurchase || 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  async getPrograms(shopId: string) {
    return this.prisma.loyaltyProgram.findMany({
      where: { shopId },
      orderBy: { name: 'asc' },
    });
  }

  async updateProgram(id: string, data: any) {
    const program = await this.prisma.loyaltyProgram.findUnique({ where: { id } });
    if (!program) throw new NotFoundException('Loyalty program not found');
    return this.prisma.loyaltyProgram.update({ where: { id }, data });
  }

  async earnPoints(data: { shopId: string; customerId: string; saleId: string; amount: number }) {
    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { shopId: data.shopId, isActive: true },
    });
    if (!program) throw new BadRequestException('No active loyalty program found');
    if (data.amount < program.minPurchase) {
      throw new BadRequestException(`Minimum purchase of ${program.minPurchase} required`);
    }

    const points = Math.floor(data.amount * program.pointsPerRupee);

    return this.prisma.loyaltyTransaction.create({
      data: {
        shopId: data.shopId,
        customerId: data.customerId,
        type: 'earn',
        points,
        reference: data.saleId,
        notes: `Earned ${points} points for purchase of ₹${data.amount}`,
      },
    });
  }

  async redeemPoints(data: { shopId: string; customerId: string; points: number; description?: string }) {
    const balance = await this.getCustomerBalance(data.shopId, data.customerId);
    if (balance < data.points) {
      throw new BadRequestException(`Insufficient points. Available: ${balance}`);
    }

    return this.prisma.loyaltyTransaction.create({
      data: {
        shopId: data.shopId,
        customerId: data.customerId,
        type: 'redeem',
        points: -Math.abs(data.points),
        notes: data.description || `Redeemed ${data.points} points`,
      },
    });
  }

  async getTransactions(shopId: string, customerId: string) {
    return this.prisma.loyaltyTransaction.findMany({
      where: { shopId, customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCustomerBalance(shopId: string, customerId: string): Promise<number> {
    const transactions = await this.prisma.loyaltyTransaction.findMany({
      where: { shopId, customerId },
    });
    return transactions.reduce((sum, t) => sum + t.points, 0);
  }

  async createCoupon(data: any) {
    return this.prisma.coupon.create({
      data: {
        shopId: data.shopId,
        code: data.code.toUpperCase(),
        type: data.type,
        value: data.value,
        minPurchase: data.minPurchase || 0,
        maxDiscount: data.maxDiscount,
        usageLimit: data.usageLimit,
        usedCount: 0,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isActive: data.isActive ?? true,
        productIds: data.productIds,
      },
    });
  }

  async getCoupons(shopId: string) {
    return this.prisma.coupon.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCoupon(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async updateCoupon(id: string, data: any) {
    await this.getCoupon(id);
    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...data,
        code: data.code?.toUpperCase(),
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  }

  async deleteCoupon(id: string) {
    await this.getCoupon(id);
    return this.prisma.coupon.delete({ where: { id } });
  }

  async validateCoupon(shopId: string, code: string, amount: number) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { shopId, code: code.toUpperCase(), isActive: true },
    });
    if (!coupon) throw new NotFoundException('Invalid coupon code');
    if (new Date() < coupon.startDate) throw new BadRequestException('Coupon not yet active');
    if (new Date() > coupon.endDate) throw new BadRequestException('Coupon has expired');
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }
    if (amount < coupon.minPurchase) {
      throw new BadRequestException(`Minimum purchase of ₹${coupon.minPurchase} required`);
    }

    let discount = coupon.type === 'percentage' ? (amount * coupon.value) / 100 : coupon.value;
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }

    return { couponId: coupon.id, code: coupon.code, type: coupon.type, value: coupon.value, discount, finalAmount: amount - discount };
  }
}
