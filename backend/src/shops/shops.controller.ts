import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ShopsService } from './shops.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('shops')
@Controller('shops')
export class ShopsController {
  constructor(private shopsService: ShopsService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Create a shop' })
  create(@Body() dto: { name: string; description?: string; address?: string; phone?: string; email?: string }) {
    return this.shopsService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all shops' })
  findAll() {
    return this.shopsService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get shop by ID' })
  findOne(@Param('id') id: string) {
    return this.shopsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Put(':id')
  @Roles('SUPER_ADMIN', 'COMPANY_ADMIN', 'SHOP_OWNER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a shop' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.shopsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a shop' })
  remove(@Param('id') id: string) {
    return this.shopsService.remove(id);
  }
}
