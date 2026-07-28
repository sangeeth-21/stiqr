import { Module } from '@nestjs/common';
import { ErrorTrackingService } from './error-tracking.service';
import { ErrorTrackingController } from './error-tracking.controller';

@Module({
  controllers: [ErrorTrackingController],
  providers: [ErrorTrackingService],
  exports: [ErrorTrackingService],
})
export class ErrorTrackingModule {}
