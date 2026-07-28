import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BeneficiaryService } from './beneficiary.service';
import { BeneficiaryController } from './beneficiary.controller';

@Module({
  imports: [PrismaModule],
  controllers: [BeneficiaryController],
  providers: [BeneficiaryService],
  exports: [BeneficiaryService],
})
export class BeneficiaryModule {}
