import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto, ReorderCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  private generateSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  async create(dto: CreateCategoryDto) {
    const slug = dto.slug || this.generateSlug(dto.name);

    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Parent category not found');
    }

    return this.prisma.category.create({
      data: {
        shopId: dto.shopId,
        name: dto.name,
        slug,
        parentId: dto.parentId,
        icon: dto.icon,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(shopId?: string) {
    const where: any = {};
    if (shopId) where.shopId = shopId;

    return this.prisma.category.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findTree(shopId?: string) {
    const where: any = { parentId: null };
    if (shopId) where.shopId = shopId;

    const roots = await this.prisma.category.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    const buildTree = async (parentId: string): Promise<any[]> => {
      const children = await this.prisma.category.findMany({
        where: { parentId },
        orderBy: { sortOrder: 'asc' },
      });

      return Promise.all(
        children.map(async (child) => ({
          ...child,
          children: await buildTree(child.id),
        })),
      );
    };

    return Promise.all(
      roots.map(async (root) => ({
        ...root,
        children: await buildTree(root.id),
      })),
    );
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findFirst({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);

    if (dto.parentId && dto.parentId === id) {
      throw new ConflictException('Category cannot be its own parent');
    }

    const data: any = { ...dto };
    if (dto.name && !dto.slug) {
      data.slug = this.generateSlug(dto.name);
    }

    return this.prisma.category.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.category.delete({ where: { id } });
  }

  async reorder(dto: ReorderCategoryDto) {
    const updates = dto.ids.map((id, index) =>
      this.prisma.category.update({ where: { id }, data: { sortOrder: index } }),
    );
    await this.prisma.$transaction(updates);
    return { success: true };
  }
}
