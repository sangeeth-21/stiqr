import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { RenewSubscriptionDto } from './dto/renew-subscription.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Subscription')
@ApiBearerAuth()
@Controller('subscription')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current subscription for the authenticated tenant' })
  async getCurrent(@CurrentUser() user: any) {
    return this.subscriptionsService.getCurrent(user.tenantId);
  }

  @Post()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a new subscription' })
  async create(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(dto);
  }

  @Post('renew')
  @ApiOperation({ summary: 'Renew current subscription' })
  async renew(@CurrentUser() user: any, @Body() dto: RenewSubscriptionDto) {
    return this.subscriptionsService.renew(user.tenantId, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get subscription history' })
  async getHistory(@CurrentUser() user: any) {
    return this.subscriptionsService.getHistory(user.tenantId);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel current subscription' })
  async cancel(@CurrentUser() user: any) {
    return this.subscriptionsService.cancel(user.tenantId);
  }

  @Get('plans')
  @ApiOperation({ summary: 'List all subscription plans' })
  async getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Post('plans')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a subscription plan' })
  async createPlan(@Body() dto: CreatePlanDto) {
    return this.subscriptionsService.createPlan(dto);
  }

  @Patch('plans/:id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Update a subscription plan' })
  async updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.subscriptionsService.updatePlan(id, dto);
  }

  @Delete('plans/:id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Deactivate a subscription plan' })
  async deletePlan(@Param('id') id: string) {
    return this.subscriptionsService.deletePlan(id);
  }
}
