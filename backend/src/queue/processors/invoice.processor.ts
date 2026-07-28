import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor('invoice')
export class InvoiceProcessor {
  private readonly logger = new Logger(InvoiceProcessor.name);

  @Process('generate-invoice')
  async handleGenerateInvoice(job: Job<{ orderId: string; userId: string }>) {
    this.logger.log(`Generating invoice for order ${job.data.orderId}`);
    await job.progress(100);
    return { success: true, invoiceUrl: `/invoices/${job.data.orderId}.pdf` };
  }
}
