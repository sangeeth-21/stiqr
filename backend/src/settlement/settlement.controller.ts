import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SettlementService } from './settlement.service';
import { CreateSettlementDto } from './dto/create-settlement.dto';

@ApiTags('settlement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settlement')
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Post()
  @ApiOperation({ summary: 'Request settlement' })
  create(@Body() dto: CreateSettlementDto) {
    return this.settlementService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List settlements' })
  @ApiQuery({ name: 'shopId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(@Query('shopId') shopId?: string, @Query('status') status?: string) {
    return this.settlementService.findAll({ shopId, status });
  }

  @Get('history/:shopId')
  @ApiOperation({ summary: 'Settlement history' })
  history(@Param('shopId') shopId: string) {
    return this.settlementService.history(shopId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get settlement by id' })
  findOne(@Param('id') id: string) {
    return this.settlementService.findOne(id);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve settlement' })
  approve(@Param('id') id: string, @Body('processedBy') processedBy: string) {
    return this.settlementService.approve(id, processedBy);
  }

  @Patch(':id/process')
  @ApiOperation({ summary: 'Process settlement' })
  process(@Param('id') id: string, @Body('utrNumber') utrNumber: string) {
    return this.settlementService.process(id, utrNumber);
  }

  @Patch(':id/fail')
  @ApiOperation({ summary: 'Mark settlement as failed' })
  fail(@Param('id') id: string, @Body('failureReason') failureReason: string) {
    return this.settlementService.fail(id, failureReason);
  }
}
