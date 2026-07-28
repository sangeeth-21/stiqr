import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApproveRefundDto {
  @ApiProperty()
  @IsString()
  approvedBy: string;
}
