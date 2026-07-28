import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePosSessionDto {
  @ApiProperty()
  @IsString()
  shopId: string;

  @ApiProperty()
  @IsString()
  branchId: string;

  @ApiProperty()
  @IsString()
  cashierId: string;

  @ApiProperty()
  @IsNumber()
  openingBalance: number;
}
