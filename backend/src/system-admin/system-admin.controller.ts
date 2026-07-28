import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SystemAdminService } from './system-admin.service';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class SystemAdminController {
  constructor(private readonly service: SystemAdminService) {}

  @Post('feature-flags')
  @ApiOperation({ summary: 'Create feature flag' })
  createFlag(@Body() dto: CreateFeatureFlagDto) { return this.service.createFlag(dto); }

  @Get('feature-flags')
  @ApiOperation({ summary: 'List feature flags' })
  listFlags() { return this.service.listFlags(); }

  @Get('feature-flags/check/:key')
  @ApiOperation({ summary: 'Check feature flag' })
  checkFlag(@Param('key') key: string) { return this.service.checkFlag(key); }

  @Get('feature-flags/:id')
  @ApiOperation({ summary: 'Get feature flag' })
  getFlag(@Param('id') id: string) { return this.service.getFlag(id); }

  @Patch('feature-flags/:id')
  @ApiOperation({ summary: 'Update feature flag' })
  updateFlag(@Param('id') id: string, @Body() dto: any) { return this.service.updateFlag(id, dto); }

  @Delete('feature-flags/:id')
  @ApiOperation({ summary: 'Delete feature flag' })
  deleteFlag(@Param('id') id: string) { return this.service.deleteFlag(id); }

  @Post('announcements')
  @ApiOperation({ summary: 'Create announcement' })
  createAnnouncement(@Body() dto: CreateAnnouncementDto) { return this.service.createAnnouncement(dto); }

  @Get('announcements')
  @ApiOperation({ summary: 'List announcements' })
  listAnnouncements(@Query('type') type?: string, @Query('isActive') isActive?: string) {
    return this.service.listAnnouncements({ type, isActive });
  }

  @Get('announcements/:id')
  @ApiOperation({ summary: 'Get announcement' })
  getAnnouncement(@Param('id') id: string) { return this.service.getAnnouncement(id); }

  @Patch('announcements/:id')
  @ApiOperation({ summary: 'Update announcement' })
  updateAnnouncement(@Param('id') id: string, @Body() dto: any) { return this.service.updateAnnouncement(id, dto); }

  @Delete('announcements/:id')
  @ApiOperation({ summary: 'Delete announcement' })
  deleteAnnouncement(@Param('id') id: string) { return this.service.deleteAnnouncement(id); }

  @Get('system-info')
  @ApiOperation({ summary: 'System information' })
  getSystemInfo() { return this.service.getSystemInfo(); }
}
