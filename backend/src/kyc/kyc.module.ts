import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';

@Module({
  imports: [PrismaModule],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}
