import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor('backup')
export class BackupProcessor {
  private readonly logger = new Logger(BackupProcessor.name);

  @Process('backup')
  async handleBackup(job: Job<{ type: string }>) {
    this.logger.log(`Running ${job.data.type} backup`);
    await job.progress(100);
    return { success: true, backupAt: new Date() };
  }
}
