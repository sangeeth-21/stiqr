import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ErrorTrackingService } from './error-tracking.service';
import { LogErrorDto } from './dto/log-error.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('error-tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('errors')
export class ErrorTrackingController {
  constructor(private errorTrackingService: ErrorTrackingService) {}

  @Post()
  @ApiOperation({ summary: 'Log an error' })
  logError(@Body() dto: LogErrorDto) {
    return this.errorTrackingService.logError(dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get error statistics' })
  getStats() {
    return this.errorTrackingService.getStats();
  }

  @Get()
  @ApiOperation({ summary: 'List errors with filters' })
  listErrors(@Query() query: any) {
    return this.errorTrackingService.listErrors(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get error by ID' })
  getError(@Param('id') id: string) {
    return this.errorTrackingService.getError(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Resolve an error' })
  resolveError(@Param('id') id: string) {
    return this.errorTrackingService.resolveError(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an error' })
  deleteError(@Param('id') id: string) {
    return this.errorTrackingService.deleteError(id);
  }
}
