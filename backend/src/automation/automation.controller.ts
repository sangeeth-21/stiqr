import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AutomationService } from './automation.service';
import { CreateAutomationRuleDto } from './dto/create-automation-rule.dto';

@ApiTags('automation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('automation')
export class AutomationController {
  constructor(private readonly service: AutomationService) {}

  @Post('rules')
  @ApiOperation({ summary: 'Create automation rule' })
  createRule(@Body() dto: CreateAutomationRuleDto) { return this.service.createRule(dto); }

  @Get('rules')
  @ApiOperation({ summary: 'List automation rules' })
  listRules(@Query('shopId') shopId?: string, @Query('triggerType') triggerType?: string, @Query('isActive') isActive?: string) {
    return this.service.listRules({ shopId, triggerType, isActive });
  }

  @Get('rules/:id')
  @ApiOperation({ summary: 'Get automation rule' })
  getRule(@Param('id') id: string) { return this.service.getRule(id); }

  @Patch('rules/:id')
  @ApiOperation({ summary: 'Update automation rule' })
  updateRule(@Param('id') id: string, @Body() dto: any) { return this.service.updateRule(id, dto); }

  @Delete('rules/:id')
  @ApiOperation({ summary: 'Delete automation rule' })
  deleteRule(@Param('id') id: string) { return this.service.deleteRule(id); }

  @Post('rules/:id/execute')
  @ApiOperation({ summary: 'Execute automation rule manually' })
  executeRule(@Param('id') id: string) { return this.service.executeRule(id); }

  @Get('rules/:id/executions')
  @ApiOperation({ summary: 'List executions for rule' })
  listExecutions(@Param('id') id: string) { return this.service.listExecutions(id); }

  @Post('jobs')
  @ApiOperation({ summary: 'Create scheduled job' })
  createJob(@Body() dto: any) { return this.service.createJob(dto); }

  @Get('jobs')
  @ApiOperation({ summary: 'List scheduled jobs' })
  listJobs(@Query('jobType') jobType?: string, @Query('isActive') isActive?: string) {
    return this.service.listJobs({ jobType, isActive });
  }

  @Patch('jobs/:id')
  @ApiOperation({ summary: 'Update scheduled job' })
  updateJob(@Param('id') id: string, @Body() dto: any) { return this.service.updateJob(id, dto); }

  @Delete('jobs/:id')
  @ApiOperation({ summary: 'Delete scheduled job' })
  deleteJob(@Param('id') id: string) { return this.service.deleteJob(id); }

  @Get('stats')
  @ApiOperation({ summary: 'Automation statistics' })
  getStats() { return this.service.getStats(); }
}
