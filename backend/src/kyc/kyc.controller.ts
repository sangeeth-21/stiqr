import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { KycService } from './kyc.service';
import { CreateKycDto } from './dto/create-kyc.dto';
import { UpdateKycDto } from './dto/update-kyc.dto';
import { VerifyKycDto } from './dto/verify-kyc.dto';
import { RejectKycDto } from './dto/reject-kyc.dto';
import { AddKycDocumentDto } from './dto/add-kyc-document.dto';

@ApiTags('kyc')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post()
  @ApiOperation({ summary: 'Create KYC record' })
  create(@Body() dto: CreateKycDto) {
    return this.kycService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List KYC records' })
  @ApiQuery({ name: 'shopId', required: false })
  @ApiQuery({ name: 'holderType', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(@Query() query: { shopId?: string; holderType?: string; status?: string }) {
    return this.kycService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get KYC by id' })
  findOne(@Param('id') id: string) {
    return this.kycService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update KYC details' })
  update(@Param('id') id: string, @Body() dto: UpdateKycDto) {
    return this.kycService.update(id, dto);
  }

  @Patch(':id/verify')
  @ApiOperation({ summary: 'Approve KYC' })
  verify(@Param('id') id: string, @Body() dto: VerifyKycDto) {
    return this.kycService.verify(id, dto.verifiedBy);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject KYC' })
  reject(@Param('id') id: string, @Body() dto: RejectKycDto) {
    return this.kycService.reject(id, dto.rejectionReason, dto.reviewedBy);
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'Add KYC document' })
  addDocument(@Param('id') id: string, @Body() dto: AddKycDocumentDto) {
    return this.kycService.addDocument(id, dto);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'List KYC documents' })
  listDocuments(@Param('id') id: string) {
    return this.kycService.listDocuments(id);
  }
}
