import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { AdminCreateSubscriptionDto } from './dto/create-admin-subscription.dto';
import { AdminUpdateSubscriptionDto } from './dto/update-admin-subscription.dto';
import { QueryDto } from './dto/query.dto';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles('SUPER_ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get platform dashboard statistics' })
  async getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('shops')
  @ApiOperation({ summary: 'List all shops with pagination and search' })
  async getShops(@Query() query: QueryDto) {
    return this.adminService.getShops(query);
  }

  @Post('shops')
  @ApiOperation({ summary: 'Create a new shop (admin)' })
  async createShop(@Body() dto: CreateShopDto) {
    return this.adminService.createShop(dto);
  }

  @Get('shops/:id')
  @ApiOperation({ summary: 'Get full shop details' })
  async getShopDetails(@Param('id') id: string) {
    return this.adminService.getShopDetails(id);
  }

  @Patch('shops/:id')
  @ApiOperation({ summary: 'Update any shop' })
  async updateShop(@Param('id') id: string, @Body() dto: UpdateShopDto) {
    return this.adminService.updateShop(id, dto);
  }

  @Delete('shops/:id')
  @ApiOperation({ summary: 'Hard delete a shop' })
  async deleteShop(@Param('id') id: string) {
    return this.adminService.deleteShop(id);
  }

  @Patch('shops/:id/suspend')
  @ApiOperation({ summary: 'Suspend a shop' })
  async suspendShop(@Param('id') id: string) {
    return this.adminService.suspendShop(id);
  }

  @Patch('shops/:id/activate')
  @ApiOperation({ summary: 'Activate a shop' })
  async activateShop(@Param('id') id: string) {
    return this.adminService.activateShop(id);
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'List all subscriptions' })
  async getSubscriptions(@Query() query: QueryDto) {
    return this.adminService.getSubscriptions(query);
  }

  @Post('subscriptions')
  @ApiOperation({ summary: 'Create subscription for any tenant' })
  async createSubscription(@Body() dto: AdminCreateSubscriptionDto) {
    return this.adminService.createSubscription(dto);
  }

  @Patch('subscriptions/:id')
  @ApiOperation({ summary: 'Update a subscription' })
  async updateSubscription(@Param('id') id: string, @Body() dto: AdminUpdateSubscriptionDto) {
    return this.adminService.updateSubscription(id, dto);
  }

  @Delete('subscriptions/:id')
  @ApiOperation({ summary: 'Delete a subscription' })
  async deleteSubscription(@Param('id') id: string) {
    return this.adminService.deleteSubscription(id);
  }

  @Get('payments')
  @ApiOperation({ summary: 'List all payments' })
  async getPayments(@Query() query: QueryDto) {
    return this.adminService.getPayments(query);
  }

  @Get('payments/:id')
  @ApiOperation({ summary: 'Get payment details' })
  async getPaymentDetails(@Param('id') id: string) {
    return this.adminService.getPaymentDetails(id);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get platform reports' })
  @ApiQuery({ name: 'type', required: true, enum: ['revenue', 'sales', 'shops', 'subscriptions'] })
  async getReports(@Query('type') type: string, @Query() query: QueryDto) {
    return this.adminService.getReports(type, query);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get platform analytics' })
  async getAnalytics(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getAnalytics({ period, startDate, endDate });
  }
}
