import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/common/filters/all-exceptions.filter";
import {
  applyHttpSecurity,
  resolveHttpSecurityOptions,
} from "../../src/common/security/http-security";
import { PrismaService } from "../../src/common/prisma/prisma.service";

export const DEMO_PASSWORD = "SavariGo@2026";
export const TEST_EMAIL_DOMAIN = "scenario.savarigo.test";

export type ScenarioHttp = ReturnType<INestApplication["getHttpServer"]>;

export interface ScenarioApp {
  app: INestApplication;
  http: ScenarioHttp;
  prisma: PrismaService;
}

export interface ScenarioResponse {
  status: number;
  body: Record<string, any>;
  text: string;
}

export interface CallOptions {
  token?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

async function call(
  http: ScenarioHttp,
  method: "get" | "post" | "patch" | "put" | "delete",
  path: string,
  options: CallOptions = {},
): Promise<ScenarioResponse> {
  const chain = (request(http) as never as Record<string, (target: string) => any>)[
    method
  ](path);
  if (options.token) chain.set("Authorization", `Bearer ${options.token}`);
  for (const [key, value] of Object.entries(options.headers ?? {})) {
    chain.set(key, value);
  }
  const response = options.body
    ? await chain.send(options.body)
    : await chain;
  return {
    status: response.status as number,
    body: (response.body ?? {}) as Record<string, any>,
    text: (response.text ?? "") as string,
  };
}

export const getApi = (
  http: ScenarioHttp,
  path: string,
  token?: string,
): Promise<ScenarioResponse> => call(http, "get", path, { token });

export const postApi = (
  http: ScenarioHttp,
  path: string,
  body?: Record<string, unknown>,
  token?: string,
): Promise<ScenarioResponse> => call(http, "post", path, { body, token });

export const patchApi = (
  http: ScenarioHttp,
  path: string,
  body: Record<string, unknown>,
  token: string,
): Promise<ScenarioResponse> => call(http, "patch", path, { body, token });

/**
 * Sends an exact byte sequence. Razorpay signs the raw request body, so the
 * bytes a webhook test signs must be the bytes it delivers.
 */
export async function postRawApi(
  http: ScenarioHttp,
  path: string,
  rawBody: string,
  headers: Record<string, string> = {},
): Promise<ScenarioResponse> {
  const chain = (
    request(http) as never as Record<string, (target: string) => any>
  ).post(path);
  chain.set("Content-Type", "application/json");
  for (const [key, value] of Object.entries(headers)) chain.set(key, value);
  const response = await chain.send(rawBody);
  return {
    status: response.status as number,
    body: (response.body ?? {}) as Record<string, any>,
    text: (response.text ?? "") as string,
  };
}

export async function bootScenarioApp(): Promise<ScenarioApp> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  // rawBody mirrors main.ts so Razorpay webhook signatures can be verified.
  const app = moduleRef.createNestApplication({ rawBody: true });
  app.setGlobalPrefix("api/v1");
  // The same HTTP hardening the deployed process carries, so a header or a
  // rate-limit assertion here describes the API that actually ships.
  applyHttpSecurity(app, resolveHttpSecurityOptions(app.get(ConfigService)));
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

  return {
    app,
    http: app.getHttpServer(),
    prisma: app.get(PrismaService),
  };
}

export interface ScenarioSession {
  email: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
}

export async function loginAs(
  http: ScenarioHttp,
  email: string,
  password = DEMO_PASSWORD,
): Promise<ScenarioSession> {
  const response = await postApi(http, "/api/v1/auth/login", {
    email,
    password,
  });
  expect(response.status).toBe(200);
  return {
    email,
    userId: response.body.user.id as string,
    accessToken: response.body.accessToken as string,
    refreshToken: response.body.refreshToken as string,
  };
}

/**
 * Registers a throwaway rider, verifies the email with the dev OTP that
 * AUTH_DEBUG_OTP exposes, and logs in so tests start from a real session.
 */
export async function createRider(
  http: ScenarioHttp,
  tag: string,
): Promise<ScenarioSession> {
  const email = `${tag}-${Date.now()}@${TEST_EMAIL_DOMAIN}`;
  const registration = await postApi(http, "/api/v1/auth/register", {
    email,
    password: DEMO_PASSWORD,
    fullName: `Scenario ${tag}`,
    phone: `9${Date.now().toString().slice(-9)}`,
  });
  expect(registration.status).toBe(201);

  const code = registration.body.verification?.devCode as string | undefined;
  expect(code).toMatch(/^\d{6}$/);

  const verification = await postApi(http, "/api/v1/auth/verify-otp", {
    email,
    purpose: "EMAIL_VERIFICATION",
    code,
  });
  expect(verification.status).toBe(200);

  return loginAs(http, email);
}

