import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIntegrationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiProperty({ example: 'Stripe Integration' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'PAYMENT' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: 'stripe' })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  config?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  credentials?: string;

  @ApiPropertyOptional({ example: 'https://example.com/webhook' })
  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
