import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WebhookDto {
  @ApiProperty()
  @IsString()
  provider: string;

  @ApiProperty()
  @IsString()
  eventType: string;

  @ApiProperty()
  @IsString()
  payload: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signature?: string;
}
