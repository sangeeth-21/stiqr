import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { BbpsService } from './bbps.service';

@ApiTags('bbps')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bbps')
export class BbpsController {
  constructor(private readonly bbpsService: BbpsService) {}

  @Post('billers')
  @ApiOperation({ summary: 'Create BBPS biller' })
  createBiller(@Body() body: any) { return this.bbpsService.createBiller(body); }

  @Get('billers')
  @ApiOperation({ summary: 'List BBPS billers' })
  listBillers(@Query('category') category: string, @Query('isActive') isActive: string) {
    return this.bbpsService.findAllBillers(category, isActive === 'true' ? true : isActive === 'false' ? false : undefined);
  }

  @Get('billers/:id')
  @ApiOperation({ summary: 'Get BBPS biller' })
  getBiller(@Param('id') id: string) { return this.bbpsService.findOneBiller(id); }

  @Post('payments')
  @ApiOperation({ summary: 'Pay bill via BBPS' })
  payBill(@Body() body: any) { return this.bbpsService.createPayment(body); }

  @Get('payments')
  @ApiOperation({ summary: 'List BBPS payments' })
  listPayments(@Query('shopId') shopId: string, @Query('status') status: string) {
    return this.bbpsService.findAllPayments(shopId, status);
  }

  @Get('payments/:id')
  @ApiOperation({ summary: 'Get BBPS payment' })
  getPayment(@Param('id') id: string) { return this.bbpsService.findOnePayment(id); }

  @Post('payments/:id/status')
  @ApiOperation({ summary: 'Update BBPS payment status' })
  updateStatus(@Param('id') id: string, @Body() body: any) { return this.bbpsService.updatePaymentStatus(id, body); }
}
