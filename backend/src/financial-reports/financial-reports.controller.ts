import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { FinancialReportsService } from './financial-reports.service';

@ApiTags('financial-reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('financial-reports')
export class FinancialReportsController {
  constructor(private readonly financialReportsService: FinancialReportsService) {}

  @Get('wallet')
  @ApiOperation({ summary: 'Get wallet report' })
  @ApiQuery({ name: 'shopId', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getWalletReport(
    @Query('shopId') shopId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financialReportsService.getWalletReport(shopId, { startDate, endDate });
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get transaction report' })
  @ApiQuery({ name: 'shopId', required: true })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getTransactionReport(
    @Query('shopId') shopId: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financialReportsService.getTransactionReport(shopId, { type, startDate, endDate });
  }

  @Get('commission')
  @ApiOperation({ summary: 'Get commission report' })
  @ApiQuery({ name: 'shopId', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getCommissionReport(
    @Query('shopId') shopId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financialReportsService.getCommissionReport(shopId, { startDate, endDate });
  }

  @Get('settlement')
  @ApiOperation({ summary: 'Get settlement report' })
  @ApiQuery({ name: 'shopId', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getSettlementReport(
    @Query('shopId') shopId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financialReportsService.getSettlementReport(shopId, { startDate, endDate });
  }

  @Get('dmt')
  @ApiOperation({ summary: 'Get DMT report' })
  @ApiQuery({ name: 'shopId', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getDmtReport(
    @Query('shopId') shopId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financialReportsService.getDmtReport(shopId, { startDate, endDate });
  }

  @Get('recharge')
  @ApiOperation({ summary: 'Get recharge report' })
  @ApiQuery({ name: 'shopId', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getRechargeReport(
    @Query('shopId') shopId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financialReportsService.getRechargeReport(shopId, { startDate, endDate });
  }

  @Get('refund')
  @ApiOperation({ summary: 'Get refund report' })
  @ApiQuery({ name: 'shopId', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getRefundReport(
    @Query('shopId') shopId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financialReportsService.getRefundReport(shopId, { startDate, endDate });
  }

  @Get('profit')
  @ApiOperation({ summary: 'Get profit/loss report' })
  @ApiQuery({ name: 'shopId', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getProfitReport(
    @Query('shopId') shopId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financialReportsService.getProfitReport(shopId, { startDate, endDate });
  }
}
