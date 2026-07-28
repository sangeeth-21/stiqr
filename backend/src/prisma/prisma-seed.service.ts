import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PrismaSeedService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    if (process.env.NODE_ENV !== 'production' && process.env.SEED_DATABASE === 'true') {
      await this.seed();
    }
  }

  async seed() {
    await this.seedRoles();
    await this.seedPermissions();
    await this.seedSuperAdmin();
  }

  private async seedRoles() {
    const roles = [
      { name: 'SUPER_ADMIN', description: 'Full system access', isSystem: true },
      { name: 'COMPANY_ADMIN', description: 'Company level admin', isSystem: true },
      { name: 'SHOP_OWNER', description: 'Shop owner', isSystem: true },
      { name: 'MANAGER', description: 'Shop manager', isSystem: true },
      { name: 'CASHIER', description: 'Cashier operations', isSystem: true },
      { name: 'SALES_STAFF', description: 'Sales team member', isSystem: true },
      { name: 'DELIVERY_BOY', description: 'Delivery personnel', isSystem: true },
      { name: 'CUSTOMER', description: 'Regular customer', isSystem: true },
    ];

    for (const role of roles) {
      await this.prisma.role.upsert({
        where: { name: role.name },
        update: {},
        create: role,
      });
    }
  }

  private async seedPermissions() {
    const resources = ['users', 'roles', 'shops', 'products', 'orders', 'invoices', 'reports', 'settings'];
    const actions: any[] = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT'];

    for (const resource of resources) {
      for (const action of actions) {
        await this.prisma.permission.upsert({
          where: { resource_action: { resource, action } },
          update: {},
          create: { resource, action },
        });
      }
    }

    const superAdminRole = await this.prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
    const allPermissions = await this.prisma.permission.findMany();

    if (superAdminRole) {
      for (const perm of allPermissions) {
        await this.prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: perm.id } },
          update: {},
          create: { roleId: superAdminRole.id, permissionId: perm.id },
        });
      }
    }
  }

  private async seedSuperAdmin() {
    const password = await bcrypt.hash('SuperAdmin@123', 12);
    await this.prisma.user.upsert({
      where: { email: 'admin@stiqr.com' },
      update: {},
      create: {
        email: 'admin@stiqr.com',
        name: 'Super Admin',
        password,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
      },
    });
  }
}
