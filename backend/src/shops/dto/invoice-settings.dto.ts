import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class InvoiceSettingsDto {
  @IsOptional()
  @IsString()
  template?: string

  @IsOptional()
  @IsString()
  prefix?: string

  @IsOptional()
  @IsString()
  footer?: string

  @IsOptional()
  @IsBoolean()
  showLogo?: boolean

  @IsOptional()
  @IsBoolean()
  showTax?: boolean
}
