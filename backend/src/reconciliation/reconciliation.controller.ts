import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ReconciliationService } from './reconciliation.service';
import { CreateReconciliationDto } from './dto/create-reconciliation.dto';
import { ResolveMismatchDto } from './dto/resolve-mismatch.dto';

@ApiTags('reconciliation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Post()
  @ApiOperation({ summary: 'Start reconciliation' })
  create(@Body() dto: CreateReconciliationDto) {
    return this.reconciliationService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List reconciliations' })
  @ApiQuery({ name: 'shopId', required: false })
  @ApiQuery({ name: 'serviceType', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(@Query() query: { shopId?: string; serviceType?: string; status?: string }) {
    return this.reconciliationService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reconciliation by id with logs' })
  findOne(@Param('id') id: string) {
    return this.reconciliationService.findOne(id);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolve a mismatch' })
  resolve(@Param('id') id: string, @Body() dto: ResolveMismatchDto) {
    return this.reconciliationService.resolve(id, dto.logId, dto.resolution, dto.resolvedBy);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark reconciliation completed' })
  complete(@Param('id') id: string) {
    return this.reconciliationService.complete(id);
  }
}
