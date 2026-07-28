import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggingService } from './logging.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private loggingService: LoggingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, ip, headers, user, body } = req;
    const now = Date.now();

    return next.handle().pipe(
      tap(async (response) => {
        const responseTime = Date.now() - now;
        const res = context.switchToHttp().getResponse();

        try {
          await this.loggingService.logApiCall({
            method,
            path: url,
            statusCode: res.statusCode,
            responseTime,
            ipAddress: ip,
            userAgent: headers['user-agent'],
            userId: user?.id,
            requestBody: method !== 'GET' ? body : undefined,
          });
        } catch {}
      }),
    );
  }
}
