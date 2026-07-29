import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingDto } from './dto/settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getGlobal() {
    const settings = await this.prisma.setting.findMany({
      where: { shopId: null },
    });
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    return map;
  }

  async update(key: string, value: string) {
    const existing = await this.prisma.setting.findFirst({
      where: { key, shopId: null },
    });

    if (existing) {
      return this.prisma.setting.update({
        where: { id: existing.id },
        data: { value },
      });
    }

    return this.prisma.setting.create({
      data: { key, value, shopId: null },
    });
  }

  async get(key: string) {
    const setting = await this.prisma.setting.findFirst({
      where: { key, shopId: null },
    });
    if (!setting) throw new NotFoundException(`Setting '${key}' not found`);
    return setting;
  }

  async getAll(group?: string) {
    const where: any = { shopId: null };
    if (group) where.group = group;

    return this.prisma.setting.findMany({ where, orderBy: { key: 'asc' } });
  }
}
