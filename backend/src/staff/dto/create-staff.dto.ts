import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsNumber, IsOptional, IsString, MinLength } from 'class-validator'

export class CreateStaffDto {
  @IsString()
  name: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsString()
  @MinLength(6)
  password: string

  @IsOptional()
  @IsString()
  role?: string

  @IsOptional()
  @IsString()
  designation?: string

  @IsOptional()
  @IsNumber()
  salary?: number

  @IsOptional()
  @IsString()
  branchId?: string
}
