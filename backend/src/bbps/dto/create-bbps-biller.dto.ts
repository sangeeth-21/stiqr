import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBbpsBillerDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() category: string;
  @ApiProperty() @IsString() providerCode: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string;
}

export class CreateBbpsPaymentDto {
  @ApiProperty() @IsString() shopId: string;
  @ApiProperty() @IsString() billerId: string;
  @ApiProperty() @IsString() consumerNumber: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerName?: string;
  @ApiProperty() @IsNumber() billAmount: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() convenienceFee?: number;
  @ApiProperty() @IsNumber() totalAmount: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMode?: string;
}
