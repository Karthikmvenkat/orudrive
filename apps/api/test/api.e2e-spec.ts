import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";

describe("SavariGo API (e2e)", () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication["getHttpServer"]>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle("SavariGo API").setVersion("test").build(),
    );
    SwaggerModule.setup("docs", app, document);
    await app.init();
    http = app.getHttpServer();
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  it("reports health even without a database", async () => {
    const response = await request(http).get("/api/v1/health").expect(200);

    expect(["ok", "degraded"]).toContain(response.body.status);
    expect(response.body.service).toBe("savarigo-api");
  }, 30_000);

  it("rejects unauthenticated access with the error envelope", async () => {
    const response = await request(http).get("/api/v1/bookings/me").expect(401);
    expect(response.body).toMatchObject({
      statusCode: 401,
      code: "UNAUTHORIZED",
      path: "/api/v1/bookings/me",
    });
    expect(response.body.requestId).toBeDefined();
  });

  it("rejects unknown fields before touching the database", async () => {
    const response = await request(http)
      .post("/api/v1/auth/register")
      .send({ email: "not-an-email", password: "short", unexpected: true })
      .expect(400);

    expect(response.body.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(response.body.details)).toBe(true);
  });

  it("refuses a webhook without a signature", async () => {
    const response = await request(http)
      .post("/api/v1/payments/webhook")
      .send({ event: "payment.captured" })
      .expect(400);
    expect(response.body.code).toBe("WEBHOOK_SIGNATURE_MISSING");
  });

  it("exposes the OpenAPI document with all modules", async () => {
    const response = await request(http).get("/docs-json").expect(200);
    expect(response.body.info.title).toBe("SavariGo API");
    const paths = Object.keys(response.body.paths);
    expect(paths).toEqual(
      expect.arrayContaining([
        "/api/v1/auth/login",
        "/api/v1/vehicles",
        "/api/v1/bookings",
        "/api/v1/payments/orders",
        "/api/v1/coupons/validate",
        "/api/v1/reviews/vehicle/{idOrSlug}",
        "/api/v1/notifications",
        "/api/v1/admin/overview",
      ]),
    );
  });
});
