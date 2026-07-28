import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SecurityCenterService {
  constructor(private prisma: PrismaService) {}

  async createAlert(dto: any) {
    return this.prisma.securityAlert.create({
      data: {
        shopId: dto.shopId, userId: dto.userId, alertType: dto.alertType, severity: dto.severity || 'MEDIUM',
        title: dto.title, description: dto.description, ipAddress: dto.ipAddress, userAgent: dto.userAgent, metadata: dto.metadata,
      },
    });
  }

  async listAlerts(query: { shopId?: string; alertType?: string; severity?: string; status?: string }) {
    const where: any = {};
    if (query.shopId) where.shopId = query.shopId;
    if (query.alertType) where.alertType = query.alertType;
    if (query.severity) where.severity = query.severity;
    if (query.status) where.status = query.status;
    return this.prisma.securityAlert.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async getAlert(id: string) {
    const a = await this.prisma.securityAlert.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Security alert not found');
    return a;
  }

  async updateAlert(id: string, dto: any) {
    await this.getAlert(id);
    const data: any = { ...dto };
    if (dto.status === 'RESOLVED') { data.resolvedAt = new Date(); }
    return this.prisma.securityAlert.update({ where: { id }, data });
  }

  async deleteAlert(id: string) {
    await this.getAlert(id);
    return this.prisma.securityAlert.delete({ where: { id } });
  }

  async blockIP(dto: any) {
    return this.prisma.blockedIP.create({
      data: {
        ipAddress: dto.ipAddress, reason: dto.reason, severity: dto.severity || 'MEDIUM',
        source: dto.source || 'MANUAL', expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        blockedBy: dto.blockedBy,
      },
    });
  }

  async listBlockedIPs(query: { isActive?: string }) {
    const where: any = {};
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
    return this.prisma.blockedIP.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async unblockIP(id: string) {
    const ip = await this.prisma.blockedIP.findUnique({ where: { id } });
    if (!ip) throw new NotFoundException('Blocked IP not found');
    return this.prisma.blockedIP.update({ where: { id }, data: { isActive: false } });
  }

  async getStats() {
    const [totalAlerts, openAlerts, criticalAlerts, activeBlockedIPs] = await Promise.all([
      this.prisma.securityAlert.count(),
      this.prisma.securityAlert.count({ where: { status: 'OPEN' } }),
      this.prisma.securityAlert.count({ where: { severity: 'CRITICAL' } }),
      this.prisma.blockedIP.count({ where: { isActive: true } }),
    ]);
    return { totalAlerts, openAlerts, criticalAlerts, activeBlockedIPs };
  }
}
