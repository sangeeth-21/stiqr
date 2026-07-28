import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RefundService } from './refund.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { ApproveRefundDto } from './dto/approve-refund.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { RejectRefundDto } from './dto/reject-refund.dto';

@ApiTags('refund')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('refund')
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  @Post()
  @ApiOperation({ summary: 'Request refund' })
  create(@Body() dto: CreateRefundDto) {
    return this.refundService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List refunds' })
  @ApiQuery({ name: 'shopId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(@Query() query: { shopId?: string; status?: string }) {
    return this.refundService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get refund by id' })
  findOne(@Param('id') id: string) {
    return this.refundService.findOne(id);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve refund' })
  approve(@Param('id') id: string, @Body() dto: ApproveRefundDto) {
    return this.refundService.approve(id, dto.approvedBy);
  }

  @Patch(':id/process')
  @ApiOperation({ summary: 'Process refund' })
  process(@Param('id') id: string, @Body() dto: ProcessRefundDto) {
    return this.refundService.process(id, dto.utrNumber);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject refund' })
  reject(@Param('id') id: string, @Body() dto: RejectRefundDto) {
    return this.refundService.reject(id, dto.reason);
  }
}
