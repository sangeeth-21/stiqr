import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePerformanceMetricDto {
  @ApiProperty({ example: 'response_time' })
  @IsString()
  @IsNotEmpty()
  metricType: string;

  @ApiProperty({ example: 'api.average_response' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 245.5 })
  @IsNumber()
  value: number;

  @ApiPropertyOptional({ example: 'ms' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: 'nginx' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metadata?: string;
}
