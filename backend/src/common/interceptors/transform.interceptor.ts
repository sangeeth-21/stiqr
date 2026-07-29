import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, any>;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const response = context.switchToHttp().getResponse();
    return next.handle().pipe(
      map((payload) => {
        if (!payload || payload.data !== undefined) {
          return payload;
        }

        const meta: Record<string, any> = { timestamp: new Date().toISOString() };

        if (payload?.pagination) {
          meta.pagination = payload.pagination;
          const { pagination, ...rest } = payload;
          return { data: rest, meta };
        }

        return { data: payload, meta };
      }),
    );
  }
}
