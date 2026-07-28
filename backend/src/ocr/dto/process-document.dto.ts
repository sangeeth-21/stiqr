import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProcessDocumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ example: 'INVOICE' })
  @IsString()
  documentType: string;

  @ApiProperty({ example: 'https://example.com/document.pdf' })
  @IsString()
  originalUrl: string;

  @ApiPropertyOptional({ example: 'TESSERACT' })
  @IsOptional()
  @IsString()
  ocrEngine?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metadata?: string;
}
