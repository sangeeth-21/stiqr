import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProviderLogDto {
  @ApiProperty()
  @IsString()
  provider: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requestUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requestBody?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responseBody?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  statusCode?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latency?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  success?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  error?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactionId?: string;
}
