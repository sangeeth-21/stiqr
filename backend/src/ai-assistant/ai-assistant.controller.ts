import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AiAssistantService } from './ai-assistant.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai')
export class AiAssistantController {
  constructor(private aiAssistantService: AiAssistantService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new AI conversation' })
  createConversation(@Body() dto: CreateConversationDto) {
    return this.aiAssistantService.createConversation(dto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List conversations with filters' })
  listConversations(@Query() query: any) {
    return this.aiAssistantService.listConversations(query);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation with messages' })
  getConversation(@Param('id') id: string) {
    return this.aiAssistantService.getConversation(id);
  }

  @Patch('conversations/:id')
  @ApiOperation({ summary: 'Update a conversation' })
  updateConversation(@Param('id') id: string, @Body() body: any) {
    return this.aiAssistantService.updateConversation(id, body);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Delete a conversation' })
  deleteConversation(@Param('id') id: string) {
    return this.aiAssistantService.deleteConversation(id);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  sendMessage(@Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.aiAssistantService.sendMessage(id, dto);
  }

  @Get('predictions')
  @ApiOperation({ summary: 'List AI predictions' })
  listPredictions(@Query() query: any) {
    return this.aiAssistantService.listPredictions(query);
  }

  @Post('predictions')
  @ApiOperation({ summary: 'Create an AI prediction' })
  createPrediction(@Body() body: any) {
    return this.aiAssistantService.createPrediction(body);
  }

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze text (mock)' })
  analyze(@Body() body: { text: string }) {
    return this.aiAssistantService.analyze(body.text);
  }

  @Post('chat')
  @ApiOperation({ summary: 'Chat with AI assistant (mock)' })
  chat(@Body() body: { message: string; userId: string; shopId?: string }) {
    return this.aiAssistantService.chat(body.message, body.userId, body.shopId);
  }
}
