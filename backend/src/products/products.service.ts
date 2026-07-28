import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    const slug = data.slug || this.generateSlug(data.name);
    const existing = await this.prisma.product.findFirst({ where: { slug, deletedAt: null } });
    if (existing) throw new ConflictException('Product with this slug already exists');

    return this.prisma.product.create({
      data: { ...data, slug },
      include: { category: true, brand: true, unit: true, supplier: true },
    });
  }

  async findAll(query: any) {
    const { search, categoryId, brandId, supplierId, status, shopId, page = 1, limit = 20 } = query;
    const where: any = { deletedAt: null };

    if (shopId) where.shopId = shopId;
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } },
      ];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { category: true, brand: true, unit: true, supplier: true },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        brand: true,
        unit: true,
        supplier: true,
        variants: true,
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    if (data.name && !data.slug) {
      data.slug = this.generateSlug(data.name);
    }
    return this.prisma.product.update({
      where: { id },
      data,
      include: { category: true, brand: true, unit: true, supplier: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
  }

  async addVariant(productId: string, data: any) {
    await this.findOne(productId);
    return this.prisma.productVariant.create({
      data: { ...data, productId },
    });
  }

  async getVariants(productId: string) {
    await this.findOne(productId);
    return this.prisma.productVariant.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addImage(productId: string, data: any) {
    await this.findOne(productId);
    return this.prisma.productImage.create({
      data: { ...data, productId },
    });
  }

  async getImages(productId: string) {
    await this.findOne(productId);
    return this.prisma.productImage.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  private generateSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
}
