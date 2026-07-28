import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto, QuerySubscriptionDto } from './dto/create-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSubscriptionDto) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: dto.tenantId, deletedAt: null } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.prisma.subscription.create({
      data: {
        tenantId: dto.tenantId,
        plan: dto.plan,
        status: dto.status ?? 'ACTIVE',
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        autoRenew: dto.autoRenew ?? true,
        maxUsers: dto.maxUsers,
        maxShops: dto.maxShops,
        maxProducts: dto.maxProducts,
        monthlyPrice: dto.monthlyPrice,
        yearlyPrice: dto.yearlyPrice,
      },
    });
  }

  async findAll(query: QuerySubscriptionDto) {
    const { tenantId, plan, status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (plan) where.plan = plan;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.subscription.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const subscription = await this.prisma.subscription.findFirst({ where: { id } });
    if (!subscription) throw new NotFoundException('Subscription not found');
    return subscription;
  }

  async update(id: string, dto: UpdateSubscriptionDto) {
    await this.findOne(id);
    const updateData: any = {};
    if (dto.plan !== undefined) updateData.plan = dto.plan;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.startDate !== undefined) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) updateData.endDate = new Date(dto.endDate);
    if (dto.autoRenew !== undefined) updateData.autoRenew = dto.autoRenew;
    if (dto.maxUsers !== undefined) updateData.maxUsers = dto.maxUsers;
    if (dto.maxShops !== undefined) updateData.maxShops = dto.maxShops;
    if (dto.maxProducts !== undefined) updateData.maxProducts = dto.maxProducts;
    if (dto.monthlyPrice !== undefined) updateData.monthlyPrice = dto.monthlyPrice;
    if (dto.yearlyPrice !== undefined) updateData.yearlyPrice = dto.yearlyPrice;
    return this.prisma.subscription.update({ where: { id }, data: updateData });
  }
}
