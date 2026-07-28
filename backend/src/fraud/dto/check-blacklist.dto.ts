import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckBlacklistDto {
  @ApiProperty()
  @IsString()
  entityType: string;

  @ApiProperty()
  @IsString()
  entityValue: string;
}
