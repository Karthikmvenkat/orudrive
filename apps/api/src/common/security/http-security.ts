import { INestApplication, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export interface HttpSecurityOptions {
  corsOrigins: string[];
  trustProxyHops: number;
}

export function resolveHttpSecurityOptions(config: ConfigService): HttpSecurityOptions {
  const corsOrigins = (
    config.get<string>("CORS_ORIGINS") ?? "http://localhost:3000,http://localhost:3001"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const hops = Number(config.get<string>("TRUST_PROXY_HOPS") ?? 0);

  return {
    corsOrigins,
    trustProxyHops: Number.isInteger(hops) && hops > 0 ? hops : 0,
  };
}

/**
 * The HTTP hardening the deployed API is expected to carry. It lives here, and
 * is applied by both `main.ts` and the e2e harness, so a test can never pass
 * against a bare app that a real request would not get.
 */
export function applyHttpSecurity(
  app: INestApplication,
  options: HttpSecurityOptions,
): void {
  const logger = new Logger("HttpSecurity");

  app.use(
    helmet({
      // The Swagger UI at /docs ships inline scripts and loads its assets from a
      // CDN, so a document policy that blocked those would break the docs.
      contentSecurityPolicy: false,
      referrerPolicy: { policy: "no-referrer" },
      crossOriginResourcePolicy: { policy: "same-site" },
      strictTransportSecurity: { maxAge: 31_536_000, includeSubDomains: true },
    }),
  );

  app.use((request: Request, response: Response, next: NextFunction) => {
    const incoming = request.headers["x-request-id"];
    const requestId =
      typeof incoming === "string" && incoming.length <= 100 ? incoming : randomUUID();
    request.headers["x-request-id"] = requestId;
    response.setHeader("x-request-id", requestId);
    next();
  });

  // Behind a reverse proxy every request arrives from the proxy's own address,
  // so the forwarded client IP has to be trusted for the rate limiter and the
  // audit log to key on the caller. Left off locally, where trusting that header
  // would hand anyone a way to forge their address and step around the limits.
  if (options.trustProxyHops > 0) {
    (app as unknown as NestExpressApplication).set(
      "trust proxy",
      options.trustProxyHops,
    );
    logger.log(`trusting ${options.trustProxyHops} proxy hop(s) for client addresses`);
  }

  app.enableCors({ origin: options.corsOrigins, credentials: true });
}