export interface TestWindow {
  pickupAt: string;
  returnAt: string;
}

function istDay(ms: number, hour: number): string {
  const inIst = new Date(ms + 5.5 * 3_600_000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${inIst.getUTCFullYear()}-${pad(inIst.getUTCMonth() + 1)}-${pad(inIst.getUTCDate())}` +
    `T${pad(hour)}:00:00+05:30`
  );
}

/**
 * Rental windows start ~45 days out so they never collide with the seeded demo
 * bookings that already hold availability rows in the test database.
 */
export function windowAt(
  daysFromNow: number,
  durationDays: number,
): TestWindow {
  const start = Date.now() + daysFromNow * 86_400_000;
  return {
    pickupAt: istDay(start, 9),
    returnAt: istDay(start + durationDays * 86_400_000, 9),
  };
}

export interface ScenarioFixtures {
  vehicleA: { id: string; name: string };
  vehicleB: { id: string; name: string };
  pickupLocationId: string;
  driverId: string;
}

export async function pickFixtures(
  prisma: PrismaService,
): Promise<ScenarioFixtures> {
  const vehicles = await prisma.vehicle.findMany({
    where: { status: "AVAILABLE", pricing: { some: { isActive: true } } },
    orderBy: { name: "asc" },
    take: 2,
    select: { id: true, name: true },
  });
  if (vehicles.length < 2) {
    throw new Error(
      "Scenario tests need two bookable vehicles — seed the test database first.",
    );
  }
  const location = await prisma.vehicleLocation.findFirst({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true },
  });
  const driver = await prisma.driverProfile.findFirst({
    where: { verificationStatus: "VERIFIED" },
    orderBy: { fullName: "asc" },
    select: { id: true },
  });
  if (!location) {
    throw new Error("Scenario tests need an active pickup location.");
  }
  if (!driver) {
    throw new Error("Scenario tests need a verified driver.");
  }

  return {
    vehicleA: vehicles[0],
    vehicleB: vehicles[1],
    pickupLocationId: location.id,
    driverId: driver.id,
  };
}

/**
 * The GiST exclusion constraint is the last line of defence for concurrent
 * bookings. Environments that cannot load btree_gist (blocked extension) fall
 * back to the service-level overlap check, so the race test adapts itself.
 */
export async function hasOverlapGuard(
  prisma: PrismaService,
): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ conname: string }[]>`SELECT conname
    FROM pg_constraint
    WHERE conname = 'vehicle_availability_no_overlap'`;
  return rows.length > 0;
}

export function bookingPayload(
  fixtures: ScenarioFixtures,
  vehicleId: string,
  rental: TestWindow,
): Record<string, unknown> {
  return {
    vehicleId,
    pickupLocationId: fixtures.pickupLocationId,
    pickupAt: rental.pickupAt,
    returnAt: rental.returnAt,
  };
}

export function book(
  http: ScenarioHttp,
  session: ScenarioSession,
  body: Record<string, unknown>,
): Promise<ScenarioResponse> {
  return postApi(http, "/api/v1/bookings", body, session.accessToken);
}

export function cancel(
  http: ScenarioHttp,
  session: ScenarioSession,
  bookingId: string,
  reason = "Scenario cleanup",
): Promise<ScenarioResponse> {
  return postApi(
    http,
    `/api/v1/bookings/${bookingId}/cancel`,
    { reason },
    session.accessToken,
  );
}

/**
 * Test users are removed along with the money trail they created. Seeded demo
 * data is never touched beyond the temporary status flips tests restore.
 */
export async function cleanupScenarioData(
  prisma: PrismaService,
  emails: string[],
): Promise<void> {
  const testEmails = emails.filter((email) =>
    email.endsWith(TEST_EMAIL_DOMAIN),
  );
  if (testEmails.length === 0) return;

  const users = await prisma.user.findMany({
    where: { email: { in: testEmails } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);
  if (userIds.length === 0) return;

  const bookingIds = (
    await prisma.booking.findMany({
      where: { customerId: { in: userIds } },
      select: { id: true },
    })
  ).map((booking) => booking.id);

  const paymentIds = (
    await prisma.payment.findMany({
      where: { bookingId: { in: bookingIds } },
      select: { id: true },
    })
  ).map((payment) => payment.id);

  await prisma.refund.deleteMany({ where: { paymentId: { in: paymentIds } } });
  await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } });
  await prisma.review.deleteMany({ where: { bookingId: { in: bookingIds } } });
  await prisma.vehicleAvailability.deleteMany({
    where: { bookingId: { in: bookingIds } },
  });
  await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}
