import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ImeiService } from './imei.service';
import { CreateImeiDto, UpdateImeiDto } from './dto/create-imei.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('imei')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('imei')
export class ImeiController {
  constructor(private imeiService: ImeiService) {}

  @Post()
  @ApiOperation({ summary: 'Create an IMEI record' })
  create(@Body() dto: CreateImeiDto) {
    return this.imeiService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all IMEI records' })
  findAll(@Query() query: any) {
    return this.imeiService.findAll(query);
  }

  @Get('search/:imei')
  @ApiOperation({ summary: 'Search IMEI by number' })
  searchByImei(@Param('imei') imei: string) {
    return this.imeiService.searchByImei(imei);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get IMEI by ID' })
  findOne(@Param('id') id: string) {
    return this.imeiService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update IMEI record' })
  update(@Param('id') id: string, @Body() dto: UpdateImeiDto) {
    return this.imeiService.update(id, dto);
  }
}
