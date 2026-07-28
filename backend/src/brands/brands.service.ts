import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto, UpdateBrandDto, QueryBrandDto } from './dto/create-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  private generateSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  async create(dto: CreateBrandDto) {
    const slug = dto.slug || this.generateSlug(dto.name);
    const existing = await this.prisma.brand.findFirst({ where: { slug, shopId: dto.shopId } });
    if (existing) throw new ConflictException('Brand with this name already exists in this shop');

    return this.prisma.brand.create({
      data: {
        shopId: dto.shopId,
        name: dto.name,
        slug,
        logo: dto.logo,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(shopId: string, query: QueryBrandDto) {
    const { search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { shopId };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.brand.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.brand.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findFirst({ where: { id } });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async update(id: string, dto: UpdateBrandDto) {
    await this.findOne(id);

    const data: any = { ...dto };
    if (dto.name && !dto.slug) {
      data.slug = this.generateSlug(dto.name);
    }

    return this.prisma.brand.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.brand.delete({ where: { id } });
  }
}
