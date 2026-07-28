import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TaxService } from './tax.service';
import { CreateTaxRuleDto } from './dto/create-tax-rule.dto';

@ApiTags('tax')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tax')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Post('rules')
  @ApiOperation({ summary: 'Create a tax rule' })
  createRule(@Body() dto: CreateTaxRuleDto) {
    return this.taxService.create(dto);
  }

  @Get('rules')
  @ApiOperation({ summary: 'Get all tax rules' })
  @ApiQuery({ name: 'shopId', required: true })
  getRules(@Query('shopId') shopId: string) {
    return this.taxService.findAll(shopId);
  }

  @Get('rules/:id')
  @ApiOperation({ summary: 'Get a tax rule by ID' })
  getRule(@Param('id') id: string) {
    return this.taxService.findOne(id);
  }

  @Patch('rules/:id')
  @ApiOperation({ summary: 'Update a tax rule' })
  updateRule(@Param('id') id: string, @Body() dto: Partial<CreateTaxRuleDto>) {
    return this.taxService.update(id, dto);
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: 'Delete a tax rule' })
  deleteRule(@Param('id') id: string) {
    return this.taxService.remove(id);
  }

  @Get('calculate')
  @ApiOperation({ summary: 'Calculate tax for an amount' })
  @ApiQuery({ name: 'shopId', required: true })
  @ApiQuery({ name: 'amount', required: true })
  @ApiQuery({ name: 'ruleId', required: false })
  calculate(@Query('shopId') shopId: string, @Query('amount') amount: string, @Query('ruleId') ruleId?: string) {
    return this.taxService.calculate(shopId, parseFloat(amount), ruleId);
  }
}
