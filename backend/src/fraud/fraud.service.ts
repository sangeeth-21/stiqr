import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFraudRuleDto } from './dto/create-fraud-rule.dto';
import { UpdateFraudRuleDto } from './dto/update-fraud-rule.dto';
import { ResolveFraudAlertDto } from './dto/resolve-fraud-alert.dto';
import { CreateBlacklistDto } from './dto/create-blacklist.dto';
import { CheckBlacklistDto } from './dto/check-blacklist.dto';

@Injectable()
export class FraudService {
  constructor(private prisma: PrismaService) {}

  async createRule(dto: CreateFraudRuleDto) {
    return this.prisma.fraudRule.create({
      data: {
        name: dto.name,
        ruleType: dto.ruleType,
        config: dto.config,
        severity: dto.severity ?? 'MEDIUM',
        isActive: dto.isActive ?? true,
        action: dto.action ?? 'ALERT',
      },
    });
  }

  async listRules(query: { isActive?: string; ruleType?: string }) {
    const where: any = {};
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
    if (query.ruleType) where.ruleType = query.ruleType;
    return this.prisma.fraudRule.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async getRule(id: string) {
    const rule = await this.prisma.fraudRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Fraud rule not found');
    return rule;
  }

  async updateRule(id: string, dto: UpdateFraudRuleDto) {
    await this.getRule(id);
    return this.prisma.fraudRule.update({ where: { id }, data: dto });
  }

  async deleteRule(id: string) {
    await this.getRule(id);
    return this.prisma.fraudRule.delete({ where: { id } });
  }

  async listAlerts(query: { shopId?: string; status?: string; page?: string; limit?: string }) {
    const where: any = {};
    if (query.shopId) where.shopId = query.shopId;
    if (query.status) where.status = query.status;
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);
    const [data, total] = await Promise.all([
      this.prisma.fraudAlert.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.fraudAlert.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getAlert(id: string) {
    const alert = await this.prisma.fraudAlert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundException('Fraud alert not found');
    return alert;
  }

  async resolveAlert(id: string, dto: ResolveFraudAlertDto) {
    await this.getAlert(id);
    return this.prisma.fraudAlert.update({
      where: { id },
      data: {
        resolution: dto.resolution,
        status: dto.status ?? 'RESOLVED',
        resolvedAt: new Date(),
      },
    });
  }

  async addBlacklist(dto: CreateBlacklistDto) {
    return this.prisma.blacklist.create({
      data: {
        entityType: dto.entityType,
        entityValue: dto.entityValue,
        reason: dto.reason,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        addedBy: dto.addedBy,
      },
    });
  }

  async listBlacklist(query: { entityType?: string; isActive?: string }) {
    const where: any = {};
    if (query.entityType) where.entityType = query.entityType;
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
    return this.prisma.blacklist.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async removeBlacklist(id: string) {
    const entry = await this.prisma.blacklist.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Blacklist entry not found');
    return this.prisma.blacklist.delete({ where: { id } });
  }

  async checkBlacklist(dto: CheckBlacklistDto) {
    const entry = await this.prisma.blacklist.findFirst({
      where: {
        entityType: dto.entityType,
        entityValue: dto.entityValue,
        isActive: true,
      },
    });
    return {
      isBlacklisted: !!entry,
      entry: entry ?? null,
    };
  }
}
