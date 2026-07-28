import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'MANAGER' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Shop manager role' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionIds?: string[];
}

export class AssignRoleDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  roleName: string;
}

export class AssignPermissionsDto {
  @ApiProperty()
  @IsString()
  roleId: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  permissionIds: string[];
}
