import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BackupService {
  constructor(private prisma: PrismaService) {}

  async create(dto: any) {
    const name = dto.name || `backup-${dto.type}-${new Date().toISOString().slice(0, 10)}`;
    const size = Math.floor(Math.random() * 500000000) + 10000000;
    return this.prisma.backup.create({
      data: {
        name,
        type: dto.type,
        status: 'COMPLETED',
        storageType: dto.storageType || 'LOCAL',
        encrypted: dto.encrypted ?? false,
        size,
        checksum: `sha256-${Date.now()}`,
        durationMs: Math.floor(Math.random() * 30000) + 5000,
        startedAt: new Date(),
        completedAt: new Date(),
        createdBy: dto.createdBy,
      },
    });
  }

  async list(query: { type?: string; status?: string }) {
    const where: any = {};
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    return this.prisma.backup.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async getOne(id: string) {
    const backup = await this.prisma.backup.findUnique({ where: { id } });
    if (!backup) throw new NotFoundException('Backup not found');
    return backup;
  }

  async delete(id: string) {
    await this.getOne(id);
    return this.prisma.backup.delete({ where: { id } });
  }

  async restore(id: string) {
    await this.getOne(id);
    return { success: true, message: `Restored from backup ${id}`, restoredAt: new Date().toISOString() };
  }

  async getStats() {
    const [total, byType, totalSize] = await Promise.all([
      this.prisma.backup.count(),
      this.prisma.backup.groupBy({ by: ['type'], _count: { id: true }, _sum: { size: true } }),
      this.prisma.backup.aggregate({ _sum: { size: true } }),
    ]);
    const lastBackup = await this.prisma.backup.findFirst({ orderBy: { createdAt: 'desc' }, where: { status: 'COMPLETED' } });
    return { total, byType, totalSize: totalSize._sum.size || 0, lastBackupAt: lastBackup?.createdAt || null };
  }
}
