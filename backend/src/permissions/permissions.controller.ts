import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';

@ApiTags('Permissions')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @ApiOperation({ summary: 'List all permissions' })
  findAll() {
    return this.permissionsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create permission' })
  create(@Body() dto: { resource: string; action: string; description?: string }) {
    return this.permissionsService.create(dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete permission' })
  delete(@Param('id') id: string) {
    return this.permissionsService.delete(id);
  }

  @Post('seed')
  @ApiOperation({ summary: 'Seed default permissions' })
  seedDefault() {
    return this.permissionsService.seedDefault();
  }
}
