import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { WarrantyService } from './warranty.service';
import { CreateWarrantyDto } from './dto/create-warranty.dto';

@ApiTags('warranties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('warranties')
export class WarrantyController {
  constructor(private readonly warrantyService: WarrantyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a warranty' })
  create(@Body() dto: CreateWarrantyDto) {
    return this.warrantyService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all warranties' })
  @ApiQuery({ name: 'shopId', required: true })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'productId', required: false })
  findAll(@Query('shopId') shopId: string, @Query() query: any) {
    return this.warrantyService.findAll(shopId, query);
  }

  @Get('validate/:imei')
  @ApiOperation({ summary: 'Validate warranty by IMEI' })
  @ApiQuery({ name: 'shopId', required: true })
  validateByImei(@Query('shopId') shopId: string, @Param('imei') imei: string) {
    return this.warrantyService.validateByImei(shopId, imei);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a warranty by ID' })
  findOne(@Param('id') id: string) {
    return this.warrantyService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a warranty' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateWarrantyDto>) {
    return this.warrantyService.update(id, dto);
  }
}
