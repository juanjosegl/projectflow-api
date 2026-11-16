import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { inspect } from 'util';

interface ErrorDescription {
  status: number;
  message: string | string[];
}

// Prisma errors that are the client's fault, so they map to 4xx instead of a generic 500.
const PRISMA_ERRORS: Record<string, ErrorDescription> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    message: 'A record with this value already exists',
  },
  P2003: {
    status: HttpStatus.BAD_REQUEST,
    message: 'A related record does not exist',
  },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'Record not found' },
};

/** Every error leaves the API as `{ success: false, statusCode, message, path, timestamp }`. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const { status, message } = describe(exception);

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.url}`,
        exception instanceof Error ? exception.stack : inspect(exception),
      );
    }

    res.status(status).json({
      success: false,
      statusCode: status,
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}

export function describe(exception: unknown): ErrorDescription {
  if (exception instanceof HttpException) {
    const body = exception.getResponse();
    const message =
      typeof body === 'string'
        ? body
        : ((body as { message?: string | string[] }).message ??
          exception.message);
    return { status: exception.getStatus(), message };
  }
  if (
    exception instanceof Prisma.PrismaClientKnownRequestError &&
    PRISMA_ERRORS[exception.code]
  ) {
    return PRISMA_ERRORS[exception.code];
  }
  // Never leak internals (SQL, stack traces) to the client.
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
  };
}
