import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { FraudService } from './fraud.service';
import { CreateFraudRuleDto } from './dto/create-fraud-rule.dto';
import { UpdateFraudRuleDto } from './dto/update-fraud-rule.dto';
import { ResolveFraudAlertDto } from './dto/resolve-fraud-alert.dto';
import { CreateBlacklistDto } from './dto/create-blacklist.dto';
import { CheckBlacklistDto } from './dto/check-blacklist.dto';

@ApiTags('fraud')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('fraud')
export class FraudController {
  constructor(private readonly fraudService: FraudService) {}

  @Post('rules')
  @ApiOperation({ summary: 'Create fraud rule' })
  createRule(@Body() dto: CreateFraudRuleDto) {
    return this.fraudService.createRule(dto);
  }

  @Get('rules')
  @ApiOperation({ summary: 'List fraud rules' })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'ruleType', required: false })
  listRules(@Query('isActive') isActive?: string, @Query('ruleType') ruleType?: string) {
    return this.fraudService.listRules({ isActive, ruleType });
  }

  @Get('rules/:id')
  @ApiOperation({ summary: 'Get fraud rule by id' })
  getRule(@Param('id') id: string) {
    return this.fraudService.getRule(id);
  }

  @Patch('rules/:id')
  @ApiOperation({ summary: 'Update fraud rule' })
  updateRule(@Param('id') id: string, @Body() dto: UpdateFraudRuleDto) {
    return this.fraudService.updateRule(id, dto);
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: 'Delete fraud rule' })
  deleteRule(@Param('id') id: string) {
    return this.fraudService.deleteRule(id);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'List fraud alerts' })
  @ApiQuery({ name: 'shopId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  listAlerts(
    @Query('shopId') shopId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.fraudService.listAlerts({ shopId, status, page, limit });
  }

  @Get('alerts/:id')
  @ApiOperation({ summary: 'Get fraud alert by id' })
  getAlert(@Param('id') id: string) {
    return this.fraudService.getAlert(id);
  }

  @Patch('alerts/:id/resolve')
  @ApiOperation({ summary: 'Resolve fraud alert' })
  resolveAlert(@Param('id') id: string, @Body() dto: ResolveFraudAlertDto) {
    return this.fraudService.resolveAlert(id, dto);
  }

  @Post('blacklist')
  @ApiOperation({ summary: 'Add to blacklist' })
  addBlacklist(@Body() dto: CreateBlacklistDto) {
    return this.fraudService.addBlacklist(dto);
  }

  @Get('blacklist')
  @ApiOperation({ summary: 'List blacklist entries' })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  listBlacklist(@Query('entityType') entityType?: string, @Query('isActive') isActive?: string) {
    return this.fraudService.listBlacklist({ entityType, isActive });
  }

  @Delete('blacklist/:id')
  @ApiOperation({ summary: 'Remove from blacklist' })
  removeBlacklist(@Param('id') id: string) {
    return this.fraudService.removeBlacklist(id);
  }

  @Post('check')
  @ApiOperation({ summary: 'Check if entity is blacklisted' })
  checkBlacklist(@Body() dto: CheckBlacklistDto) {
    return this.fraudService.checkBlacklist(dto);
  }
}
