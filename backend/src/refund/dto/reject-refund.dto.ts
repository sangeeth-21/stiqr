import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectRefundDto {
  @ApiProperty()
  @IsString()
  reason: string;
}
