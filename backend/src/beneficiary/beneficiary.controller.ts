import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { BeneficiaryService } from './beneficiary.service';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto';

@ApiTags('beneficiary')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('beneficiary')
export class BeneficiaryController {
  constructor(private readonly beneficiaryService: BeneficiaryService) {}

  @Post()
  @ApiOperation({ summary: 'Create beneficiary' })
  create(@Body() dto: CreateBeneficiaryDto) {
    return this.beneficiaryService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List beneficiaries' })
  @ApiQuery({ name: 'shopId', required: true })
  findAll(@Query('shopId') shopId: string) {
    return this.beneficiaryService.findAll(shopId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get beneficiary by id' })
  findOne(@Param('id') id: string) {
    return this.beneficiaryService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update beneficiary' })
  update(@Param('id') id: string, @Body() dto: UpdateBeneficiaryDto) {
    return this.beneficiaryService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete beneficiary' })
  remove(@Param('id') id: string) {
    return this.beneficiaryService.remove(id);
  }

  @Patch(':id/favourite')
  @ApiOperation({ summary: 'Toggle favourite' })
  toggleFavourite(@Param('id') id: string) {
    return this.beneficiaryService.toggleFavourite(id);
  }
}
