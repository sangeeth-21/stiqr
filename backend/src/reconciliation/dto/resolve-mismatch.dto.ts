import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResolveMismatchDto {
  @ApiProperty()
  @IsString()
  logId: string;

  @ApiProperty()
  @IsString()
  resolution: string;

  @ApiProperty()
  @IsString()
  resolvedBy: string;
}
