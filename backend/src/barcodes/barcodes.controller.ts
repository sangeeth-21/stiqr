import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BarcodesService } from './barcodes.service';
import { CreateBarcodeDto } from './dto/create-barcode.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('barcodes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('barcodes')
export class BarcodesController {
  constructor(private barcodesService: BarcodesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a barcode' })
  create(@Body() dto: CreateBarcodeDto) {
    return this.barcodesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all barcodes' })
  findAll(@Query() query: any) {
    return this.barcodesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get barcode by ID' })
  findOne(@Param('id') id: string) {
    return this.barcodesService.findOne(id);
  }

  @Get('search/:code')
  @ApiOperation({ summary: 'Search barcode by code' })
  searchByCode(@Param('code') code: string) {
    return this.barcodesService.searchByCode(code);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a barcode (soft)' })
  remove(@Param('id') id: string) {
    return this.barcodesService.remove(id);
  }
}
