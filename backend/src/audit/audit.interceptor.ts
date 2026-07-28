import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, user, ip, body } = req;

    const methodToAction: Record<string, string> = {
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };

    const action = methodToAction[method];
    if (!action) return next.handle();

    return next.handle().pipe(
      tap(async () => {
        try {
          await this.auditService.log({
            userId: user?.id,
            action: action as any,
            entity: this.extractEntity(url),
            newValues: body,
            ipAddress: ip,
            userAgent: req.headers['user-agent'],
          });
        } catch {}
      }),
    );
  }

  private extractEntity(url: string): string {
    const parts = url.split('/').filter(Boolean);
    return parts[1] || 'unknown';
  }
}
