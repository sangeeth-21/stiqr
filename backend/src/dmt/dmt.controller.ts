import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { DmtService } from './dmt.service';

@ApiTags('dmt')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dmt')
export class DmtController {
  constructor(private readonly dmtService: DmtService) {}

  @Post('senders')
  @ApiOperation({ summary: 'Register DMT sender' })
  registerSender(@Body() body: any) { return this.dmtService.registerSender(body); }

  @Get('senders')
  @ApiOperation({ summary: 'List DMT senders' })
  listSenders(@Query('shopId') shopId: string) { return this.dmtService.findAllSenders(shopId); }

  @Get('senders/:id')
  @ApiOperation({ summary: 'Get DMT sender' })
  getSender(@Param('id') id: string) { return this.dmtService.findOneSender(id); }

  @Patch('senders/:id/verify')
  @ApiOperation({ summary: 'Verify sender OTP' })
  verifySender(@Param('id') id: string, @Body('otp') otp: string) { return this.dmtService.verifySender(id, otp); }

  @Post('beneficiaries')
  @ApiOperation({ summary: 'Add beneficiary' })
  addBeneficiary(@Body() body: any) { return this.dmtService.addBeneficiary(body); }

  @Get('beneficiaries')
  @ApiOperation({ summary: 'List beneficiaries' })
  listBeneficiaries(@Query('senderId') senderId: string) { return this.dmtService.findAllBeneficiaries(senderId); }

  @Patch('beneficiaries/:id/verify')
  @ApiOperation({ summary: 'Verify beneficiary' })
  verifyBeneficiary(@Param('id') id: string) { return this.dmtService.verifyBeneficiary(id); }

  @Delete('beneficiaries/:id')
  @ApiOperation({ summary: 'Delete beneficiary' })
  deleteBeneficiary(@Param('id') id: string) { return this.dmtService.deleteBeneficiary(id); }

  @Post('transfers')
  @ApiOperation({ summary: 'Transfer money' })
  transfer(@Body() body: any) { return this.dmtService.createTransfer(body); }

  @Get('transfers')
  @ApiOperation({ summary: 'List transfers' })
  listTransfers(@Query('shopId') shopId: string, @Query('senderId') senderId: string, @Query('status') status: string) {
    return this.dmtService.findAllTransfers(shopId, senderId, status);
  }

  @Get('transfers/:id')
  @ApiOperation({ summary: 'Get transfer' })
  getTransfer(@Param('id') id: string) { return this.dmtService.findOneTransfer(id); }

  @Post('transfers/:id/status')
  @ApiOperation({ summary: 'Update transfer status' })
  updateTransferStatus(@Param('id') id: string, @Body() body: any) { return this.dmtService.updateTransferStatus(id, body); }
}
