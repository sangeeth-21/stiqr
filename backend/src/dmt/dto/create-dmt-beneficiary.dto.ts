import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDmtBeneficiaryDto {
  @ApiProperty() @IsString() senderId: string;
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() bankName: string;
  @ApiProperty() @IsString() accountNumber: string;
  @ApiProperty() @IsString() ifscCode: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accountType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nickname?: string;
}
