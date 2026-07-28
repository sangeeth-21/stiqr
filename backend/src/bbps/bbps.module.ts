import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BbpsService } from './bbps.service';
import { BbpsController } from './bbps.controller';

@Module({
  imports: [PrismaModule],
  controllers: [BbpsController],
  providers: [BbpsService],
  exports: [BbpsService],
})
export class BbpsModule {}
