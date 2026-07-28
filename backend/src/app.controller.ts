import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('app')
@Controller()
export class AppController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Root endpoint' })
  getHello() {
    return {
      name: 'Stiqr Backend',
      version: '1.0.0',
      status: 'online',
      timestamp: new Date().toISOString(),
    };
  }
}
