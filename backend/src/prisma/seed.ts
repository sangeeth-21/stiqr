import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('SuperAdmin@123', 12);

  const superAdmin = await prisma.user.upsert({
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

  console.log('Seeded super admin:', superAdmin.email);

  const defaultRoles = [
    { name: 'SUPER_ADMIN', description: 'Full system access', isSystem: true },
    { name: 'COMPANY_ADMIN', description: 'Company level admin', isSystem: true },
    { name: 'SHOP_OWNER', description: 'Shop owner', isSystem: true },
    { name: 'MANAGER', description: 'Shop manager', isSystem: true },
    { name: 'CASHIER', description: 'Cashier operations', isSystem: true },
    { name: 'SALES_STAFF', description: 'Sales team member', isSystem: true },
    { name: 'DELIVERY_BOY', description: 'Delivery personnel', isSystem: true },
    { name: 'CUSTOMER', description: 'Regular customer', isSystem: true },
  ];

  for (const role of defaultRoles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  console.log('Seeded default roles');

  const resources = ['users', 'roles', 'shops', 'products', 'orders', 'invoices', 'reports', 'settings'];
  const actions = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT'];

  for (const resource of resources) {
    for (const action of actions) {
      await prisma.permission.upsert({
        where: { resource_action: { resource, action: action as any } },
        update: {},
        create: { resource, action: action as any },
      });
    }
  }

  console.log('Seeded permissions');

  const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  const allPermissions = await prisma.permission.findMany();

  if (superAdminRole) {
    for (const perm of allPermissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: superAdminRole.id, permissionId: perm.id },
      });
    }
  }

  console.log('Assigned all permissions to SUPER_ADMIN');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
