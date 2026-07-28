import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SecurityCenterService } from './security-center.service';
import { BlockIPDto } from './dto/block-ip.dto';
import { CreateSecurityAlertDto } from './dto/create-security-alert.dto';

@ApiTags('security')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('security')
export class SecurityCenterController {
  constructor(private readonly service: SecurityCenterService) {}

  @Post('alerts')
  @ApiOperation({ summary: 'Create security alert' })
  createAlert(@Body() dto: CreateSecurityAlertDto) { return this.service.createAlert(dto); }

  @Get('alerts')
  @ApiOperation({ summary: 'List security alerts' })
  listAlerts(@Query('shopId') shopId?: string, @Query('alertType') alertType?: string, @Query('severity') severity?: string, @Query('status') status?: string) {
    return this.service.listAlerts({ shopId, alertType, severity, status });
  }

  @Get('alerts/:id')
  @ApiOperation({ summary: 'Get security alert' })
  getAlert(@Param('id') id: string) { return this.service.getAlert(id); }

  @Patch('alerts/:id')
  @ApiOperation({ summary: 'Update security alert' })
  updateAlert(@Param('id') id: string, @Body() dto: any) { return this.service.updateAlert(id, dto); }

  @Delete('alerts/:id')
  @ApiOperation({ summary: 'Delete security alert' })
  deleteAlert(@Param('id') id: string) { return this.service.deleteAlert(id); }

  @Post('block-ip')
  @ApiOperation({ summary: 'Block IP address' })
  blockIP(@Body() dto: BlockIPDto) { return this.service.blockIP(dto); }

  @Get('blocked-ips')
  @ApiOperation({ summary: 'List blocked IPs' })
  listBlockedIPs(@Query('isActive') isActive?: string) {
    return this.service.listBlockedIPs({ isActive });
  }

  @Delete('blocked-ips/:id')
  @ApiOperation({ summary: 'Unblock IP' })
  unblockIP(@Param('id') id: string) { return this.service.unblockIP(id); }

  @Get('stats')
  @ApiOperation({ summary: 'Security statistics' })
  getStats() { return this.service.getStats(); }
}
