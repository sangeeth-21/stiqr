import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LoggingService {
  constructor(private prisma: PrismaService) {}

  async logApiCall(data: {
    method: string;
    path: string;
    statusCode: number;
    responseTime: number;
    ipAddress?: string;
    userAgent?: string;
    userId?: string;
    requestBody?: any;
  }) {
    return this.prisma.apiLog.create({ data });
  }

  async getApiLogs(query: { path?: string; userId?: string; statusCode?: number; page?: number; limit?: number }) {
    const { path, userId, statusCode, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (path) where.path = { contains: path };
    if (userId) where.userId = userId;
    if (statusCode) where.statusCode = statusCode;

    const [data, total] = await Promise.all([
      this.prisma.apiLog.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.apiLog.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async cleanupOldLogs(days = 30) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await this.prisma.apiLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
    return { deleted: result.count };
  }
}
