import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { IncomeService } from './income.service';
import { CreateIncomeDto } from './dto/create-income.dto';

@ApiTags('income')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('income')
export class IncomeController {
  constructor(private readonly incomeService: IncomeService) {}

  @Post()
  @ApiOperation({ summary: 'Create income entry' })
  create(@Body() dto: CreateIncomeDto) {
    return this.incomeService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all income entries' })
  @ApiQuery({ name: 'shopId', required: true })
  @ApiQuery({ name: 'source', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  findAll(@Query('shopId') shopId: string, @Query() query: any) {
    return this.incomeService.findAll(shopId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get income by ID' })
  findOne(@Param('id') id: string) {
    return this.incomeService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update income' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateIncomeDto>) {
    return this.incomeService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete income' })
  remove(@Param('id') id: string) {
    return this.incomeService.remove(id);
  }
}
