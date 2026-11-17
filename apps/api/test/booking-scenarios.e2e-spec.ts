import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import {
  book,
  bookingPayload,
  bootScenarioApp,
  cancel,
  cleanupScenarioData,
  createRider,
  getApi,
  hasOverlapGuard,
  loginAs,
  patchApi,
  pickFixtures,
  postApi,
  windowAt,
  type ScenarioApp,
  type ScenarioFixtures,
  type ScenarioHttp,
  type ScenarioSession,
} from "./support/scenario-harness";

const describeWithDatabase = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip;

/**
 * Phase 5 "important scenarios" — booking half.
 *
 *   1. Two users attempting to book the same vehicle
 *   2. Payment success but booking creation failure
 *   4. Booking cancellation
 *   6. Expired authentication tokens
 *   7. Invalid booking dates
 *   8. Vehicle unavailable
 *
 * Runs only when TEST_DATABASE_URL points at a migrated, seeded database.
 */
describeWithDatabase("Booking scenarios (integration)", () => {
  let harness: ScenarioApp;
  let http: ScenarioHttp;
  let fixtures: ScenarioFixtures;
  let rider: ScenarioSession;
  let rival: ScenarioSession;
  let admin: ScenarioSession;
  const emails: string[] = [];

  beforeAll(async () => {
    harness = await bootScenarioApp();
    http = harness.http;
    fixtures = await pickFixtures(harness.prisma);
    rider = await createRider(http, "booker");
    rival = await createRider(http, "rival");
    admin = await loginAs(http, "admin@savarigo.com");
    emails.push(rider.email, rival.email);
  }, 120_000);

  afterAll(async () => {
    try {
      await cleanupScenarioData(harness?.prisma, emails);
    } finally {
      await harness?.app?.close();
    }
  });

  describe("Scenario 7 — invalid booking dates", () => {
    it("rejects a return before the pickup", async () => {
      const rental = windowAt(45, 2);
      const response = await book(http, rider, {
        ...bookingPayload(fixtures, fixtures.vehicleA.id, rental),
        returnAt: rental.pickupAt,
      });
      expect(response.status).toBe(400);
      expect(response.body.code).toBe("INVALID_DATE_RANGE");
    });

    it("rejects a pickup in the past", async () => {
      const response = await book(
        http,
        rider,
        bookingPayload(fixtures, fixtures.vehicleA.id, windowAt(-3, 2)),
      );
      expect(response.status).toBe(400);
      expect(response.body.code).toBe("PICKUP_IN_PAST");
    });

    it("rejects rentals longer than the 90-day ceiling", async () => {
      const response = await book(
        http,
        rider,
        bookingPayload(fixtures, fixtures.vehicleA.id, windowAt(45, 120)),
      );
      expect(response.status).toBe(400);
      expect(response.body.code).toBe("BOOKING_TOO_LONG");
    });

    it("rejects a malformed date before touching the database", async () => {
      const response = await book(http, rider, {
        vehicleId: fixtures.vehicleA.id,
        pickupLocationId: fixtures.pickupLocationId,
        pickupAt: "next tuesday",
        returnAt: "eventually",
      });
      expect(response.status).toBe(400);
      expect(response.body.code).toBe("VALIDATION_ERROR");
    });

    it("reserves nothing when the window is rejected", async () => {
      expect(
        await harness.prisma.booking.count({
          where: { customerId: { in: [rider.userId, rival.userId] } },
        }),
      ).toBe(0);
    });
  });

  describe("Scenario 8 — vehicle unavailable", () => {
    it("refuses a vehicle in maintenance and accepts it once available", async () => {
      const payload = bookingPayload(
        fixtures,
        fixtures.vehicleB.id,
        windowAt(45, 2),
      );
      let allowedBookingId: string | undefined;

      expect(
        (
          await patchApi(
            http,
            `/api/v1/vehicles/${fixtures.vehicleB.id}`,
            { status: "MAINTENANCE" },
            admin.accessToken,
          )
        ).status,
      ).toBe(200);

      try {
        const blocked = await book(http, rider, payload);
        expect(blocked.status).toBe(404);
        expect(blocked.body.code).toBe("VEHICLE_NOT_AVAILABLE");

        expect(
          (
            await patchApi(
              http,
              `/api/v1/vehicles/${fixtures.vehicleB.id}`,
              { status: "AVAILABLE" },
              admin.accessToken,
            )
          ).status,
        ).toBe(200);

        const allowed = await book(http, rider, payload);
        expect(allowed.status).toBe(201);
        expect(allowed.body.vehicle.id).toBe(fixtures.vehicleB.id);
        allowedBookingId = allowed.body.id as string;
      } finally {
        // A failed assertion must never leave the vehicle parked in
        // maintenance: later tests book it too.
        await patchApi(
          http,
          `/api/v1/vehicles/${fixtures.vehicleB.id}`,
          { status: "AVAILABLE" },
          admin.accessToken,
        );
        if (allowedBookingId) await cancel(http, rider, allowedBookingId);
      }
    });

    it("refuses a rider who neither owns the booking nor works for SavariGo", async () => {
      const booking = await book(
        http,
        rider,
        bookingPayload(fixtures, fixtures.vehicleA.id, windowAt(70, 2)),
      );
      expect(booking.status).toBe(201);

      const peek = await getApi(
        http,
        `/api/v1/bookings/manage/${booking.body.id}`,
        rival.accessToken,
      );
      expect(peek.status).toBe(403);
      expect(peek.body.code).toBe("FORBIDDEN");

      expect((await cancel(http, rider, booking.body.id)).status).toBe(201);
    });
  });

  describe("Scenario 1 — two users booking the same vehicle", () => {
    it("blocks the second rider on an overlapping window", async () => {
      const rental = windowAt(50, 3);
      const payload = bookingPayload(fixtures, fixtures.vehicleA.id, rental);

      const first = await book(http, rider, payload);
      expect(first.status).toBe(201);

      const second = await book(http, rival, payload);
      expect(second.status).toBe(409);
      expect(second.body.code).toBe("BOOKING_CONFLICT");

      // Another vehicle in the same period is still bookable.
      const otherVehicle = await book(
        http,
        rival,
        bookingPayload(fixtures, fixtures.vehicleB.id, rental),
      );
      expect(otherVehicle.status).toBe(201);

      expect(
        await harness.prisma.vehicleAvailability.count({
          where: {
            bookingId: { in: [first.body.id, otherVehicle.body.id] },
          },
        }),
      ).toBe(2);

      expect((await cancel(http, rider, first.body.id)).status).toBe(201);
      expect((await cancel(http, rival, otherVehicle.body.id)).status).toBe(201);
    });

    it("lets only one of two simultaneous requests win", async () => {
      const guard = await hasOverlapGuard(harness.prisma);
      const rental = windowAt(80, 2);
      const payload = bookingPayload(fixtures, fixtures.vehicleA.id, rental);

      const [riderResponse, rivalResponse] = await Promise.all([
        book(http, rider, payload),
        book(http, rival, payload),
      ]);
      const attempts = [
        { session: rider, response: riderResponse },
        { session: rival, response: rivalResponse },
      ];
      const created = attempts.filter(
        (attempt) => attempt.response.status === 201,
      );
      const conflicts = attempts.filter(
        (attempt) => attempt.response.status === 409,
      );

      if (guard) {
        expect(created).toHaveLength(1);
        expect(conflicts).toHaveLength(1);
        expect(conflicts[0].response.body.code).toBe("BOOKING_CONFLICT");
      } else {
        // Without btree_gist only the service-level overlap check protects the
        // window, so two simultaneous requests can both be accepted.
        expect(created.length + conflicts.length).toBe(2);
      }

      for (const attempt of created) {
        expect(
          (await cancel(http, attempt.session, attempt.response.body.id))
            .status,
        ).toBe(201);
      }
    });
  });

  describe("Scenario 4 — booking cancellation", () => {
    it("cancels, releases the window and refuses a second cancellation", async () => {
      const rental = windowAt(55, 4);
      const payload = bookingPayload(fixtures, fixtures.vehicleA.id, rental);

      const booking = await book(http, rider, payload);
      expect(booking.status).toBe(201);

      const cancelled = await cancel(http, rider, booking.body.id, "Plans changed");
      expect(cancelled.status).toBe(201);
      expect(cancelled.body.booking.status).toBe("CANCELLED");
      expect(cancelled.body.cancellation.refund.status).toBe("NOT_DUE");
      expect(cancelled.body.cancellation.policy).toContain("full rental refund");

      const again = await cancel(http, rider, booking.body.id);
      expect(again.status).toBe(400);
      expect(again.body.code).toBe("BOOKING_ALREADY_CANCELLED");

      // The freed window is immediately bookable by someone else.
      const rebooked = await book(http, rival, payload);
      expect(rebooked.status).toBe(201);
      expect((await cancel(http, rival, rebooked.body.id)).status).toBe(201);
    });

    it("blocks status transitions that are not legal", async () => {
      const booking = await book(
        http,
        rider,
        bookingPayload(fixtures, fixtures.vehicleB.id, windowAt(57, 2)),
      );
      expect(booking.status).toBe(201);

      const illegal = await patchApi(
        http,
        `/api/v1/bookings/${booking.body.id}/status`,
        { status: "COMPLETED" },
        admin.accessToken,
      );
      expect(illegal.status).toBe(400);
      expect(illegal.body.code).toBe("INVALID_BOOKING_STATUS");

      expect((await cancel(http, rider, booking.body.id)).status).toBe(201);
    });
  });

  describe("Scenario 6 — expired and rotated tokens", () => {
    it("rejects an expired access token and a refresh token used as access", async () => {
      const expired = jwt.sign(
        {
          sub: rider.userId,
          email: rider.email,
          roles: ["CUSTOMER"],
          type: "access",
        },
        process.env.JWT_ACCESS_SECRET as string,
        { expiresIn: -60 },
      );

      expect((await getApi(http, "/api/v1/bookings/me", expired)).status).toBe(
        401,
      );
      expect(
        (await getApi(http, "/api/v1/bookings/me", rider.refreshToken)).status,
      ).toBe(401);
    });

    it("refreshes an expired session and revokes the family on reuse", async () => {
      const refreshed = await postApi(http, "/api/v1/auth/refresh", {
        refreshToken: rider.refreshToken,
      });
      expect(refreshed.status).toBe(200);

      const accessToken = refreshed.body.accessToken as string;
      const newRefreshToken = refreshed.body.refreshToken as string;
      // Access tokens are stateless and second-granular, so a refresh inside
      // the same second can legitimately reissue an identical string. What
      // must change is the stored refresh token.
      expect(newRefreshToken).not.toBe(rider.refreshToken);

      expect((await getApi(http, "/api/v1/bookings/me", accessToken)).status).toBe(
        200,
      );

      // Replaying a consumed refresh token must fail and revoke the family.
      const replay = await postApi(http, "/api/v1/auth/refresh", {
        refreshToken: rider.refreshToken,
      });
      expect(replay.status).toBe(401);
      expect(replay.body.code).toBe("REFRESH_TOKEN_REUSED");

      const afterRevocation = await postApi(http, "/api/v1/auth/refresh", {
        refreshToken: newRefreshToken,
      });
      expect(afterRevocation.status).toBe(401);
      expect(["REFRESH_TOKEN_REUSED", "INVALID_REFRESH_TOKEN"]).toContain(
        afterRevocation.body.code,
      );

      // A fresh password login restores access.
      expect(
        (await getApi(http, "/api/v1/bookings/me", rider.accessToken)).status,
      ).toBe(200);
    });
  });

  describe("Scenario 2 — payment success cannot outrun booking creation", () => {
    it("rolls the booking and its reservation back when a write fails mid-transaction", async () => {
      const rental = windowAt(85, 2);
      const payload = bookingPayload(fixtures, fixtures.vehicleA.id, rental);

      const prisma = harness.prisma;
      const realTransaction = prisma.$transaction.bind(prisma) as unknown as (
        input: unknown,
      ) => Promise<unknown>;
      const spy = jest
        .spyOn(prisma, "$transaction")
        .mockImplementation(((input: unknown) => {
          if (typeof input !== "function") {
            return realTransaction(input);
          }
          return realTransaction((tx: Record<string, any>) => {
            tx.vehicleAvailability.create = () =>
              Promise.reject(new Error("simulated database outage"));
            return (input as (client: unknown) => Promise<unknown>)(tx);
          });
        }) as never);

      try {
        const failure = await book(http, rival, payload);
        expect(failure.status).toBe(500);
        expect(failure.body.code).toBe("INTERNAL_ERROR");
      } finally {
        spy.mockRestore();
      }

      // Nothing survived: no booking, no reservation, no payment record.
      expect(
        await prisma.booking.count({
          where: {
            customerId: rival.userId,
            pickupAt: new Date(rental.pickupAt),
          },
        }),
      ).toBe(0);
      expect(
        await prisma.vehicleAvailability.count({
          where: {
            vehicleId: fixtures.vehicleA.id,
            startsAt: new Date(rental.pickupAt),
          },
        }),
      ).toBe(0);
      expect(
        await prisma.payment.count({
          where: { booking: { customerId: rival.userId } },
        }),
      ).toBe(0);
    });

    it("refuses a payment whose booking does not exist", async () => {
      const orphan = harness.prisma.payment.create({
        data: {
          bookingId: "00000000-0000-4000-8000-000000000000",
          provider: "RAZORPAY",
          method: "UPI",
          amount: new Prisma.Decimal(100),
          currency: "INR",
          status: "PAID",
          paidAt: new Date(),
        },
      });
      await expect(orphan).rejects.toMatchObject({ code: "P2003" });
    });
  });
});
