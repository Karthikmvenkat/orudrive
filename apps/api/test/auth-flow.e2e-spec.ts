import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";

const describeWithDatabase = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip;

/**
 * Runs against a real PostgreSQL database when TEST_DATABASE_URL is set and
 * migrations are applied. Skipped otherwise so unit tests stay hermetic.
 */
describeWithDatabase("Auth flow against PostgreSQL (integration)", () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication["getHttpServer"]>;
  const prisma = new PrismaClient();
  const email = `e2e-${Date.now()}@savarigo.test`;
  const password = "SavariGo@2026";

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
    await app.init();
    http = app.getHttpServer();
  }, 60_000);

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
    await app?.close();
  });

  it("registers, verifies, logs in and rotates refresh tokens", async () => {
    const registration = await request(http)
      .post("/api/v1/auth/register")
      .send({
        email,
        password,
        fullName: "E2E Rider",
        phone: `9${Date.now().toString().slice(-9)}`,
      })
      .expect(201);

    expect(registration.body.user.email).toBe(email);
    const code = registration.body.verification?.devCode as string | undefined;
    expect(code).toMatch(/^\d{6}$/);

    await request(http)
      .post("/api/v1/auth/verify-otp")
      .send({ email, purpose: "EMAIL_VERIFICATION", code })
      .expect(200);

    const login = await request(http)
      .post("/api/v1/auth/login")
      .send({ email, password })
      .expect(200);

    expect(login.body.accessToken).toBeDefined();
    expect(login.body.refreshToken).toBeDefined();

    const me = await request(http)
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(me.body.email).toBe(email);

    const refreshed = await request(http)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: login.body.refreshToken })
      .expect(200);
    expect(refreshed.body.refreshToken).not.toBe(login.body.refreshToken);

    // Replaying the rotated token is rejected.
    await request(http)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: login.body.refreshToken })
      .expect(401);
  }, 60_000);
});
