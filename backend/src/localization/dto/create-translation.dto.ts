import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTranslationDto {
  @ApiProperty({ example: 'en' })
  @IsString()
  @IsNotEmpty()
  language: string;

  @ApiProperty({ example: 'common.save' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ example: 'Save' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({ example: 'common' })
  @IsOptional()
  @IsString()
  namespace?: string;
}
