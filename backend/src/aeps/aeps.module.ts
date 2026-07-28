import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AepsService } from './aeps.service';
import { AepsController } from './aeps.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AepsController],
  providers: [AepsService],
  exports: [AepsService],
})
export class AepsModule {}
