import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRechargeDto {
  @ApiProperty() @IsString() shopId: string;
  @ApiProperty() @IsString() type: string;
  @ApiPropertyOptional() @IsOptional() @IsString() operator?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() operatorCode?: string;
  @ApiProperty() @IsString() mobileOrAccountNumber: string;
  @ApiProperty() @IsNumber() amount: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() convenienceFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalDebited?: number;
}
