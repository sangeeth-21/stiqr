import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DmtService } from './dmt.service';
import { DmtController } from './dmt.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DmtController],
  providers: [DmtService],
  exports: [DmtService],
})
export class DmtModule {}
