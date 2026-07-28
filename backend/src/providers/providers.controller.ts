import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ProvidersService } from './providers.service';
import { CreateProviderConfigDto } from './dto/create-provider-config.dto';
import { UpdateProviderConfigDto } from './dto/update-provider-config.dto';
import { CreateProviderLogDto } from './dto/create-provider-log.dto';

@ApiTags('providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post('config')
  @ApiOperation({ summary: 'Create provider config' })
  createConfig(@Body() dto: CreateProviderConfigDto) {
    return this.providersService.createConfig(dto);
  }

  @Get('config')
  @ApiOperation({ summary: 'List provider configs' })
  @ApiQuery({ name: 'provider', required: false })
  @ApiQuery({ name: 'serviceType', required: false })
  listConfigs(@Query('provider') provider?: string, @Query('serviceType') serviceType?: string) {
    return this.providersService.listConfigs({ provider, serviceType });
  }

  @Get('config/:id')
  @ApiOperation({ summary: 'Get provider config' })
  getConfig(@Param('id') id: string) {
    return this.providersService.getConfig(id);
  }

  @Patch('config/:id')
  @ApiOperation({ summary: 'Update provider config' })
  updateConfig(@Param('id') id: string, @Body() dto: UpdateProviderConfigDto) {
    return this.providersService.updateConfig(id, dto);
  }

  @Delete('config/:id')
  @ApiOperation({ summary: 'Delete provider config' })
  deleteConfig(@Param('id') id: string) {
    return this.providersService.deleteConfig(id);
  }

  @Get('logs')
  @ApiOperation({ summary: 'List provider logs' })
  @ApiQuery({ name: 'provider', required: false })
  @ApiQuery({ name: 'success', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  listLogs(
    @Query('provider') provider?: string,
    @Query('success') success?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.providersService.listLogs({ provider, success, page, limit });
  }

  @Get('logs/:id')
  @ApiOperation({ summary: 'Get provider log by id' })
  getLog(@Param('id') id: string) {
    return this.providersService.getLog(id);
  }

  @Post('logs')
  @ApiOperation({ summary: 'Create provider log entry' })
  createLog(@Body() dto: CreateProviderLogDto) {
    return this.providersService.createLog(dto);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get provider health status' })
  getStatus() {
    return this.providersService.getStatus();
  }
}
