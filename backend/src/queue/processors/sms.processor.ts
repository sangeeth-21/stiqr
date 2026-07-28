import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor('sms')
export class SmsProcessor {
  private readonly logger = new Logger(SmsProcessor.name);

  @Process('send-sms')
  async handleSendSms(job: Job<{ to: string; message: string }>) {
    this.logger.log(`Sending SMS to ${job.data.to}`);
    await job.progress(100);
    return { success: true };
  }
}
