import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSettlementDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  shopId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  walletId: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  bankAccountNumber: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ifscCode: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accountHolderName: string;
}
