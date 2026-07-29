import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto, PlanType } from './dto/create-subscription.dto';
import { RenewSubscriptionDto, DurationType } from './dto/renew-subscription.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      include: { subscriptionPlan: true, tenant: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscription) {
      throw new NotFoundException('No active subscription found for this tenant');
    }
    return subscription;
  }

  async create(dto: CreateSubscriptionDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const existing = await this.prisma.subscription.findFirst({
      where: { tenantId: dto.tenantId, status: 'ACTIVE' },
    });
    if (existing) {
      throw new BadRequestException('Tenant already has an active subscription');
    }

    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { code: dto.plan },
    });

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const trialDays = plan?.trialDays ?? 14;
    const endDate = dto.endDate
      ? new Date(dto.endDate)
      : new Date(startDate.getTime() + trialDays * 24 * 60 * 60 * 1000);

    const subscription = await this.prisma.subscription.create({
      data: {
        tenantId: dto.tenantId,
        plan: dto.plan,
        subscriptionPlanId: plan?.id ?? null,
        status: 'ACTIVE',
        startDate,
        endDate,
        autoRenew: dto.autoRenew ?? false,
        maxUsers: plan?.maxUsers ?? 5,
        maxShops: plan?.maxShops ?? 1,
        maxProducts: plan?.maxProducts ?? 500,
        monthlyPrice: plan?.monthlyPrice ?? 0,
        yearlyPrice: plan?.yearlyPrice ?? 0,
      },
    });

    await this.prisma.subscriptionHistory.create({
      data: {
        subscriptionId: subscription.id,
        action: 'CREATED',
        newPlan: dto.plan,
        newEndDate: endDate,
        amount: 0,
      },
    });

    return subscription;
  }

  async renew(tenantId: string, dto: RenewSubscriptionDto) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscription) {
      throw new NotFoundException('No active subscription found to renew');
    }

    const oldPlan = subscription.plan;
    const newPlan = dto.plan ?? oldPlan;
    const today = new Date();
    const oldEndDate = subscription.endDate;

    const durationMonths = dto.duration === DurationType.YEARLY ? 12 : 1;
    const newEndDate = new Date(
      Math.max(today.getTime(), oldEndDate?.getTime() ?? today.getTime()) +
        durationMonths * 30 * 24 * 60 * 60 * 1000,
    );

    const plan = await this.prisma.subscriptionPlan.findFirst({ where: { code: newPlan } });

    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        plan: newPlan,
        subscriptionPlanId: plan?.id ?? subscription.subscriptionPlanId,
        startDate: today,
        endDate: newEndDate,
        status: 'ACTIVE',
        maxUsers: plan?.maxUsers ?? subscription.maxUsers,
        maxShops: plan?.maxShops ?? subscription.maxShops,
        maxProducts: plan?.maxProducts ?? subscription.maxProducts,
        monthlyPrice: plan?.monthlyPrice ?? subscription.monthlyPrice,
        yearlyPrice: plan?.yearlyPrice ?? subscription.yearlyPrice,
      },
    });

    const amount = dto.duration === DurationType.YEARLY ? plan?.yearlyPrice ?? 0 : plan?.monthlyPrice ?? 0;

    await this.prisma.subscriptionHistory.create({
      data: {
        subscriptionId: subscription.id,
        action: oldPlan !== newPlan ? 'UPGRADED' : 'RENEWED',
        oldPlan,
        newPlan,
        oldEndDate,
        newEndDate,
        amount,
      },
    });

    return updated;
  }

  async getHistory(tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscription) {
      throw new NotFoundException('No subscription found for this tenant');
    }
    return this.prisma.subscriptionHistory.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancel(tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId, status: 'ACTIVE' },
    });
    if (!subscription) {
      throw new NotFoundException('No active subscription found to cancel');
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'CANCELLED', endDate: new Date() },
    });

    await this.prisma.subscriptionHistory.create({
      data: {
        subscriptionId: subscription.id,
        action: 'CANCELLED',
        oldPlan: subscription.plan,
        newEndDate: new Date(),
        amount: 0,
      },
    });

    return updated;
  }

  async getPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPrice: 'asc' },
    });
  }

  async createPlan(dto: CreatePlanDto) {
    const existing = await this.prisma.subscriptionPlan.findFirst({
      where: { OR: [{ name: dto.name }, { code: dto.code }] },
    });
    if (existing) {
      throw new BadRequestException('Plan with this name or code already exists');
    }
    return this.prisma.subscriptionPlan.create({ data: dto });
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }
    return this.prisma.subscriptionPlan.update({ where: { id }, data: dto });
  }

  async deletePlan(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }
    await this.prisma.subscriptionPlan.update({ where: { id }, data: { isActive: false } });
    return { message: 'Plan deactivated successfully' };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkExpiry() {
    this.logger.log('Running subscription expiry check...');

    const expired = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { lte: new Date() },
      },
    });

    for (const sub of expired) {
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      });

      await this.prisma.subscriptionHistory.create({
        data: {
          subscriptionId: sub.id,
          action: 'EXPIRED',
          oldPlan: sub.plan,
          oldEndDate: sub.endDate,
          amount: 0,
          notes: 'Auto-expired by system',
        },
      });
    }

    this.logger.log(`Expired ${expired.length} subscription(s)`);
  }
}
