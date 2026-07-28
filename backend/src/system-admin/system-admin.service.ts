import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemAdminService {
  constructor(private prisma: PrismaService) {}

  async createFlag(dto: any) {
    return this.prisma.featureFlag.create({ data: { key: dto.key, name: dto.name, description: dto.description, isEnabled: dto.isEnabled ?? false, valueType: dto.valueType, defaultValue: dto.defaultValue, allowedRoles: dto.allowedRoles, percentage: dto.percentage } });
  }

  async listFlags() { return this.prisma.featureFlag.findMany({ orderBy: { createdAt: 'desc' } }); }

  async getFlag(id: string) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { id } });
    if (!flag) throw new NotFoundException('Feature flag not found');
    return flag;
  }

  async updateFlag(id: string, dto: any) {
    await this.getFlag(id);
    return this.prisma.featureFlag.update({ where: { id }, data: dto });
  }

  async deleteFlag(id: string) {
    await this.getFlag(id);
    return this.prisma.featureFlag.delete({ where: { id } });
  }

  async checkFlag(key: string) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    return { enabled: flag?.isEnabled ?? false, value: flag?.defaultValue ?? null };
  }

  async createAnnouncement(dto: any) {
    return this.prisma.systemAnnouncement.create({ data: { title: dto.title, message: dto.message, type: dto.type || 'INFO', severity: dto.severity || 'LOW', isActive: dto.isActive ?? true, createdBy: dto.createdBy } });
  }

  async listAnnouncements(query: { type?: string; isActive?: string }) {
    const where: any = {};
    if (query.type) where.type = query.type;
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
    return this.prisma.systemAnnouncement.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async getAnnouncement(id: string) {
    const a = await this.prisma.systemAnnouncement.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Announcement not found');
    return a;
  }

  async updateAnnouncement(id: string, dto: any) {
    await this.getAnnouncement(id);
    return this.prisma.systemAnnouncement.update({ where: { id }, data: dto });
  }

  async deleteAnnouncement(id: string) {
    await this.getAnnouncement(id);
    return this.prisma.systemAnnouncement.delete({ where: { id } });
  }

  async getSystemInfo() {
    return {
      version: '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      pid: process.pid,
      timestamp: new Date().toISOString(),
    };
  }
}
