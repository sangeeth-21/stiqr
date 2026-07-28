import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TaxService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.taxRule.create({
      data: {
        shopId: data.shopId,
        name: data.name,
        rate: data.rate,
        type: data.type,
        hsnCode: data.hsnCode,
        isActive: data.isActive ?? true,
      },
    });
  }

  async findAll(shopId: string) {
    return this.prisma.taxRule.findMany({
      where: { shopId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const rule = await this.prisma.taxRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Tax rule not found');
    return rule;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.taxRule.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.taxRule.delete({ where: { id } });
  }

  async calculate(shopId: string, amount: number, ruleId?: string) {
    let rules;
    if (ruleId) {
      const rule = await this.findOne(ruleId);
      rules = [rule];
    } else {
      rules = await this.prisma.taxRule.findMany({
        where: { shopId, isActive: true },
      });
    }

    let totalTax = 0;
    const breakdown = rules.map((rule) => {
      const tax = rule.type === 'percentage' ? (amount * rule.rate) / 100 : rule.rate;
      totalTax += tax;
      return { ruleId: rule.id, name: rule.name, rate: rule.rate, type: rule.type, tax };
    });

    return { amount, totalTax, grandTotal: amount + totalTax, breakdown };
  }
}
