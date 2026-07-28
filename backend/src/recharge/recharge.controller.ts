import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RechargeService } from './recharge.service';

@ApiTags('recharge')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('recharge')
export class RechargeController {
  constructor(private readonly rechargeService: RechargeService) {}

  @Post()
  @ApiOperation({ summary: 'Do recharge' })
  create(@Body() body: any) { return this.rechargeService.create(body); }

  @Get()
  @ApiOperation({ summary: 'List recharges' })
  list(@Query('shopId') shopId: string, @Query('type') type: string, @Query('status') status: string, @Query('page') page: string, @Query('limit') limit: string) {
    return this.rechargeService.findAll(shopId, type, status, parseInt(page) || 1, parseInt(limit) || 20);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get recharge' })
  get(@Param('id') id: string) { return this.rechargeService.findOne(id); }

  @Post(':id/status')
  @ApiOperation({ summary: 'Update recharge status' })
  updateStatus(@Param('id') id: string, @Body() body: any) { return this.rechargeService.updateStatus(id, body); }
}
