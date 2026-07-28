import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IntegrationHubService } from './integration-hub.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('integration-hub')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('integrations')
export class IntegrationHubController {
  constructor(private integrationHubService: IntegrationHubService) {}

  @Post()
  @ApiOperation({ summary: 'Create an integration' })
  createIntegration(@Body() dto: CreateIntegrationDto) {
    return this.integrationHubService.createIntegration(dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get integration statistics' })
  getStats() {
    return this.integrationHubService.getStats();
  }

  @Get()
  @ApiOperation({ summary: 'List integrations with filters' })
  listIntegrations(@Query() query: any) {
    return this.integrationHubService.listIntegrations(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get integration with recent logs' })
  getIntegration(@Param('id') id: string) {
    return this.integrationHubService.getIntegration(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an integration' })
  updateIntegration(@Param('id') id: string, @Body() dto: CreateIntegrationDto) {
    return this.integrationHubService.updateIntegration(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an integration' })
  deleteIntegration(@Param('id') id: string) {
    return this.integrationHubService.deleteIntegration(id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test an integration' })
  testIntegration(@Param('id') id: string) {
    return this.integrationHubService.testIntegration(id);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'List logs for an integration' })
  listIntegrationLogs(@Param('id') id: string, @Query() query: any) {
    return this.integrationHubService.listIntegrationLogs(id, query);
  }
}
