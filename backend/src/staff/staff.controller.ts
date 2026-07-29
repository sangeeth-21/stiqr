import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { StaffService } from './staff.service'
import { CreateStaffDto } from './dto/create-staff.dto'
import { UpdateStaffDto } from './dto/update-staff.dto'

@ApiTags('staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @ApiOperation({ summary: 'Create a staff member' })
  async create(@CurrentUser() user: any, @Body() dto: CreateStaffDto) {
    return this.staffService.create(dto, user.shopId)
  }

  @Get()
  @ApiOperation({ summary: 'List staff with pagination and search' })
  async findAll(
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.staffService.findAll(user.shopId, { search, page, limit, status })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get staff by ID' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.staffService.findById(id, user.shopId)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a staff member' })
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.staffService.update(id, dto, user.shopId)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a staff member (soft delete)' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.staffService.delete(id, user.shopId)
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate a staff member' })
  async activate(@CurrentUser() user: any, @Param('id') id: string) {
    return this.staffService.activate(id, user.shopId)
  }

  @Patch(':id/suspend')
  @ApiOperation({ summary: 'Suspend a staff member' })
  async suspend(@CurrentUser() user: any, @Param('id') id: string) {
    return this.staffService.suspend(id, user.shopId)
  }

  @Patch(':id/password')
  @ApiOperation({ summary: 'Reset staff password' })
  async resetPassword(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('password') newPassword: string,
  ) {
    return this.staffService.resetPassword(id, user.shopId, newPassword)
  }
}
