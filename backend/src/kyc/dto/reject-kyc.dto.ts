import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectKycDto {
  @ApiProperty()
  @IsString()
  rejectionReason: string;

  @ApiProperty()
  @IsString()
  reviewedBy: string;
}
