import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { Request } from "express";
import { Observable, tap } from "rxjs";
import type { AuthUser } from "../decorators/current-user.decorator";
import { clientIp } from "../security/client-ip";
import { AuditService } from "./audit.service";

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const path = request.originalUrl.split("?")[0];
    const user = request.user;

    // Bodies are intentionally not logged: they may contain passwords or OTPs.
    if (
      !user ||
      READ_METHODS.has(request.method) ||
      !path.startsWith("/api/v1/") ||
      path.includes("/auth/") ||
      path.includes("/webhook")
    ) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        const segments = path.split("/").filter(Boolean);
        void this.audit.record({
          actorId: user.id,
          action: `${request.method} ${path}`,
          entityType: segments[2] ?? "unknown",
          entityId:
            typeof request.params?.id === "string" ? request.params.id : null,
          ipAddress: clientIp(request),
          userAgent: request.headers["user-agent"] ?? null,
        });
      }),
    );
  }
}
