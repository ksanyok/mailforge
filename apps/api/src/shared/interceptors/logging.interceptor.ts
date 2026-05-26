import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const { method, url, body, user } = req;
    const userId = user?.id ?? 'anon';
    const start = Date.now();

    const bodyLog = body && Object.keys(body).length
      ? JSON.stringify(this.sanitizeBody(body)).slice(0, 500)
      : '';

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        const status = context.switchToHttp().getResponse().statusCode;
        this.logger.log(`${method} ${url} [${status}] ${ms}ms user=${userId}${bodyLog ? ' body=' + bodyLog : ''}`);
      }),
      catchError((err) => {
        const ms = Date.now() - start;
        const status = err?.status ?? 500;
        const message = err?.message ?? String(err);
        this.logger.error(
          `${method} ${url} [${status}] ${ms}ms user=${userId} — ${message}${bodyLog ? ' body=' + bodyLog : ''}`,
        );
        return throwError(() => err);
      }),
    );
  }

  private sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
    const sensitive = ['password', 'smtpPassword', 'token', 'refreshToken', 'accessToken'];
    const result = { ...body };
    for (const key of sensitive) {
      if (key in result) result[key] = '***';
    }
    return result;
  }
}
