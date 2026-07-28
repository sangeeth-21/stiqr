import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/public.decorator';
import { PaymentGatewayService } from './payment-gateway.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { WebhookDto } from './dto/webhook.dto';

@ApiTags('payment-gateway')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payment-gateway')
export class PaymentGatewayController {
  constructor(private readonly paymentGatewayService: PaymentGatewayService) {}

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate payment' })
  initiate(@Body() dto: InitiatePaymentDto) {
    return this.paymentGatewayService.initiate(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List payment transactions' })
  @ApiQuery({ name: 'shopId', required: false })
  @ApiQuery({ name: 'provider', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(@Query() query: { shopId?: string; provider?: string; status?: string }) {
    return this.paymentGatewayService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment transaction by id' })
  findOne(@Param('id') id: string) {
    return this.paymentGatewayService.findOne(id);
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify payment status' })
  verify(@Param('id') id: string) {
    return this.paymentGatewayService.verify(id);
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Refund payment' })
  refund(@Param('id') id: string) {
    return this.paymentGatewayService.refund(id);
  }

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Handle webhook' })
  webhook(@Body() dto: WebhookDto) {
    return this.paymentGatewayService.handleWebhook(dto);
  }
}
