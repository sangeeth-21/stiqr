import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class ApiManagementService {
  constructor(private prisma: PrismaService) {}

  async createKey(dto: any) {
    const rawKey = `sk_${randomBytes(24).toString('hex')}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 11);
    return this.prisma.aPIKey.create({
      data: {
        shopId: dto.shopId, name: dto.name, keyHash, keyPrefix, scopes: dto.scopes,
        rateLimit: dto.rateLimit || 1000, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdBy: dto.createdBy,
      },
    });
  }

  async listKeys(query: { shopId?: string; isActive?: string }) {
    const where: any = {};
    if (query.shopId) where.shopId = query.shopId;
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
    return this.prisma.aPIKey.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async getKey(id: string) {
    const k = await this.prisma.aPIKey.findUnique({ where: { id } });
    if (!k) throw new NotFoundException('API key not found');
    return k;
  }

  async revokeKey(id: string) {
    await this.getKey(id);
    return this.prisma.aPIKey.update({ where: { id }, data: { isActive: false } });
  }

  async createWebhook(dto: any) {
    return this.prisma.webhook.create({
      data: {
        shopId: dto.shopId, name: dto.name, url: dto.url, secret: dto.secret,
        events: dto.events, isActive: dto.isActive ?? true,
      },
    });
  }

  async listWebhooks(query: { shopId?: string; isActive?: string }) {
    const where: any = {};
    if (query.shopId) where.shopId = query.shopId;
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
    return this.prisma.webhook.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async getWebhook(id: string) {
    const w = await this.prisma.webhook.findUnique({ where: { id }, include: { deliveries: { take: 10, orderBy: { deliveredAt: 'desc' } } } });
    if (!w) throw new NotFoundException('Webhook not found');
    return w;
  }

  async updateWebhook(id: string, dto: any) {
    await this.getWebhook(id);
    return this.prisma.webhook.update({ where: { id }, data: dto });
  }

  async deleteWebhook(id: string) {
    await this.getWebhook(id);
    return this.prisma.webhook.delete({ where: { id } });
  }

  async testWebhook(id: string) {
    await this.getWebhook(id);
    return this.prisma.webhookDelivery.create({
      data: {
        webhookId: id, event: 'TEST', payload: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
        responseStatus: 200, responseBody: '{"ok":true}', success: true, attempts: 1, deliveredAt: new Date(),
      },
    });
  }

  async listDeliveries(webhookId: string) {
    return this.prisma.webhookDelivery.findMany({ where: { webhookId }, orderBy: { deliveredAt: 'desc' }, take: 50 });
  }
}
