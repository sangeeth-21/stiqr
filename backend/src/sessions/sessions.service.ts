import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  async findAllByUser(userId: string) {
    return this.prisma.session.findMany({
      where: { userId, isActive: true },
      select: { id: true, ipAddress: true, userAgent: true, deviceInfo: true, location: true, lastActivity: true, createdAt: true },
      orderBy: { lastActivity: 'desc' },
    });
  }

  async remove(sessionId: string, userId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new ForbiddenException('Not your session');

    return this.prisma.session.update({ where: { id: sessionId }, data: { isActive: false } });
  }

  async removeAllByUser(userId: string) {
    await this.prisma.session.updateMany({ where: { userId, isActive: true }, data: { isActive: false } });
    return { message: 'All sessions terminated' };
  }

  async removeByToken(token: string) {
    const session = await this.prisma.session.findFirst({ where: { token } });
    if (session) {
      await this.prisma.session.update({ where: { id: session.id }, data: { isActive: false } });
    }
  }

  async updateActivity(sessionId: string) {
    return this.prisma.session.update({ where: { id: sessionId }, data: { lastActivity: new Date() } });
  }

  async cleanupExpired() {
    const result = await this.prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    return { deleted: result.count };
  }
}
