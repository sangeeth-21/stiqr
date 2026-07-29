import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsObject, IsOptional, IsString } from 'class-validator'

export class DayHours {
  @IsString()
  open: string

  @IsString()
  close: string
}

export class BusinessHoursDto {
  @IsOptional()
  @IsObject()
  monday?: DayHours

  @IsOptional()
  @IsObject()
  tuesday?: DayHours

  @IsOptional()
  @IsObject()
  wednesday?: DayHours

  @IsOptional()
  @IsObject()
  thursday?: DayHours

  @IsOptional()
  @IsObject()
  friday?: DayHours

  @IsOptional()
  @IsObject()
  saturday?: DayHours

  @IsOptional()
  @IsObject()
  sunday?: DayHours
}
