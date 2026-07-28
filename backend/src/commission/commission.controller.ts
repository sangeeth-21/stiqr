import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CommissionService } from './commission.service';
import { CreateCommissionRuleDto } from './dto/create-commission-rule.dto';
import { CreateCommissionSlabDto } from './dto/create-commission-slab.dto';

@ApiTags('commission')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('commission')
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  @Post('rules')
  @ApiOperation({ summary: 'Create commission rule' })
  createRule(@Body() dto: CreateCommissionRuleDto) {
    return this.commissionService.createRule(dto);
  }

  @Get('rules')
  @ApiOperation({ summary: 'List commission rules' })
  @ApiQuery({ name: 'shopId', required: true })
  @ApiQuery({ name: 'serviceType', required: false })
  findRules(@Query('shopId') shopId: string, @Query('serviceType') serviceType?: string) {
    return this.commissionService.findRules({ shopId, serviceType });
  }

  @Get('rules/:id')
  @ApiOperation({ summary: 'Get commission rule' })
  findRule(@Param('id') id: string) {
    return this.commissionService.findRule(id);
  }

  @Patch('rules/:id')
  @ApiOperation({ summary: 'Update commission rule' })
  updateRule(@Param('id') id: string, @Body() dto: Partial<CreateCommissionRuleDto>) {
    return this.commissionService.updateRule(id, dto);
  }

  @Post('slabs')
  @ApiOperation({ summary: 'Add slab to commission rule' })
  addSlab(@Body() dto: CreateCommissionSlabDto) {
    return this.commissionService.addSlab(dto);
  }

  @Get('slabs')
  @ApiOperation({ summary: 'List commission slabs' })
  @ApiQuery({ name: 'ruleId', required: true })
  findSlabs(@Query('ruleId') ruleId: string) {
    return this.commissionService.findSlabs(ruleId);
  }

  @Get('ledger')
  @ApiOperation({ summary: 'Commission ledger' })
  @ApiQuery({ name: 'shopId', required: true })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getLedger(@Query() query: { shopId: string; status?: string; page?: number; limit?: number }) {
    return this.commissionService.getLedger(query);
  }

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate commission' })
  @ApiQuery({ name: 'shopId', required: true })
  @ApiQuery({ name: 'serviceType', required: true })
  @ApiQuery({ name: 'amount', required: true })
  calculate(@Query('shopId') shopId: string, @Query('serviceType') serviceType: string, @Query('amount') amount: number) {
    return this.commissionService.calculate({ shopId, serviceType, amount: Number(amount) });
  }
}
