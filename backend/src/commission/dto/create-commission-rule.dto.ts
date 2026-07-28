import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommissionRuleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  shopId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  serviceType: string;

  @ApiProperty({ enum: ['PERCENTAGE', 'FIXED', 'SLAB'] })
  @IsString()
  @IsIn(['PERCENTAGE', 'FIXED', 'SLAB'])
  calculationType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  rate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minCommission?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxCommission?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  targetRole: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  validFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  validTo?: string;
}
