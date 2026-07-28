import { Module } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyController, CouponsController } from './loyalty.controller';

@Module({
  controllers: [LoyaltyController, CouponsController],
  providers: [LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
