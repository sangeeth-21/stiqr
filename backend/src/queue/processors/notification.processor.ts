import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor('notification')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  @Process('send-notification')
  async handleNotification(job: Job<{ userId: string; title: string; body: string; type: string }>) {
    this.logger.log(`Sending notification to ${job.data.userId}`);
    await job.progress(100);
    return { success: true };
  }
}
