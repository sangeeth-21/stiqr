import { IsString, IsEmail, IsOptional, IsEnum, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SHOP_OWNER', 'MANAGER', 'CASHIER', 'SALES_STAFF', 'DELIVERY_BOY', 'CUSTOMER'] })
  @IsOptional()
  @IsEnum(['SUPER_ADMIN', 'COMPANY_ADMIN', 'SHOP_OWNER', 'MANAGER', 'CASHIER', 'SALES_STAFF', 'DELIVERY_BOY', 'CUSTOMER'] as const)
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;
}

export class QueryUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;
}
