import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as Record<string, unknown>;
        message = (res.message as string) || message;
        error = (res.error as string) || error;
      }
    } else if (this.isPrismaError(exception)) {
      const pe = exception as PrismaClientKnownRequestError;
      if (pe.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'A record with this value already exists';
        error = 'DUPLICATE_ENTRY';
      } else if (pe.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
        error = 'NOT_FOUND';
      } else {
        this.logger.error(`Prisma error ${pe.code}: ${pe.message}`);
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
    }

    const logLine = `${request.method} ${request.url} → ${status} | ${message}`;
    if (status >= 500) {
      this.logger.error(logLine, exception instanceof Error ? exception.stack : String(exception));
    } else if (status >= 400) {
      this.logger.warn(logLine);
    }

    return response.status(status).json({
      success: false,
      error,
      message,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private isPrismaError(e: unknown): e is PrismaClientKnownRequestError {
    return typeof e === 'object' && e !== null && 'code' in e && 'clientVersion' in e;
  }
}
