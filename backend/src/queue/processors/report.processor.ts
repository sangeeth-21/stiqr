import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor('report')
export class ReportProcessor {
  private readonly logger = new Logger(ReportProcessor.name);

  @Process('generate-report')
  async handleGenerateReport(job: Job<{ type: string; params: any; userId: string }>) {
    this.logger.log(`Generating ${job.data.type} report`);
    await job.progress(100);
    return { success: true, reportUrl: `/reports/${job.data.type}-${Date.now()}.pdf` };
  }
}
