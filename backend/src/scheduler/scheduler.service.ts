import { Injectable, Logger } from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private prisma: PrismaService) {}

  @Cron('0 2 * * *')
  async handleDailyCleanup() {
    this.logger.log('Running daily cleanup');
    await this.cleanupExpiredSessions();
    await this.cleanupExpiredOtps();
  }

  @Cron('0 3 * * 0')
  async handleWeeklyCleanup() {
    this.logger.log('Running weekly cleanup');
    await this.cleanupOldApiLogs();
  }

  @Cron('0 0 1 * *')
  async handleMonthlyReport() {
    this.logger.log('Running monthly report generation');
  }

  @Interval(60000)
  async handleMinuteCheck() {
    await this.cleanupExpiredSessions();
  }

  private async cleanupExpiredSessions() {
    const result = await this.prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    if (result.count > 0) this.logger.log(`Cleaned up ${result.count} expired sessions`);
  }

  private async cleanupExpiredOtps() {
    const result = await this.prisma.otp.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    if (result.count > 0) this.logger.log(`Cleaned up ${result.count} expired OTPs`);
  }

  private async cleanupOldApiLogs() {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.apiLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
    if (result.count > 0) this.logger.log(`Cleaned up ${result.count} old API logs`);
  }
}
