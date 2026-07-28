import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUnitDto, UpdateUnitDto, QueryUnitDto } from './dto/create-unit.dto';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUnitDto) {
    const existing = await this.prisma.unit.findFirst({ where: { name: dto.name, shopId: dto.shopId } });
    if (existing) throw new ConflictException('Unit with this name already exists in this shop');

    return this.prisma.unit.create({
      data: {
        shopId: dto.shopId,
        name: dto.name,
        symbol: dto.symbol,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(shopId: string, query: QueryUnitDto) {
    const { search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { shopId };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { symbol: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.unit.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.unit.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const unit = await this.prisma.unit.findFirst({ where: { id } });
    if (!unit) throw new NotFoundException('Unit not found');
    return unit;
  }

  async update(id: string, dto: UpdateUnitDto) {
    await this.findOne(id);
    return this.prisma.unit.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.unit.delete({ where: { id } });
  }
}
