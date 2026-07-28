import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiAssistantService {
  constructor(private prisma: PrismaService) {}

  async createConversation(data: any) {
    return this.prisma.aIConversation.create({
      data: {
        shopId: data.shopId,
        userId: data.userId || 'system',
        title: data.title,
        model: data.model,
        status: 'ACTIVE',
      },
    });
  }

  async listConversations(query: any) {
    const { shopId, userId, page = 1, limit = 20 } = query;
    const where: any = {};

    if (shopId) where.shopId = shopId;
    if (userId) where.userId = userId;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.aIConversation.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.aIConversation.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getConversation(id: string) {
    const conversation = await this.prisma.aIConversation.findFirst({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async updateConversation(id: string, data: any) {
    await this.getConversation(id);
    return this.prisma.aIConversation.update({ where: { id }, data });
  }

  async deleteConversation(id: string) {
    await this.getConversation(id);
    await this.prisma.aIMessage.deleteMany({ where: { conversationId: id } });
    return this.prisma.aIConversation.delete({ where: { id } });
  }

  async sendMessage(conversationId: string, data: any) {
    const conversation = await this.getConversation(conversationId);

    const tokens = data.tokens || 0;
    const message = await this.prisma.aIMessage.create({
      data: {
        conversationId,
        content: data.content,
        role: data.role || 'USER',
        tokens,
        model: data.model || conversation.model,
        latencyMs: data.latencyMs,
        metadata: data.metadata,
      },
    });

    await this.prisma.aIConversation.update({
      where: { id: conversationId },
      data: {
        messageCount: { increment: 1 },
        totalTokens: { increment: tokens },
      },
    });

    return message;
  }

  async listPredictions(query: any) {
    const { shopId, type, period, page = 1, limit = 20 } = query;
    const where: any = {};

    if (shopId) where.shopId = shopId;
    if (type) where.type = type;
    if (period) where.period = period;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.aIPrediction.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.aIPrediction.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createPrediction(data: any) {
    return this.prisma.aIPrediction.create({ data });
  }

  async analyze(text: string) {
    return {
      sentiment: 'neutral',
      confidence: 0.87,
      entities: [
        { type: 'PRODUCT', value: 'extracted product name' },
        { type: 'MONEY', value: '₹5,000' },
      ],
      summary: 'Mock analysis result for the provided text.',
      keywords: ['sales', 'inventory', 'revenue'],
      language: 'en',
    };
  }

  async chat(message: string, userId?: string, shopId?: string) {
    const conversation = await this.prisma.aIConversation.create({
      data: {
        userId: userId || 'system',
        shopId,
        title: message.substring(0, 50),
        model: 'mock-gpt',
        status: 'ACTIVE',
      },
    });

    await this.prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        content: message,
        role: 'USER',
        tokens: 0,
      },
    });

    const reply = `This is a mock AI response to: "${message}". In production, this would call a real LLM API.`;

    const assistantMessage = await this.prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        content: reply,
        role: 'ASSISTANT',
        tokens: 50,
        model: 'mock-gpt',
        latencyMs: 120,
      },
    });

    await this.prisma.aIConversation.update({
      where: { id: conversation.id },
      data: {
        messageCount: 2,
        totalTokens: 50,
      },
    });

    return {
      conversationId: conversation.id,
      message: assistantMessage,
    };
  }
}
