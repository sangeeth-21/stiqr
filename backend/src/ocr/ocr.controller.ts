import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OcrService } from './ocr.service';
import { ProcessDocumentDto } from './dto/process-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('ocr')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ocr')
export class OcrController {
  constructor(private ocrService: OcrService) {}

  @Post('documents')
  @ApiOperation({ summary: 'Submit a document for OCR processing' })
  submitDocument(@Body() dto: ProcessDocumentDto) {
    return this.ocrService.submitDocument(dto);
  }

  @Get('documents')
  @ApiOperation({ summary: 'List OCR documents with filters' })
  listDocuments(@Query() query: any) {
    return this.ocrService.listDocuments(query);
  }

  @Get('documents/:id')
  @ApiOperation({ summary: 'Get document details' })
  getDocument(@Param('id') id: string) {
    return this.ocrService.getDocument(id);
  }

  @Patch('documents/:id')
  @ApiOperation({ summary: 'Update a document' })
  updateDocument(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.ocrService.updateDocument(id, dto);
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Delete a document' })
  deleteDocument(@Param('id') id: string) {
    return this.ocrService.deleteDocument(id);
  }

  @Post('documents/:id/process')
  @ApiOperation({ summary: 'Process a document (mock OCR)' })
  processDocument(@Param('id') id: string) {
    return this.ocrService.processDocument(id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get OCR statistics' })
  getStats(@Query('shopId') shopId?: string) {
    return this.ocrService.getStats(shopId);
  }
}
