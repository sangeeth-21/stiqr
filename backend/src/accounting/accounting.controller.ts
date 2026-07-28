import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AccountingService } from './accounting.service';
import { CreateLedgerDto } from './dto/create-ledger.dto';
import { CreateJournalDto } from './dto/create-journal.dto';

@ApiTags('accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Post('ledger')
  @ApiOperation({ summary: 'Create a ledger entry' })
  createLedger(@Body() dto: CreateLedgerDto) {
    return this.accountingService.createLedgerEntry(dto);
  }

  @Get('ledger')
  @ApiOperation({ summary: 'Get ledger entries' })
  @ApiQuery({ name: 'shopId', required: true })
  @ApiQuery({ name: 'entityType', required: false })
  getLedger(@Query('shopId') shopId: string, @Query() query: any) {
    return this.accountingService.getLedger(shopId, query);
  }

  @Post('journal')
  @ApiOperation({ summary: 'Create a journal entry' })
  createJournal(@Body() dto: CreateJournalDto) {
    return this.accountingService.createJournalEntry(dto);
  }

  @Get('journal')
  @ApiOperation({ summary: 'Get journal entries' })
  @ApiQuery({ name: 'shopId', required: true })
  getJournal(@Query('shopId') shopId: string, @Query() query: any) {
    return this.accountingService.getJournal(shopId, query);
  }

  @Get('trial-balance')
  @ApiOperation({ summary: 'Get trial balance' })
  @ApiQuery({ name: 'shopId', required: true })
  getTrialBalance(@Query('shopId') shopId: string) {
    return this.accountingService.getTrialBalance(shopId);
  }

  @Get('profit-loss')
  @ApiOperation({ summary: 'Get profit & loss statement' })
  @ApiQuery({ name: 'shopId', required: true })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getProfitLoss(@Query('shopId') shopId: string, @Query() query: any) {
    return this.accountingService.getProfitAndLoss(shopId, query);
  }

  @Get('balance-sheet')
  @ApiOperation({ summary: 'Get balance sheet' })
  @ApiQuery({ name: 'shopId', required: true })
  getBalanceSheet(@Query('shopId') shopId: string) {
    return this.accountingService.getBalanceSheet(shopId);
  }
}
