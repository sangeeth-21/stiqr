import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  @Process('send-email')
  async handleSendEmail(job: Job<{ to: string; subject: string; body: string }>) {
    this.logger.log(`Sending email to ${job.data.to}`);
    await job.progress(100);
    return { success: true, messageId: `email-${Date.now()}` };
  }
}
