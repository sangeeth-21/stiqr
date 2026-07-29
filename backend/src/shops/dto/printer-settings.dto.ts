import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsNumber, IsOptional, IsString } from 'class-validator'

export class PrinterSettingsDto {
  @IsOptional()
  @IsString()
  printerType?: string

  @IsOptional()
  @IsString()
  paperSize?: string

  @IsOptional()
  @IsNumber()
  copies?: number
}
