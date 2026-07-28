import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PosService } from './pos.service';
import { CreatePosSessionDto } from './dto/create-pos-session.dto';
import { PosSaleDto } from './dto/pos-sale.dto';

@ApiTags('pos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Open a new POS session' })
  openSession(@Body() dto: CreatePosSessionDto) {
    return this.posService.openSession(dto);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get all POS sessions' })
  @ApiQuery({ name: 'shopId', required: true })
  @ApiQuery({ name: 'status', required: false })
  findAll(@Query('shopId') shopId: string, @Query() query: any) {
    return this.posService.findAll(shopId, query);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get a POS session by ID' })
  findOne(@Param('id') id: string) {
    return this.posService.findOne(id);
  }

  @Patch('sessions/:id/close')
  @ApiOperation({ summary: 'Close a POS session' })
  closeSession(@Param('id') id: string, @Body() body: { closingBalance: number }) {
    return this.posService.closeSession(id, body);
  }

  @Post('sale')
  @ApiOperation({ summary: 'Process a POS sale' })
  processSale(@Body() dto: PosSaleDto) {
    return this.posService.processSale(dto);
  }

  @Get('sessions/:id/summary')
  @ApiOperation({ summary: 'Get session summary' })
  getSessionSummary(@Param('id') id: string) {
    return this.posService.getSessionSummary(id);
  }
}
