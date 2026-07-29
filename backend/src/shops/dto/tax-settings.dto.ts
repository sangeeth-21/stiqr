import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator'

export class TaxSettingsDto {
  @IsOptional()
  @IsBoolean()
  gstEnabled?: boolean

  @IsOptional()
  @IsNumber()
  defaultTaxRate?: number

  @IsOptional()
  @IsString()
  taxType?: string
}
