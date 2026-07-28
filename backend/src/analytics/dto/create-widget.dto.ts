import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWidgetDto {
  @ApiProperty()
  @IsString()
  dashboardId: string;

  @ApiProperty({ example: 'Revenue Chart' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'CHART' })
  @IsString()
  widgetType: string;

  @ApiPropertyOptional({ example: 'LINE' })
  @IsOptional()
  @IsString()
  chartType?: string;

  @ApiProperty({ example: 'REVENUE' })
  @IsString()
  dataSource: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  config?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  position?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  refreshInterval?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
