import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RefundService } from './refund.service';
import { RefundController } from './refund.controller';

@Module({
  imports: [PrismaModule],
  controllers: [RefundController],
  providers: [RefundService],
  exports: [RefundService],
})
export class RefundModule {}
