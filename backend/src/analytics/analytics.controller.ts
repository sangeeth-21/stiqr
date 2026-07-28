import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';
import { CreateWidgetDto } from './dto/create-widget.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Post('events')
  @ApiOperation({ summary: 'Track an analytics event' })
  trackEvent(@Body() body: any) {
    return this.analyticsService.trackEvent(body);
  }

  @Get('events')
  @ApiOperation({ summary: 'List analytics events with filters' })
  listEvents(@Query() query: any) {
    return this.analyticsService.listEvents(query);
  }

  @Post('dashboards')
  @ApiOperation({ summary: 'Create a dashboard' })
  createDashboard(@Body() dto: CreateDashboardDto) {
    return this.analyticsService.createDashboard(dto);
  }

  @Get('dashboards')
  @ApiOperation({ summary: 'List all dashboards' })
  listDashboards() {
    return this.analyticsService.listDashboards();
  }

  @Get('dashboards/:id')
  @ApiOperation({ summary: 'Get dashboard with widgets' })
  getDashboard(@Param('id') id: string) {
    return this.analyticsService.getDashboard(id);
  }

  @Patch('dashboards/:id')
  @ApiOperation({ summary: 'Update a dashboard' })
  updateDashboard(@Param('id') id: string, @Body() dto: UpdateDashboardDto) {
    return this.analyticsService.updateDashboard(id, dto);
  }

  @Delete('dashboards/:id')
  @ApiOperation({ summary: 'Delete a dashboard' })
  deleteDashboard(@Param('id') id: string) {
    return this.analyticsService.deleteDashboard(id);
  }

  @Post('widgets')
  @ApiOperation({ summary: 'Add a widget to a dashboard' })
  addWidget(@Body() dto: CreateWidgetDto) {
    return this.analyticsService.addWidget(dto);
  }

  @Patch('widgets/:id')
  @ApiOperation({ summary: 'Update a widget' })
  updateWidget(@Param('id') id: string, @Body() body: any) {
    return this.analyticsService.updateWidget(id, body);
  }

  @Delete('widgets/:id')
  @ApiOperation({ summary: 'Delete a widget' })
  deleteWidget(@Param('id') id: string) {
    return this.analyticsService.deleteWidget(id);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get analytics summary' })
  getSummary(@Query('shopId') shopId?: string) {
    return this.analyticsService.getSummary(shopId);
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get trend data grouped by date' })
  getTrends(@Query('shopId') shopId?: string, @Query('days') days?: string) {
    return this.analyticsService.getTrends(shopId, days ? parseInt(days, 10) : 30);
  }
}
