import { Module } from '@nestjs/common';
import { ImeiService } from './imei.service';
import { ImeiController } from './imei.controller';

@Module({
  controllers: [ImeiController],
  providers: [ImeiService],
  exports: [ImeiService],
})
export class ImeiModule {}
