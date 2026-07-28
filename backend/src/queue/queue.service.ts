import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('sms') private smsQueue: Queue,
    @InjectQueue('notification') private notificationQueue: Queue,
    @InjectQueue('invoice') private invoiceQueue: Queue,
    @InjectQueue('report') private reportQueue: Queue,
    @InjectQueue('backup') private backupQueue: Queue,
  ) {}

  async addEmailJob(data: { to: string; subject: string; body: string }) {
    return this.emailQueue.add('send-email', data, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
  }

  async addSmsJob(data: { to: string; message: string }) {
    return this.smsQueue.add('send-sms', data, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
  }

  async addNotificationJob(data: { userId: string; title: string; body: string; type: string }) {
    return this.notificationQueue.add('send-notification', data, { attempts: 3 });
  }

  async addInvoiceJob(data: { orderId: string; userId: string }) {
    return this.invoiceQueue.add('generate-invoice', data, { attempts: 2 });
  }

  async addReportJob(data: { type: string; params: any; userId: string }) {
    return this.reportQueue.add('generate-report', data, { attempts: 2 });
  }

  async addBackupJob(data: { type: string }) {
    return this.backupQueue.add('backup', data, { attempts: 1 });
  }

  async getQueueStats() {
    const queues = [this.emailQueue, this.smsQueue, this.notificationQueue, this.invoiceQueue, this.reportQueue, this.backupQueue];
    const stats: any = {};
    for (const queue of queues) {
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaitingCount(), queue.getActiveCount(), queue.getCompletedCount(), queue.getFailedCount(),
      ]);
      stats[queue.name] = { waiting, active, completed, failed };
    }
    return stats;
  }
}
