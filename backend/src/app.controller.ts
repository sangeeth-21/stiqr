import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello(): object {
    return {
      message: 'Hello World from Stiqr Backend!',
      framework: 'NestJS + TypeScript + Prisma ORM + PostgreSQL + Redis',
      status: 'online',
      timestamp: new Date().toISOString(),
    };
  }
}
