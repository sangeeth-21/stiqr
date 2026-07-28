import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWalletDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  shopId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  holderType: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  holderId: string;
}
