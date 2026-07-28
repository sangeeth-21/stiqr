import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto, QueryEmployeeDto, CreateAttendanceDto, CreateLeaveDto } from './dto/create-employee.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private employeesService: EmployeesService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COMPANY_ADMIN', 'SHOP_OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Create an employee' })
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List employees with pagination, search, and filters' })
  findAll(@Query() query: QueryEmployeeDto) {
    return this.employeesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee by ID' })
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'COMPANY_ADMIN', 'SHOP_OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Update an employee' })
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'COMPANY_ADMIN', 'SHOP_OWNER')
  @ApiOperation({ summary: 'Soft delete an employee' })
  remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }

  @Post(':id/attendance')
  @Roles('SUPER_ADMIN', 'COMPANY_ADMIN', 'SHOP_OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Record attendance for an employee' })
  addAttendance(@Param('id') id: string, @Body() dto: CreateAttendanceDto) {
    return this.employeesService.addAttendance(id, dto);
  }

  @Get(':id/attendance')
  @ApiOperation({ summary: 'Get attendance history for an employee' })
  getAttendance(@Param('id') id: string) {
    return this.employeesService.getAttendance(id);
  }

  @Post(':id/leave')
  @Roles('SUPER_ADMIN', 'COMPANY_ADMIN', 'SHOP_OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Apply for leave' })
  addLeave(@Param('id') id: string, @Body() dto: CreateLeaveDto) {
    return this.employeesService.addLeave(id, dto);
  }

  @Get(':id/leave')
  @ApiOperation({ summary: 'Get leave history for an employee' })
  getLeaves(@Param('id') id: string) {
    return this.employeesService.getLeaves(id);
  }
}
