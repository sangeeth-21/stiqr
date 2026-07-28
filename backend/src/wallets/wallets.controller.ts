import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { WalletsService } from './wallets.service';
import { CreateWalletDto } from './dto/create-wallet.dto';

@ApiTags('wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('wallet')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  @ApiOperation({ summary: 'Create wallet' })
  create(@Body() dto: CreateWalletDto) {
    return this.walletsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List wallets' })
  @ApiQuery({ name: 'shopId', required: true })
  findAll(@Query('shopId') shopId: string) {
    return this.walletsService.findAll(shopId);
  }

  @Get('balance/:id')
  @ApiOperation({ summary: 'Get wallet balance' })
  getBalance(@Param('id') id: string) {
    return this.walletsService.getBalance(id);
  }

  @Get('statement/:id')
  @ApiOperation({ summary: 'Get wallet statement' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getStatement(@Param('id') id: string, @Query() query: { page?: number; limit?: number; startDate?: string; endDate?: string }) {
    return this.walletsService.statement(id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get wallet by id' })
  findOne(@Param('id') id: string) {
    return this.walletsService.findOne(id);
  }

  @Post('freeze/:id')
  @ApiOperation({ summary: 'Freeze wallet' })
  freeze(@Param('id') id: string) {
    return this.walletsService.freeze(id);
  }

  @Post('unfreeze/:id')
  @ApiOperation({ summary: 'Unfreeze wallet' })
  unfreeze(@Param('id') id: string) {
    return this.walletsService.unfreeze(id);
  }
}
