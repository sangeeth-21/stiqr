import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApiManagementService } from './api-management.service';
import { CreateAPIKeyDto } from './dto/create-api-key.dto';
import { CreateWebhookDto } from './dto/create-webhook.dto';

@ApiTags('api-management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api-management')
export class ApiManagementController {
  constructor(private readonly service: ApiManagementService) {}

  @Post('keys')
  @ApiOperation({ summary: 'Create API key' })
  createKey(@Body() dto: CreateAPIKeyDto) { return this.service.createKey(dto); }

  @Get('keys')
  @ApiOperation({ summary: 'List API keys' })
  listKeys(@Query('shopId') shopId?: string, @Query('isActive') isActive?: string) {
    return this.service.listKeys({ shopId, isActive });
  }

  @Get('keys/:id')
  @ApiOperation({ summary: 'Get API key' })
  getKey(@Param('id') id: string) { return this.service.getKey(id); }

  @Delete('keys/:id')
  @ApiOperation({ summary: 'Revoke API key' })
  revokeKey(@Param('id') id: string) { return this.service.revokeKey(id); }

  @Post('webhooks')
  @ApiOperation({ summary: 'Create webhook' })
  createWebhook(@Body() dto: CreateWebhookDto) { return this.service.createWebhook(dto); }

  @Get('webhooks')
  @ApiOperation({ summary: 'List webhooks' })
  listWebhooks(@Query('shopId') shopId?: string, @Query('isActive') isActive?: string) {
    return this.service.listWebhooks({ shopId, isActive });
  }

  @Get('webhooks/:id')
  @ApiOperation({ summary: 'Get webhook' })
  getWebhook(@Param('id') id: string) { return this.service.getWebhook(id); }

  @Patch('webhooks/:id')
  @ApiOperation({ summary: 'Update webhook' })
  updateWebhook(@Param('id') id: string, @Body() dto: any) { return this.service.updateWebhook(id, dto); }

  @Delete('webhooks/:id')
  @ApiOperation({ summary: 'Delete webhook' })
  deleteWebhook(@Param('id') id: string) { return this.service.deleteWebhook(id); }

  @Post('webhooks/:id/test')
  @ApiOperation({ summary: 'Test webhook' })
  testWebhook(@Param('id') id: string) { return this.service.testWebhook(id); }

  @Get('webhooks/:id/deliveries')
  @ApiOperation({ summary: 'List webhook deliveries' })
  listDeliveries(@Param('id') id: string) { return this.service.listDeliveries(id); }
}
