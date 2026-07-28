import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDmtTransferDto {
  @ApiProperty() @IsString() senderId: string;
  @ApiProperty() @IsString() beneficiaryId: string;
  @ApiProperty() @IsString() shopId: string;
  @ApiProperty() @IsNumber() amount: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() charges?: number;
}
