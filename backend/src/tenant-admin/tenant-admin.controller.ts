import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantAdminService } from './tenant-admin.service';
import { CreateTenantUsageDto } from './dto/create-tenant-usage.dto';
import { CreatePerformanceMetricDto } from './dto/create-performance-metric.dto';
import { CreateAuditTrailDto } from './dto/create-audit-trail.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('tenant-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenant-admin')
export class TenantAdminController {
  constructor(private tenantAdminService: TenantAdminService) {}

  @Post('usage')
  @ApiOperation({ summary: 'Record tenant usage' })
  recordUsage(@Body() dto: CreateTenantUsageDto) {
    return this.tenantAdminService.recordUsage(dto);
  }

  @Get('usage')
  @ApiOperation({ summary: 'List tenant usage records' })
  listUsage(@Query() query: any) {
    return this.tenantAdminService.listUsage(query);
  }

  @Get('usage/:id')
  @ApiOperation({ summary: 'Get usage record by ID' })
  getUsage(@Param('id') id: string) {
    return this.tenantAdminService.getUsage(id);
  }

  @Patch('usage/:id')
  @ApiOperation({ summary: 'Update usage record' })
  updateUsage(@Param('id') id: string, @Body() dto: CreateTenantUsageDto) {
    return this.tenantAdminService.updateUsage(id, dto);
  }

  @Post('metrics')
  @ApiOperation({ summary: 'Record a performance metric' })
  recordMetric(@Body() dto: CreatePerformanceMetricDto) {
    return this.tenantAdminService.recordMetric(dto);
  }

  @Get('metrics/latest')
  @ApiOperation({ summary: 'Get latest metric per metricType' })
  getLatestMetrics() {
    return this.tenantAdminService.getLatestMetrics();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'List performance metrics with filters' })
  listMetrics(@Query() query: any) {
    return this.tenantAdminService.listMetrics(query);
  }

  @Post('audit')
  @ApiOperation({ summary: 'Create audit trail entry' })
  createAuditEntry(@Body() dto: CreateAuditTrailDto) {
    return this.tenantAdminService.createAuditEntry(dto);
  }

  @Get('audit')
  @ApiOperation({ summary: 'List audit trail entries with filters' })
  listAuditEntries(@Query() query: any) {
    return this.tenantAdminService.listAuditEntries(query);
  }

  @Get('audit/:id')
  @ApiOperation({ summary: 'Get audit trail entry by ID' })
  getAuditEntry(@Param('id') id: string) {
    return this.tenantAdminService.getAuditEntry(id);
  }

  @Post('retention')
  @ApiOperation({ summary: 'Create a data retention policy' })
  createRetentionPolicy(@Body() data: any) {
    return this.tenantAdminService.createRetentionPolicy(data);
  }

  @Get('retention')
  @ApiOperation({ summary: 'List data retention policies' })
  listRetentionPolicies() {
    return this.tenantAdminService.listRetentionPolicies();
  }

  @Patch('retention/:id')
  @ApiOperation({ summary: 'Update a data retention policy' })
  updateRetentionPolicy(@Param('id') id: string, @Body() data: any) {
    return this.tenantAdminService.updateRetentionPolicy(id, data);
  }

  @Delete('retention/:id')
  @ApiOperation({ summary: 'Delete a data retention policy' })
  deleteRetentionPolicy(@Param('id') id: string) {
    return this.tenantAdminService.deleteRetentionPolicy(id);
  }
}
