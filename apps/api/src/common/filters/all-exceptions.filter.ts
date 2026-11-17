import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";

interface ErrorBody {
  statusCode: number;
  error: string;
  code: string;
  message: string;
  details?: unknown;
  path: string;
  method: string;
  timestamp: string;
  requestId: string;
}

const STATUS_NAMES: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
  503: "Service Unavailable",
};

function prismaCode(exception: unknown): string | undefined {
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    const metaCode = exception.meta?.code;
    if (typeof metaCode === "string" && metaCode === "23P01") return "23P01";
    return exception.code;
  }
  if (exception instanceof Error && exception.message.includes("23P01")) {
    return "23P01";
  }
  return undefined;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter");

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    const requestId =
      (request.headers["x-request-id"] as string | undefined) ?? randomUUID();
    response.setHeader("x-request-id", requestId);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "INTERNAL_ERROR";
    let message = "An unexpected error occurred";
    let details: unknown;
    let errorName = "Internal Server Error";
    let domainCode = false;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      errorName = STATUS_NAMES[status] ?? exception.name;
      const body = exception.getResponse();
      if (typeof body === "string") {
        message = body;
      } else if (body && typeof body === "object") {
        const record = body as Record<string, unknown>;
        const rawMessage = record.message;
        if (Array.isArray(rawMessage)) {
          message = "Validation failed";
          details = rawMessage;
          code = "VALIDATION_ERROR";
        } else if (typeof rawMessage === "string") {
          message = rawMessage;
        }
        if (typeof record.code === "string") {
          code = record.code;
          domainCode = true;
        }
        if (record.details !== undefined) details = record.details;
      }
      if (
        status === HttpStatus.BAD_REQUEST &&
        !details &&
        code === "INTERNAL_ERROR"
      ) {
        code = "BAD_REQUEST";
      }
      // The status-derived codes are defaults: an exception that already names
      // its failure keeps that code, as documented in docs/api.md.
      if (!domainCode) {
        if (status === HttpStatus.UNAUTHORIZED) code = "UNAUTHORIZED";
        if (status === HttpStatus.FORBIDDEN) code = "FORBIDDEN";
        if (status === HttpStatus.NOT_FOUND) code = "NOT_FOUND";
      }
      if (status === HttpStatus.TOO_MANY_REQUESTS) code = "RATE_LIMITED";
    } else {
      const prisma = prismaCode(exception);
      if (prisma === "23P01") {
        status = HttpStatus.CONFLICT;
        errorName = "Conflict";
        code = "BOOKING_CONFLICT";
        message = "The selected vehicle is already reserved for part of that period";
      } else if (prisma === "P2002") {
        status = HttpStatus.CONFLICT;
        errorName = "Conflict";
        code = "DUPLICATE_RECORD";
        message = "A record with those unique values already exists";
        const target = (exception as Prisma.PrismaClientKnownRequestError).meta
          ?.target;
        if (target) details = target;
      } else if (prisma === "P2025") {
        status = HttpStatus.NOT_FOUND;
        errorName = "Not Found";
        code = "NOT_FOUND";
        message = "The requested record does not exist";
      } else if (prisma === "P2003" || prisma === "P2014") {
        status = HttpStatus.CONFLICT;
        errorName = "Conflict";
        code = "RELATION_CONFLICT";
        message = "The operation conflicts with related records";
      } else if (exception instanceof Prisma.PrismaClientValidationError) {
        status = HttpStatus.BAD_REQUEST;
        errorName = "Bad Request";
        code = "INVALID_QUERY";
        message = "The request could not be mapped to the data model";
      } else {
        this.logger.error(
          `Unhandled error on ${request.method} ${request.originalUrl}`,
          exception instanceof Error ? exception.stack : String(exception),
        );
      }
    }

    const body: ErrorBody = {
      statusCode: status,
      error: errorName,
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      path: request.originalUrl,
      method: request.method,
      timestamp: new Date().toISOString(),
      requestId,
    };

    response.status(status).json(body);
  }
}
