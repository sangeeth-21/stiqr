import { Controller, Get, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all settings' })
  getAll(@Query('shopId') shopId?: string) {
    return this.settingsService.getAll(shopId);
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a setting by key' })
  get(@Param('key') key: string, @Query('shopId') shopId?: string) {
    return this.settingsService.get(key, shopId);
  }

  @Put()
  @ApiOperation({ summary: 'Set a setting' })
  set(@Body() dto: { key: string; value: string; shopId?: string; type?: string; group?: string }) {
    return this.settingsService.set(dto.key, dto.value, dto.shopId, dto.type, dto.group);
  }

  @Put('bulk')
  @ApiOperation({ summary: 'Set multiple settings' })
  setMultiple(@Body() dto: { settings: Array<{ key: string; value: string; type?: string; group?: string }>; shopId?: string }) {
    return this.settingsService.setMultiple(dto.settings, dto.shopId);
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete a setting' })
  remove(@Param('key') key: string, @Query('shopId') shopId?: string) {
    return this.settingsService.remove(key, shopId);
  }
}
