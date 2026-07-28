import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ServiceRepairService } from './service-repair.service';
import { CreateServiceRepairDto } from './dto/create-service-repair.dto';

@ApiTags('service-repairs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('service-repairs')
export class ServiceRepairController {
  constructor(private readonly serviceRepairService: ServiceRepairService) {}

  @Post()
  @ApiOperation({ summary: 'Create a service repair ticket' })
  create(@Body() dto: CreateServiceRepairDto) {
    return this.serviceRepairService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all service repairs' })
  @ApiQuery({ name: 'shopId', required: true })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'technicianId', required: false })
  findAll(@Query('shopId') shopId: string, @Query() query: any) {
    return this.serviceRepairService.findAll(shopId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service repair by ID' })
  findOne(@Param('id') id: string) {
    return this.serviceRepairService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a service repair' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateServiceRepairDto>) {
    return this.serviceRepairService.update(id, dto);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign technician to repair' })
  assignTechnician(@Param('id') id: string, @Body() body: { technicianId: string }) {
    return this.serviceRepairService.assignTechnician(id, body.technicianId);
  }
}
