import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Check application health' })
  check() {
    return this.healthService.check();
  }

  @Public()
  @Get('database')
  @ApiOperation({ summary: 'Check database health' })
  checkDatabase() {
    return this.healthService.checkDatabase();
  }

  @Public()
  @Get('redis')
  @ApiOperation({ summary: 'Check Redis health' })
  checkRedis() {
    return this.healthService.checkRedis();
  }

  @Public()
  @Get('metrics')
  @ApiOperation({ summary: 'Get system metrics' })
  getMetrics() {
    return this.healthService.getMetrics();
  }

  @Public()
  @Get('version')
  @ApiOperation({ summary: 'Get app version' })
  getVersion() {
    return { version: '1.0.0', name: 'stiqr-backend', uptime: process.uptime() };
  }

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Get app status' })
  getStatus() {
    return { status: 'online', timestamp: new Date().toISOString() };
  }
}
