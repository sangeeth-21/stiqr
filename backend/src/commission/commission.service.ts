import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommissionService {
  constructor(private prisma: PrismaService) {}

  async createRule(dto: any) {
    return this.prisma.commissionRule.create({
      data: {
        shopId: dto.shopId,
        name: dto.name,
        serviceType: dto.serviceType,
        calculationType: dto.calculationType,
        rate: dto.rate || 0,
        minAmount: dto.minAmount || 0,
        maxAmount: dto.maxAmount || 999999999,
        minCommission: dto.minCommission || 0,
        maxCommission: dto.maxCommission || 999999,
        targetRole: dto.targetRole,
        isActive: dto.isActive ?? true,
        priority: dto.priority || 0,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validTo: dto.validTo ? new Date(dto.validTo) : null,
      },
    });
  }

  async findRules(query: { shopId: string; serviceType?: string }) {
    const where: any = { shopId: query.shopId };
    if (query.serviceType) where.serviceType = query.serviceType;
    return this.prisma.commissionRule.findMany({ where, include: { slabs: true }, orderBy: { priority: 'desc' } });
  }

  async findRule(id: string) {
    const rule = await this.prisma.commissionRule.findUnique({ where: { id }, include: { slabs: true } });
    if (!rule) throw new NotFoundException('Commission rule not found');
    return rule;
  }

  async updateRule(id: string, dto: any) {
    await this.findRule(id);
    return this.prisma.commissionRule.update({
      where: { id },
      data: {
        ...dto,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validTo: dto.validTo ? new Date(dto.validTo) : undefined,
      },
    });
  }

  async addSlab(dto: { ruleId: string; minAmount: number; maxAmount: number; rate?: number; fixedAmount?: number }) {
    await this.findRule(dto.ruleId);
    return this.prisma.commissionSlab.create({
      data: {
        ruleId: dto.ruleId,
        minAmount: dto.minAmount,
        maxAmount: dto.maxAmount,
        rate: dto.rate || 0,
        fixedAmount: dto.fixedAmount || 0,
      },
    });
  }

  async findSlabs(ruleId: string) {
    return this.prisma.commissionSlab.findMany({ where: { ruleId }, orderBy: { minAmount: 'asc' } });
  }

  async getLedger(query: { shopId: string; status?: string; page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: any = { shopId: query.shopId };
    if (query.status) where.status = query.status;
    const [data, total] = await Promise.all([
      this.prisma.commissionLedger.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.commissionLedger.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async calculate(query: { shopId: string; serviceType: string; amount: number }) {
    const rules = await this.prisma.commissionRule.findMany({
      where: { shopId: query.shopId, serviceType: query.serviceType, isActive: true },
      include: { slabs: true },
      orderBy: { priority: 'desc' },
    });

    if (rules.length === 0) throw new BadRequestException('No active commission rule found');

    const rule = rules[0];
    let commission = 0;

    if (query.amount < rule.minAmount || query.amount > rule.maxAmount) {
      throw new BadRequestException('Amount is outside the commission rule range');
    }

    if (rule.calculationType === 'PERCENTAGE') {
      commission = (query.amount * rule.rate) / 100;
    } else if (rule.calculationType === 'FIXED') {
      commission = rule.rate;
    } else if (rule.calculationType === 'SLAB') {
      const slab = rule.slabs.find((s) => query.amount >= s.minAmount && query.amount <= s.maxAmount);
      if (!slab) throw new BadRequestException('No matching slab found for the amount');
      commission = slab.fixedAmount > 0 ? slab.fixedAmount : (query.amount * slab.rate) / 100;
    }

    commission = Math.max(rule.minCommission, Math.min(commission, rule.maxCommission));

    return { ruleId: rule.id, ruleName: rule.name, amount: query.amount, commission, calculationType: rule.calculationType };
  }
}
