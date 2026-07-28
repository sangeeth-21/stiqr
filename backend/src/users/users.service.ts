import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, QueryUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, ...(dto.phone ? [{ phone: dto.phone }] : [])] },
    });
    if (existing) throw new ConflictException('User already exists');

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        phone: dto.phone,
        role: (dto.role as any) || 'CUSTOMER',
        shopId: dto.shopId,
        status: 'ACTIVE',
        emailVerified: true,
      },
      select: { id: true, email: true, name: true, phone: true, role: true, status: true, shopId: true, createdAt: true },
    });
  }

  async findAll(query: QueryUserDto) {
    const { search, role, status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }
    if (role) where.role = role;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: { id: true, email: true, name: true, phone: true, role: true, status: true, avatar: true, shopId: true, lastLoginAt: true, createdAt: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, email: true, name: true, phone: true, role: true, status: true, avatar: true, shopId: true, lastLoginAt: true, createdAt: true, updatedAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.avatar !== undefined) updateData.avatar = dto.avatar;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.shopId !== undefined) updateData.shopId = dto.shopId;
    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, name: true, phone: true, role: true, status: true, avatar: true, shopId: true, updatedAt: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
      select: { id: true, email: true, deletedAt: true },
    });
  }

  async changeStatus(id: string, status: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { status: status as any },
      select: { id: true, email: true, status: true },
    });
  }

  async updateProfile(id: string, data: { name?: string; phone?: string; avatar?: string }) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, phone: true, avatar: true },
    });
  }
}
