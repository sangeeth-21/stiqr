import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AepsService } from './aeps.service';

@ApiTags('aeps')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('aeps')
export class AepsController {
  constructor(private readonly aepsService: AepsService) {}

  @Post('transactions')
  @ApiOperation({ summary: 'Initiate AEPS transaction' })
  create(@Body() body: any) { return this.aepsService.createTransaction(body); }

  @Get('transactions')
  @ApiOperation({ summary: 'List AEPS transactions' })
  list(@Query('shopId') shopId: string, @Query('status') status: string, @Query('page') page: string, @Query('limit') limit: string) {
    return this.aepsService.findAll(shopId, status, parseInt(page) || 1, parseInt(limit) || 20);
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'Get AEPS transaction' })
  get(@Param('id') id: string) { return this.aepsService.findOne(id); }

  @Post('transactions/:id/status')
  @ApiOperation({ summary: 'Update AEPS transaction status' })
  updateStatus(@Param('id') id: string, @Body() body: any) { return this.aepsService.updateStatus(id, body); }
}
