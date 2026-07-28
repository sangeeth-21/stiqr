import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyKycDto {
  @ApiProperty()
  @IsString()
  verifiedBy: string;
}
