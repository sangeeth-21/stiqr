import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto, CreatePurchaseItemOnlyDto } from './dto/create-purchase.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('purchases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private purchasesService: PurchasesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a purchase order' })
  create(@Body() dto: CreatePurchaseDto) {
    return this.purchasesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all purchases' })
  findAll(@Query() query: any) {
    return this.purchasesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase by ID' })
  findOne(@Param('id') id: string) {
    return this.purchasesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a purchase' })
  update(@Param('id') id: string, @Body() dto: Partial<CreatePurchaseDto>) {
    return this.purchasesService.update(id, dto);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add items to a purchase order' })
  addItems(@Param('id') id: string, @Body() dto: CreatePurchaseItemOnlyDto) {
    return this.purchasesService.addItems(id, dto.items);
  }
}
