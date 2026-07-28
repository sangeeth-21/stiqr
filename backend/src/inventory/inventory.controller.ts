import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { AdjustStockDto, TransferStockDto } from './dto/adjust-stock.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'List all inventory records' })
  findAll(@Query() query: any) {
    return this.inventoryService.findAll(query);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get low stock alerts' })
  getLowStock() {
    return this.inventoryService.getLowStock();
  }

  @Get(':productId')
  @ApiOperation({ summary: 'Get inventory for a product' })
  findOne(@Param('productId') productId: string) {
    return this.inventoryService.findOne(productId);
  }

  @Post('adjust')
  @ApiOperation({ summary: 'Adjust stock quantity' })
  adjustStock(@Body() dto: AdjustStockDto) {
    return this.inventoryService.adjustStock(dto);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer stock between warehouses' })
  transfer(@Body() dto: TransferStockDto) {
    return this.inventoryService.transfer(dto);
  }
}
