import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @ApiOperation({ summary: 'Get sales report' })
  @ApiQuery({ name: 'shopId', required: true })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getSales(@Query('shopId') shopId: string, @Query() query: any) {
    return this.reportsService.getSalesReport(shopId, query);
  }

  @Get('purchases')
  @ApiOperation({ summary: 'Get purchases report' })
  @ApiQuery({ name: 'shopId', required: true })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getPurchases(@Query('shopId') shopId: string, @Query() query: any) {
    return this.reportsService.getPurchasesReport(shopId, query);
  }

  @Get('profit')
  @ApiOperation({ summary: 'Get profit report' })
  @ApiQuery({ name: 'shopId', required: true })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getProfit(@Query('shopId') shopId: string, @Query() query: any) {
    return this.reportsService.getProfitReport(shopId, query);
  }

  @Get('expenses')
  @ApiOperation({ summary: 'Get expenses report' })
  @ApiQuery({ name: 'shopId', required: true })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getExpenses(@Query('shopId') shopId: string, @Query() query: any) {
    return this.reportsService.getExpensesReport(shopId, query);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Get customers report' })
  @ApiQuery({ name: 'shopId', required: true })
  getCustomers(@Query('shopId') shopId: string) {
    return this.reportsService.getCustomersReport(shopId);
  }

  @Get('suppliers')
  @ApiOperation({ summary: 'Get suppliers report' })
  @ApiQuery({ name: 'shopId', required: true })
  getSuppliers(@Query('shopId') shopId: string) {
    return this.reportsService.getSuppliersReport(shopId);
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Get inventory report' })
  @ApiQuery({ name: 'shopId', required: true })
  getInventory(@Query('shopId') shopId: string) {
    return this.reportsService.getInventoryReport(shopId);
  }

  @Get('tax')
  @ApiOperation({ summary: 'Get tax report' })
  @ApiQuery({ name: 'shopId', required: true })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getTax(@Query('shopId') shopId: string, @Query() query: any) {
    return this.reportsService.getTaxReport(shopId, query);
  }

  @Get('employees')
  @ApiOperation({ summary: 'Get employees report' })
  @ApiQuery({ name: 'shopId', required: true })
  getEmployees(@Query('shopId') shopId: string) {
    return this.reportsService.getEmployeesReport(shopId);
  }
}

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({ summary: 'Get dashboard summary' })
  @ApiQuery({ name: 'shopId', required: true })
  getDashboard(@Query('shopId') shopId: string) {
    return this.reportsService.getDashboard(shopId);
  }
}
