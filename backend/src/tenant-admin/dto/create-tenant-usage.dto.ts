import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantUsageDto {
  @ApiProperty({ example: 'tenant-123' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ example: '2026-01' })
  @IsString()
  @IsNotEmpty()
  period: string;

  @ApiPropertyOptional({ example: 15000 })
  @IsOptional()
  @IsNumber()
  apiCalls?: number;

  @ApiPropertyOptional({ example: 1048576 })
  @IsOptional()
  @IsNumber()
  storageBytes?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsNumber()
  activeUsers?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  transactions?: number;

  @ApiPropertyOptional({ example: 12500.5 })
  @IsOptional()
  @IsNumber()
  revenue?: number;
}
