import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRefundDto {
  @ApiProperty()
  @IsString()
  shopId: string;

  @ApiProperty()
  @IsString()
  originalTransactionId: string;

  @ApiProperty()
  @IsString()
  refundType: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
