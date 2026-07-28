import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@ApiTags('sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new sale' })
  create(@Body() createSaleDto: CreateSaleDto) {
    return this.salesService.create(createSaleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sales' })
  @ApiQuery({ name: 'shopId', required: true })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  findAll(@Query('shopId') shopId: string, @Query() query: any) {
    return this.salesService.findAll(shopId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a sale by ID' })
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a sale' })
  update(@Param('id') id: string, @Body() updateSaleDto: Partial<CreateSaleDto>) {
    return this.salesService.update(id, updateSaleDto);
  }

  @Post(':id/return')
  @ApiOperation({ summary: 'Process a sale return' })
  processReturn(@Param('id') id: string, @Body() returnData: { items: { saleItemId: string; quantity: number; reason: string }[] }) {
    return this.salesService.processReturn(id, returnData);
  }
}
