import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LocalizationService } from './localization.service';
import { CreateTranslationDto } from './dto/create-translation.dto';
import { BulkTranslationDto } from './dto/bulk-translation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('localization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('localization')
export class LocalizationController {
  constructor(private localizationService: LocalizationService) {}

  @Post('translations')
  @ApiOperation({ summary: 'Create or upsert a translation' })
  createTranslation(@Body() dto: CreateTranslationDto) {
    return this.localizationService.createTranslation(dto);
  }

  @Post('translations/bulk')
  @ApiOperation({ summary: 'Bulk create translations' })
  bulkCreateTranslations(@Body() dto: BulkTranslationDto) {
    return this.localizationService.bulkCreateTranslations(dto);
  }

  @Get('translations')
  @ApiOperation({ summary: 'List translations with filters' })
  listTranslations(@Query() query: any) {
    return this.localizationService.listTranslations(query);
  }

  @Get('translations/:id')
  @ApiOperation({ summary: 'Get a single translation' })
  getTranslation(@Param('id') id: string) {
    return this.localizationService.getTranslation(id);
  }

  @Delete('translations/:id')
  @ApiOperation({ summary: 'Delete a translation' })
  deleteTranslation(@Param('id') id: string) {
    return this.localizationService.deleteTranslation(id);
  }

  @Get('languages')
  @ApiOperation({ summary: 'List distinct languages' })
  listLanguages() {
    return this.localizationService.listLanguages();
  }

  @Get('export/:language')
  @ApiOperation({ summary: 'Export all translations for a language' })
  exportByLanguage(@Param('language') language: string) {
    return this.localizationService.exportByLanguage(language);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get localization statistics' })
  getStats() {
    return this.localizationService.getStats();
  }
}
