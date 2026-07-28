import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAepsTransactionDto {
  @ApiProperty() @IsString() shopId: string;
  @ApiProperty() @IsString() aadhaarNumber: string;
  @ApiProperty() @IsString() biometricType: string;
  @ApiProperty() @IsString() transactionType: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() amount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() bankIin?: string;
}
