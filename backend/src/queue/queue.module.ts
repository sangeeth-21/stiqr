import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueService } from './queue.service';
import { EmailProcessor } from './processors/email.processor';
import { SmsProcessor } from './processors/sms.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { InvoiceProcessor } from './processors/invoice.processor';
import { ReportProcessor } from './processors/report.processor';
import { BackupProcessor } from './processors/backup.processor';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'sms' },
      { name: 'notification' },
      { name: 'invoice' },
      { name: 'report' },
      { name: 'backup' },
    ),
  ],
  providers: [
    QueueService,
    EmailProcessor,
    SmsProcessor,
    NotificationProcessor,
    InvoiceProcessor,
    ReportProcessor,
    BackupProcessor,
  ],
  exports: [QueueService],
})
export class QueueModule {}
