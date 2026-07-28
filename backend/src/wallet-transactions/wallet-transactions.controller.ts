import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { WalletTransactionsService } from './wallet-transactions.service';
import { CreateWalletTransactionDto } from './dto/create-wallet-transaction.dto';

@ApiTags('wallet-transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('wallet-transactions')
export class WalletTransactionsController {
  constructor(private readonly walletTransactionsService: WalletTransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Credit or debit wallet' })
  create(@Body() dto: CreateWalletTransactionDto) {
    if (dto.type === 'CREDIT') {
      return this.walletTransactionsService.credit(dto);
    }
    return this.walletTransactionsService.debit(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List wallet transactions' })
  @ApiQuery({ name: 'walletId', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(@Query() query: { walletId: string; page?: number; limit?: number; type?: string; status?: string }) {
    return this.walletTransactionsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get wallet transaction by id' })
  findOne(@Param('id') id: string) {
    return this.walletTransactionsService.findOne(id);
  }

  @Post(':id/reverse')
  @ApiOperation({ summary: 'Reverse a wallet transaction' })
  reverse(@Param('id') id: string) {
    return this.walletTransactionsService.reverse(id);
  }
}
