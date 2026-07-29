import { Controller, Get, Patch, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/settings.dto';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all system settings' })
  getAll(@Query('group') group?: string) {
    return this.settingsService.getAll(group);
  }

  @Patch()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update system settings' })
  async update(@Body() dto: UpdateSettingDto) {
    return this.settingsService.update(dto.key, dto.value);
  }
}
