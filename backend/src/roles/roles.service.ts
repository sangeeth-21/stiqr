import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Role with this name already exists');

    const { permissionIds, ...roleData } = dto;

    return this.prisma.role.create({
      data: {
        ...roleData,
        permissions: permissionIds?.length
          ? {
              create: permissionIds.map((permissionId) => ({ permissionId })),
            }
          : undefined,
      },
      include: {
        permissions: { include: { permission: true } },
      },
    });
  }

  async findAll() {
    return this.prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
      },
    });

    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async update(id: string, dto: UpdateRoleDto) {
    await this.findById(id);

    if (dto.name) {
      const existing = await this.prisma.role.findFirst({ where: { name: dto.name, id: { not: id } } });
      if (existing) throw new ConflictException('Role name already in use');
    }

    const { permissionIds, ...roleData } = dto;

    if (permissionIds) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      if (permissionIds.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        });
      }
    }

    return this.prisma.role.update({
      where: { id },
      data: roleData,
      include: {
        permissions: { include: { permission: true } },
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.role.delete({ where: { id } });
    return { message: 'Role deleted successfully' };
  }

  async getPermissions(id: string) {
    const role = await this.findById(id);
    return role.permissions.map((rp) => rp.permission);
  }

  async assignPermissions(id: string, permissionIds: string[]) {
    await this.findById(id);

    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });

    if (permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
      });
    }

    return this.findById(id);
  }
}
