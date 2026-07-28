import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommissionSlabDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ruleId: string;

  @ApiProperty()
  @IsNumber()
  minAmount: number;

  @ApiProperty()
  @IsNumber()
  maxAmount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  rate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  fixedAmount?: number;
}
