import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { FinancialTransactionsService } from './financial-transactions.service';
import { CreateFinancialTransactionDto } from './dto/create-financial-transaction.dto';

@ApiTags('financial-transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('financial-transactions')
export class FinancialTransactionsController {
  constructor(private readonly financialTransactionsService: FinancialTransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create financial transaction' })
  create(@Body() dto: CreateFinancialTransactionDto) {
    return this.financialTransactionsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List financial transactions' })
  @ApiQuery({ name: 'shopId', required: true })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  findAll(@Query() query: { shopId: string; type?: string; status?: string; page?: number; limit?: number; startDate?: string; endDate?: string }) {
    return this.financialTransactionsService.findAll(query);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get transaction logs' })
  getLogs(@Param('id') id: string) {
    return this.financialTransactionsService.getLogs(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get financial transaction by id' })
  findOne(@Param('id') id: string) {
    return this.financialTransactionsService.findOne(id);
  }

  @Post(':id/status')
  @ApiOperation({ summary: 'Update transaction status' })
  updateStatus(@Param('id') id: string, @Body() body: { status: string; message?: string }) {
    return this.financialTransactionsService.updateStatus(id, body);
  }
}
