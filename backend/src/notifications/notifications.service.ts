import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, type: string, title: string, body: string, data?: any) {
    return this.prisma.notification.create({
      data: { userId, type, title, body, data: data ? JSON.stringify(data) : null, sentAt: new Date() },
    });
  }

  async findAllByUser(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    return { message: 'All notifications marked as read' };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({ where: { userId, isRead: false } });
    return { count };
  }

  async remove(id: string) {
    return this.prisma.notification.delete({ where: { id } });
  }

  async createTemplate(name: string, type: string, subject: string, body: string, variables: string[]) {
    return this.prisma.notificationTemplate.create({ data: { name, type, subject, body, variables: JSON.stringify(variables) } });
  }

  async getTemplates() {
    return this.prisma.notificationTemplate.findMany({ where: { isActive: true } });
  }
}
