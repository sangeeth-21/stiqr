import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PluginsService {
  constructor(private prisma: PrismaService) {}

  async install(dto: any) {
    return this.prisma.plugin.create({
      data: {
        name: dto.name, displayName: dto.displayName, description: dto.description, version: dto.version,
        author: dto.author, category: dto.category, config: dto.config, permissions: dto.permissions,
        status: 'INSTALLED',
      },
    });
  }

  async list(query: { status?: string; category?: string }) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;
    return this.prisma.plugin.findMany({ where, orderBy: { installedAt: 'desc' } });
  }

  async getOne(id: string) {
    const p = await this.prisma.plugin.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Plugin not found');
    return p;
  }

  async update(id: string, dto: any) {
    await this.getOne(id);
    return this.prisma.plugin.update({ where: { id }, data: dto });
  }

  async uninstall(id: string) {
    await this.getOne(id);
    return this.prisma.plugin.delete({ where: { id } });
  }

  async enable(id: string) {
    await this.getOne(id);
    return this.prisma.plugin.update({ where: { id }, data: { status: 'ENABLED' } });
  }

  async disable(id: string) {
    await this.getOne(id);
    return this.prisma.plugin.update({ where: { id }, data: { status: 'DISABLED' } });
  }

  async marketplace() {
    return [
      { name: 'razorpay-payments', displayName: 'Razorpay Payments', category: 'PAYMENT', description: 'Accept payments via Razorpay', version: '2.1.0', author: 'StiQR', installed: false },
      { name: 'whatsapp-business', displayName: 'WhatsApp Business', category: 'COMMUNICATION', description: 'Send invoices via WhatsApp', version: '1.5.0', author: 'StiQR', installed: false },
      { name: 'tally-integration', displayName: 'Tally Integration', category: 'ACCOUNTING', description: 'Sync with Tally ERP', version: '1.2.0', author: 'StiQR', installed: false },
      { name: 'advanced-analytics', displayName: 'Advanced Analytics', category: 'ANALYTICS', description: 'ML-powered business insights', version: '3.0.0', author: 'StiQR', installed: false },
      { name: 'multi-currency', displayName: 'Multi-Currency', category: 'OTHER', description: 'Accept payments in multiple currencies', version: '1.0.0', author: 'StiQR', installed: false },
    ];
  }
}
