import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAutomationRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['SCHEDULE', 'EVENT', 'MANUAL'] })
  @IsString()
  @IsIn(['SCHEDULE', 'EVENT', 'MANUAL'])
  triggerType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  triggerConfig?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  actionType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actionConfig?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conditions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdBy?: string;
}
