import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_RESOURCES = [
  'products', 'customers', 'inventory', 'sales',
  'repairs', 'reports', 'settings', 'staff',
];

const DEFAULT_ACTIONS = ['create', 'read', 'update', 'delete', 'manage'];

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }

  async create(dto: { resource: string; action: string; description?: string }) {
    const existing = await this.prisma.permission.findUnique({
      where: { resource_action: { resource: dto.resource, action: dto.action } },
    });
    if (existing) throw new ConflictException('Permission already exists');

    return this.prisma.permission.create({ data: dto });
  }

  async delete(id: string) {
    const permission = await this.prisma.permission.findUnique({ where: { id } });
    if (!permission) throw new NotFoundException('Permission not found');

    await this.prisma.permission.delete({ where: { id } });
    return { message: 'Permission deleted successfully' };
  }

  async seedDefault() {
    const created: any[] = [];

    for (const resource of DEFAULT_RESOURCES) {
      for (const action of DEFAULT_ACTIONS) {
        const existing = await this.prisma.permission.findUnique({
          where: { resource_action: { resource, action } },
        });

        if (!existing) {
          const perm = await this.prisma.permission.create({
            data: {
              resource,
              action,
              description: `Can ${action} ${resource}`,
            },
          });
          created.push(perm);
        }
      }
    }

    return {
      message: `Seeded ${created.length} new permissions`,
      total: DEFAULT_RESOURCES.length * DEFAULT_ACTIONS.length,
      created: created.length,
    };
  }
}
