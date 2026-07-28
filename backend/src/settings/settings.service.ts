import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  private buildWhere(shopId?: string) {
    return { key: undefined as any, shopId: shopId || null };
  }

  async get(key: string, shopId?: string) {
    const setting = await this.prisma.setting.findFirst({ where: { key, shopId: shopId || null } });
    if (!setting) throw new NotFoundException(`Setting '${key}' not found`);
    return setting;
  }

  async getAll(shopId?: string) {
    return this.prisma.setting.findMany({ where: { shopId: shopId || null }, orderBy: { group: 'asc' } });
  }

  async set(key: string, value: string, shopId?: string, type = 'string', group = 'general') {
    const existing = await this.prisma.setting.findFirst({ where: { key, shopId: shopId || null } });
    if (existing) {
      return this.prisma.setting.update({ where: { id: existing.id }, data: { value, type, group } });
    }
    return this.prisma.setting.create({ data: { key, value, type, group, shopId: shopId || null } });
  }

  async setMultiple(settings: Array<{ key: string; value: string; type?: string; group?: string }>, shopId?: string) {
    const results = [];
    for (const s of settings) {
      const result = await this.set(s.key, s.value, shopId, s.type, s.group);
      results.push(result);
    }
    return results;
  }

  async remove(key: string, shopId?: string) {
    const existing = await this.prisma.setting.findFirst({ where: { key, shopId: shopId || null } });
    if (!existing) throw new NotFoundException(`Setting '${key}' not found`);
    return this.prisma.setting.delete({ where: { id: existing.id } });
  }
}
