import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RechargeService } from './recharge.service';
import { RechargeController } from './recharge.controller';

@Module({
  imports: [PrismaModule],
  controllers: [RechargeController],
  providers: [RechargeService],
  exports: [RechargeService],
})
export class RechargeModule {}
