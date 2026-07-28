import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController, DashboardController } from './reports.controller';

@Module({
  controllers: [ReportsController, DashboardController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
