import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PluginsService } from './plugins.service';
import { InstallPluginDto } from './dto/install-plugin.dto';

@ApiTags('plugins')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('plugins')
export class PluginsController {
  constructor(private readonly service: PluginsService) {}

  @Post()
  @ApiOperation({ summary: 'Install plugin' })
  install(@Body() dto: InstallPluginDto) { return this.service.install(dto); }

  @Get()
  @ApiOperation({ summary: 'List plugins' })
  list(@Query('status') status?: string, @Query('category') category?: string) {
    return this.service.list({ status, category });
  }

  @Get('marketplace')
  @ApiOperation({ summary: 'Plugin marketplace' })
  marketplace() { return this.service.marketplace(); }

  @Get(':id')
  @ApiOperation({ summary: 'Get plugin' })
  getOne(@Param('id') id: string) { return this.service.getOne(id); }

  @Patch(':id')
  @ApiOperation({ summary: 'Update plugin' })
  update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }

  @Delete(':id')
  @ApiOperation({ summary: 'Uninstall plugin' })
  uninstall(@Param('id') id: string) { return this.service.uninstall(id); }

  @Post(':id/enable')
  @ApiOperation({ summary: 'Enable plugin' })
  enable(@Param('id') id: string) { return this.service.enable(id); }

  @Post(':id/disable')
  @ApiOperation({ summary: 'Disable plugin' })
  disable(@Param('id') id: string) { return this.service.disable(id); }
}
