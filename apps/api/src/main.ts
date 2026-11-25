import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { NestExpressApplication } from "@nestjs/platform-express";
import {
  ValidationPipe,
  Logger,
  type RawBodyRequest,
} from "@nestjs/common";
import express, { type NextFunction, type Request, type Response } from "express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import {
  applyHttpSecurity,
  resolveHttpSecurityOptions,
} from "./common/security/http-security";

async function bootstrap() {
  // rawBody is required for Razorpay webhook signature verification.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: false,
    rawBody: true,
  });
  const config = app.get(ConfigService);
  const logger = new Logger("Bootstrap");

  app.setGlobalPrefix("api/v1");

  // A partner application carries two base64 documents, far past the 100 KB
  // default. Express 5 path-mounted parsers silently disable Nest's global
  // body parsing, so one dispatcher picks the limit per path instead; the
  // verify hook keeps rawBody intact for the Razorpay webhook signature.
  const captureRawBody = (request: Request, _response: unknown, buffer: Buffer) => {
    (request as RawBodyRequest<Request>).rawBody = buffer;
  };
  const applyParser = express.json({ limit: "8mb", verify: captureRawBody });
  const defaultParser = express.json({ limit: "100kb", verify: captureRawBody });
  app.use((request: Request, response: Response, next: NextFunction) =>
    request.path === "/api/v1/partners/apply"
      ? applyParser(request, response, next)
      : defaultParser(request, response, next),
  );

  applyHttpSecurity(app, resolveHttpSecurityOptions(config));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  const swagger = new DocumentBuilder()
    .setTitle("SavariGo API")
    .setDescription(
      [
        "SavariGo self-drive rentals, bike taxis and driver services.",
        "",
        "All routes are versioned under /api/v1. Authenticate with the access token from",
        "`POST /auth/login` using the Authorize button (Bearer). Refresh tokens rotate on",
        "every `POST /auth/refresh`; a replayed refresh token revokes the whole chain.",
        "",
        "Errors follow a single envelope: `{ statusCode, error, code, message, details?, path, method, timestamp, requestId }`.",
        "Use `code` for machine handling.",
      ].join("\n"),
    )
    .setVersion("0.3.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Access token from /auth/login or /auth/refresh",
      },
      "bearer",
    )
    .addServer("/api/v1", "API v1")
    .addTag("health", "Liveness and database readiness")
    .addTag("auth", "Registration, login, tokens, OTP and password reset")
    .addTag("users", "Profile and staff user administration")
    .addTag("customers", "Customer profile and licence details")
    .addTag("drivers", "Driver onboarding, availability and booking requests")
    .addTag("vehicles", "Fleet listing, search and management")
    .addTag("categories", "Vehicle categories")
    .addTag("locations", "Pickup and drop hubs")
    .addTag("availability", "Vehicle calendar and manual blocks")
    .addTag("pricing", "Day rates and discount plans")
    .addTag("coupons", "Discount codes and validation")
    .addTag("bookings", "Quotes, reservations and lifecycle")
    .addTag("payments", "Razorpay orders, verification, webhooks and refunds")
    .addTag("notifications", "In-app and email notifications")
    .addTag("reviews", "Verified rental reviews")
    .addTag("admin", "Dashboard, audit log, settings and roles")
    .build();

  const document = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup("docs", app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = Number(config.get<string>("PORT") ?? 4000);
  await app.listen(port, "0.0.0.0");
  logger.log(`SavariGo API listening on http://localhost:${port}/api/v1`);
  logger.log(`Swagger UI at http://localhost:${port}/docs`);
}

void bootstrap();
