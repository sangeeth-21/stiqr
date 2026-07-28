import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto, QueryCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        shopId: dto.shopId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        groupId: dto.groupId,
        walletBalance: dto.walletBalance ?? 0,
        loyaltyPoints: dto.loyaltyPoints ?? 0,
        creditLimit: dto.creditLimit ?? 0,
        outstandingBalance: dto.outstandingBalance ?? 0,
        notes: dto.notes,
        kycVerified: dto.kycVerified ?? false,
      },
    });
  }

  async findAll(query: QueryCustomerDto) {
    const { shopId, search, groupId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (shopId) where.shopId = shopId;
    if (groupId) where.groupId = groupId;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.customer.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id, deletedAt: null } });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);
    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.groupId !== undefined) updateData.groupId = dto.groupId;
    if (dto.walletBalance !== undefined) updateData.walletBalance = dto.walletBalance;
    if (dto.loyaltyPoints !== undefined) updateData.loyaltyPoints = dto.loyaltyPoints;
    if (dto.creditLimit !== undefined) updateData.creditLimit = dto.creditLimit;
    if (dto.outstandingBalance !== undefined) updateData.outstandingBalance = dto.outstandingBalance;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.kycVerified !== undefined) updateData.kycVerified = dto.kycVerified;
    return this.prisma.customer.update({ where: { id }, data: updateData });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
