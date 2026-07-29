import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class ShopSettingsDto {
  @IsOptional()
  @IsString()
  timezone?: string

  @IsOptional()
  @IsString()
  currency?: string

  @IsOptional()
  @IsString()
  dateFormat?: string

  @IsOptional()
  @IsString()
  language?: string

  @IsOptional()
  @IsString()
  theme?: string
}
