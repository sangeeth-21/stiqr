import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBackupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ enum: ['FULL', 'INCREMENTAL', 'FILES', 'DATABASE'] })
  @IsString()
  @IsIn(['FULL', 'INCREMENTAL', 'FILES', 'DATABASE'])
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storageType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  encrypted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdBy?: string;
}
