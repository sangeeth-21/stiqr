import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { BackupService } from './backup.service';
import { CreateBackupDto } from './dto/create-backup.dto';

@ApiTags('backup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('backup')
export class BackupController {
  constructor(private readonly service: BackupService) {}

  @Post()
  @ApiOperation({ summary: 'Create backup' })
  create(@Body() dto: CreateBackupDto) { return this.service.create(dto); }

  @Get()
  @ApiOperation({ summary: 'List backups' })
  list(@Query('type') type?: string, @Query('status') status?: string) {
    return this.service.list({ type, status });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Backup statistics' })
  getStats() { return this.service.getStats(); }

  @Get(':id')
  @ApiOperation({ summary: 'Get backup' })
  getOne(@Param('id') id: string) { return this.service.getOne(id); }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete backup' })
  delete(@Param('id') id: string) { return this.service.delete(id); }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore from backup' })
  restore(@Param('id') id: string) { return this.service.restore(id); }
}
