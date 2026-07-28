import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBarcodeDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ example: '1234567890128' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'EAN13', enum: ['EAN13', 'EAN8', 'UPC', 'CODE128', 'CODE39', 'QR', 'ITF'] })
  @IsString()
  type: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
