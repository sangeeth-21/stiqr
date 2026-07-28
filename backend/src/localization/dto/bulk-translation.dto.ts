import { IsString, IsNotEmpty, IsOptional, IsArray, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkTranslationDto {
  @ApiProperty({ example: 'en' })
  @IsString()
  @IsNotEmpty()
  language: string;

  @ApiPropertyOptional({ example: 'common' })
  @IsOptional()
  @IsString()
  namespace?: string;

  @ApiProperty({ example: [{ key: 'common.save', value: 'Save' }, { key: 'common.cancel', value: 'Cancel' }] })
  @IsArray()
  translations: { key: string; value: string }[];
}
