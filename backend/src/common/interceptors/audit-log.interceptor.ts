import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';

const ACTION_MAP: Record<string, string> = {
  GET: 'READ',
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;
    const path = request.route?.path || request.path;
    const user = (request as any).user;
    const ipAddress = request.ip;
    const userAgent = request.get('user-agent');

    const action = ACTION_MAP[method] || method;
    const entity = path.split('/').filter(Boolean)[0] || 'unknown';

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Date.now() - startTime;
          this.createAuditLog({
            userId: user?.id,
            action,
            entity,
            entityId: this.extractEntityId(path, request.params),
            ipAddress,
            userAgent,
            metadata: { responseTime, statusCode: context.switchToHttp().getResponse().statusCode },
          });
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          this.createAuditLog({
            userId: user?.id,
            action: `${action}_FAILED`,
            entity,
            entityId: this.extractEntityId(path, request.params),
            ipAddress,
            userAgent,
            metadata: { responseTime, error: error.message },
          });
        },
      }),
    );
  }

  private extractEntityId(path: string, params: any): string | undefined {
    const segments = path.split('/').filter(Boolean);
    for (let i = 0; i < segments.length; i++) {
      if (segments[i].startsWith(':') && params[segments[i].slice(1)]) {
        return params[segments[i].slice(1)];
      }
    }
    return undefined;
  }

  private async createAuditLog(data: {
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          newValues: data.metadata ? JSON.stringify(data.metadata) : undefined,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create audit log', error);
    }
  }
}
