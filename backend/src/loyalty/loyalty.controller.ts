import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { LoyaltyService } from './loyalty.service';
import { CreateLoyaltyProgramDto } from './dto/create-loyalty-program.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';

@ApiTags('loyalty')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Post('programs')
  @ApiOperation({ summary: 'Create loyalty program' })
  createProgram(@Body() dto: CreateLoyaltyProgramDto) {
    return this.loyaltyService.createProgram(dto);
  }

  @Get('programs')
  @ApiOperation({ summary: 'Get all loyalty programs' })
  @ApiQuery({ name: 'shopId', required: true })
  getPrograms(@Query('shopId') shopId: string) {
    return this.loyaltyService.getPrograms(shopId);
  }

  @Patch('programs/:id')
  @ApiOperation({ summary: 'Update loyalty program' })
  updateProgram(@Param('id') id: string, @Body() dto: Partial<CreateLoyaltyProgramDto>) {
    return this.loyaltyService.updateProgram(id, dto);
  }

  @Post('earn')
  @ApiOperation({ summary: 'Earn loyalty points' })
  earnPoints(@Body() body: { shopId: string; customerId: string; saleId: string; amount: number }) {
    return this.loyaltyService.earnPoints(body);
  }

  @Post('redeem')
  @ApiOperation({ summary: 'Redeem loyalty points' })
  redeemPoints(@Body() body: { shopId: string; customerId: string; points: number; description?: string }) {
    return this.loyaltyService.redeemPoints(body);
  }

  @Get('transactions/:customerId')
  @ApiOperation({ summary: 'Get customer loyalty transactions' })
  @ApiQuery({ name: 'shopId', required: true })
  getTransactions(@Query('shopId') shopId: string, @Param('customerId') customerId: string) {
    return this.loyaltyService.getTransactions(shopId, customerId);
  }
}

@ApiTags('coupons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('coupons')
export class CouponsController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a coupon' })
  create(@Body() dto: CreateCouponDto) {
    return this.loyaltyService.createCoupon(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all coupons' })
  @ApiQuery({ name: 'shopId', required: true })
  findAll(@Query('shopId') shopId: string) {
    return this.loyaltyService.getCoupons(shopId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a coupon by ID' })
  findOne(@Param('id') id: string) {
    return this.loyaltyService.getCoupon(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a coupon' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateCouponDto>) {
    return this.loyaltyService.updateCoupon(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a coupon' })
  remove(@Param('id') id: string) {
    return this.loyaltyService.deleteCoupon(id);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate a coupon code' })
  validate(@Body() body: { shopId: string; code: string; amount: number }) {
    return this.loyaltyService.validateCoupon(body.shopId, body.code, body.amount);
  }
}
