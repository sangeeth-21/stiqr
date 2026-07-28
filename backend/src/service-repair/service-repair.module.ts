import { Module } from '@nestjs/common';
import { ServiceRepairService } from './service-repair.service';
import { ServiceRepairController } from './service-repair.controller';

@Module({
  controllers: [ServiceRepairController],
  providers: [ServiceRepairService],
  exports: [ServiceRepairService],
})
export class ServiceRepairModule {}
