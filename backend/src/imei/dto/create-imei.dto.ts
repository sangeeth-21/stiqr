import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateImeiDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ example: '353456789012345' })
  @IsString()
  imei: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({ example: 'AVAILABLE', enum: ['AVAILABLE', 'SOLD', 'RETURNED', 'DAMAGED', 'RESERVED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  warrantyExpiry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  soldAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  soldTo?: string;
}

export class UpdateImeiDto {
  @ApiPropertyOptional({ enum: ['AVAILABLE', 'SOLD', 'RETURNED', 'DAMAGED', 'RESERVED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  warrantyExpiry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  soldTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  soldAt?: string;
}
