import {
  GATEWAY_KEY_ID,
  GATEWAY_KEY_SECRET,
  GATEWAY_WEBHOOK_SECRET,
  restoreGatewayEnv,
} from "./support/scenario-gateway-env";
import { createHmac } from "node:crypto";
import {
  book,
  bookingPayload,
  bootScenarioApp,
  cancel,
  cleanupScenarioData,
  createRider,
  getApi,
  loginAs,
  pickFixtures,
  postApi,
  postRawApi,
  windowAt,
  type ScenarioApp,
  type ScenarioFixtures,
  type ScenarioHttp,
  type ScenarioSession,
} from "./support/scenario-harness";

const describeWithDatabase = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip;

interface GatewayPayment {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  order_id: string | null;
  method: string | null;
  captured: boolean;
  error_code: string | null;
  error_description: string | null;
  created_at: number;
}

/**
 * A stand-in for api.razorpay.com. Only the network boundary is faked: the
 * service still signs and verifies real HMACs, still maps HTTP failures to
 * 502s, and still talks to the real database.
 */
const gateway = {
  orders: new Map<string, { amount: number; receipt: string }>(),
  payments: new Map<string, GatewayPayment>(),
  refunds: new Map<string, { id: string; paymentId: string; status: string }>(),
  transport: "ok" as "ok" | "down",
  errorStatus: null as number | null,
  refundStatus: "processed",
  orderCalls: 0,
  counter: 0,
};

function nextId(prefix: string): string {
  gateway.counter += 1;
  return `${prefix}_scenario_${gateway.counter}`;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function gatewayError(description: string, code = "SERVER_ERROR") {
  return { error: { code, description } };
}

const fetchMock = jest.fn(
  async (input: unknown, init?: unknown): Promise<Response> => {
    if (gateway.transport === "down") {
      throw new TypeError("fetch failed");
    }
    const options = (init ?? {}) as { method?: string; body?: string };
    const { pathname } = new URL(String(input));

    if (gateway.errorStatus !== null) {
      return jsonResponse(gateway.errorStatus, gatewayError("Gateway exploded"));
    }

    if (pathname === "/v1/orders" && options.method === "POST") {
      gateway.orderCalls += 1;
      const request = JSON.parse(String(options.body)) as {
        amount: number;
        receipt: string;
      };
      const id = nextId("order");
      gateway.orders.set(id, { amount: request.amount, receipt: request.receipt });
      return jsonResponse(200, {
        id,
        entity: "order",
        amount: request.amount,
        amount_paid: 0,
        amount_due: request.amount,
        currency: "INR",
        receipt: request.receipt,
        status: "created",
        notes: {},
        created_at: Math.floor(Date.now() / 1000),
      });
    }

    const paymentMatch = /^\/v1\/payments\/([^/]+)$/.exec(pathname);
    if (paymentMatch && options.method === "GET") {
      const payment = gateway.payments.get(paymentMatch[1]);
      return payment
        ? jsonResponse(200, payment)
        : jsonResponse(404, gatewayError("Payment does not exist", "BAD_REQUEST_ERROR"));
    }

    const refundMatch = /^\/v1\/payments\/([^/]+)\/refund$/.exec(pathname);
    if (refundMatch && options.method === "POST") {
      const request = JSON.parse(String(options.body)) as { amount: number };
      const id = nextId("rfnd");
      gateway.refunds.set(id, {
        id,
        paymentId: refundMatch[1],
        status: gateway.refundStatus,
      });
      return jsonResponse(201, {
        id,
        entity: "refund",
        amount: request.amount,
        currency: "INR",
        payment_id: refundMatch[1],
        status: gateway.refundStatus,
        created_at: Math.floor(Date.now() / 1000),
      });
    }

    return jsonResponse(404, gatewayError(`Unexpected path ${pathname}`));
  },
);

/** Registers the gateway payment a browser checkout would produce. */
function payForOrder(
  orderId: string,
  overrides: Partial<GatewayPayment> = {},
): string {
  const id = nextId("pay");
  const order = gateway.orders.get(orderId);
  gateway.payments.set(id, {
    id,
    entity: "payment",
    amount: order?.amount ?? 100_000,
    currency: "INR",
    status: "captured",
    order_id: orderId,
    method: "upi",
    captured: true,
    error_code: null,
    error_description: null,
    created_at: Math.floor(Date.now() / 1000),
    ...overrides,
  });
  return id;
}

const checkoutSignature = (orderId: string, paymentId: string): string =>
  createHmac("sha256", GATEWAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");

const signWebhook = (rawBody: string): string =>
  createHmac("sha256", GATEWAY_WEBHOOK_SECRET).update(rawBody).digest("hex");

function eventBody(event: string, payload: Record<string, unknown>): string {
  return JSON.stringify({ event, payload });
}

function paymentEvent(paymentId: string, event = "payment.captured"): string {
  const payment = gateway.payments.get(paymentId) as GatewayPayment;
  return eventBody(event, {
    payment: {
      entity: {
        id: payment.id,
        order_id: payment.order_id,
        amount: payment.amount,
        method: payment.method,
        status: event === "payment.failed" ? "failed" : "captured",
        error_code: payment.error_code,
        error_description: payment.error_description,
        created_at: payment.created_at,
      },
    },
  });
}

function refundEvent(refundId: string, event = "refund.processed"): string {
  const refund = gateway.refunds.get(refundId) as {
    id: string;
    paymentId: string;
    status: string;
  };
  return eventBody(event, {
    refund: { entity: { id: refund.id, payment_id: refund.paymentId, status: refund.status } },
  });
}

/**
 * Phase 5 "important scenarios" — payment half.
 *
 *   3. Payment failure
 *   5. Refund processing
 *   9. Network failure during checkout
 *  10. Duplicate payment webhook
 *
 * Runs only when TEST_DATABASE_URL points at a migrated, seeded database.
 */
describeWithDatabase("Payment scenarios (integration)", () => {
  let harness: ScenarioApp;
  let http: ScenarioHttp;
  let fixtures: ScenarioFixtures;
  let rider: ScenarioSession;
  let admin: ScenarioSession;
  const emails: string[] = [];
  const originalFetch = global.fetch;

  async function createBooking(days: number, vehicleId?: string): Promise<string> {
    const response = await book(
      http,
      rider,
      bookingPayload(fixtures, vehicleId ?? fixtures.vehicleA.id, windowAt(days, 3)),
    );
    expect(response.status).toBe(201);
    return response.body.id as string;
  }

  const createOrder = (
    bookingId: string,
    extra: Record<string, unknown> = {},
  ) =>
    postApi(
      http,
      "/api/v1/payments/orders",
      { bookingId, ...extra },
      rider.accessToken,
    );

  /** Book, open a Razorpay order and capture it through the checkout. */
  async function settle(days: number) {
    const bookingId = await createBooking(days);
    const order = await createOrder(bookingId);
    expect(order.status).toBe(201);
    expect(order.body.keyId).toBe(GATEWAY_KEY_ID);
    const razorpayOrderId = order.body.order.id as string;
    const razorpayPaymentId = payForOrder(razorpayOrderId);

    const verified = await postApi(
      http,
      "/api/v1/payments/verify",
      {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: checkoutSignature(razorpayOrderId, razorpayPaymentId),
      },
      rider.accessToken,
    );
    expect(verified.status).toBe(201);
    expect(verified.body.status).toBe("PAID");

    return {
      bookingId,
      bookingCode: verified.body.bookingCode as string,
      dbPaymentId: verified.body.id as string,
      razorpayOrderId,
      razorpayPaymentId,
      amount: Number(verified.body.amount),
    };
  }

  const webhook = (rawBody: string, signature?: string) =>
    postRawApi(
      http,
      "/api/v1/payments/webhook",
      rawBody,
      signature ? { "x-razorpay-signature": signature } : {},
    );

  beforeAll(async () => {
    global.fetch = fetchMock as unknown as typeof fetch;
    harness = await bootScenarioApp();
    http = harness.http;
    fixtures = await pickFixtures(harness.prisma);
    rider = await createRider(http, "payer");
    admin = await loginAs(http, "admin@savarigo.com");
    emails.push(rider.email);
  }, 120_000);

  afterAll(async () => {
    global.fetch = originalFetch;
    restoreGatewayEnv();
    try {
      await cleanupScenarioData(harness?.prisma, emails);
    } finally {
      await harness?.app?.close();
    }
  });

  describe("Scenario 3 — payment failure", () => {
    let bookingId: string;
    let razorpayOrderId: string;
    let dbPaymentId: string;

    beforeAll(async () => {
      bookingId = await createBooking(121);
      const order = await createOrder(bookingId);
      expect(order.status).toBe(201);
      razorpayOrderId = order.body.order.id as string;
      dbPaymentId = order.body.paymentId as string;
    });

    it("rejects a checkout signature that does not match", async () => {
      const paymentId = payForOrder(razorpayOrderId);
      const response = await postApi(
        http,
        "/api/v1/payments/verify",
        {
          razorpayOrderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: "a".repeat(64),
        },
        rider.accessToken,
      );

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("PAYMENT_SIGNATURE_INVALID");
      const payment = await harness.prisma.payment.findUniqueOrThrow({
        where: { id: dbPaymentId },
      });
      expect(payment.status).toBe("PENDING");
    });

    it("rejects a payment issued against a different order", async () => {
      const paymentId = payForOrder(razorpayOrderId, {
        order_id: "order_someone_else",
      });
      const response = await postApi(
        http,
        "/api/v1/payments/verify",
        {
          razorpayOrderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: checkoutSignature(razorpayOrderId, paymentId),
        },
        rider.accessToken,
      );

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("PAYMENT_ORDER_MISMATCH");
    });

    it("rejects an underpayment before marking anything paid", async () => {
      const order = gateway.orders.get(razorpayOrderId) as { amount: number };
      const paymentId = payForOrder(razorpayOrderId, {
        amount: order.amount - 1_000,
      });
      const response = await postApi(
        http,
        "/api/v1/payments/verify",
        {
          razorpayOrderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: checkoutSignature(razorpayOrderId, paymentId),
        },
        rider.accessToken,
      );

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("PAYMENT_AMOUNT_MISMATCH");
      expect(
        (
          await harness.prisma.booking.findUniqueOrThrow({
            where: { id: bookingId },
            select: { paymentStatus: true, status: true },
          })
        ).paymentStatus,
      ).not.toBe("PAID");
    });

    it("records the failure the gateway reports", async () => {
      const paymentId = payForOrder(razorpayOrderId, {
        status: "failed",
        captured: false,
        error_code: "BAD_REQUEST_ERROR",
        error_description: "Card declined by issuing bank",
      });
      const response = await postApi(
        http,
        "/api/v1/payments/verify",
        {
          razorpayOrderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: checkoutSignature(razorpayOrderId, paymentId),
        },
        rider.accessToken,
      );

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("PAYMENT_NOT_CAPTURED");

      const payment = await harness.prisma.payment.findUniqueOrThrow({
        where: { id: dbPaymentId },
      });
      expect(payment.status).toBe("FAILED");
      expect(payment.failureCode).toBe("BAD_REQUEST_ERROR");
    });

    it("refuses to refund a payment that never captured", async () => {
      const response = await postApi(
        http,
        `/api/v1/payments/${dbPaymentId}/refund`,
        { reason: "Should be rejected" },
        admin.accessToken,
      );
      expect(response.status).toBe(400);
      expect(response.body.code).toBe("PAYMENT_NOT_REFUNDABLE");
      expect(await harness.prisma.refund.count({ where: { paymentId: dbPaymentId } })).toBe(0);
    });

    it("refuses to open an order for a closed booking", async () => {
      const dead = await createBooking(131);
      expect((await cancel(http, rider, dead)).status).toBe(201);

      const response = await createOrder(dead);
      expect(response.status).toBe(400);
      expect(response.body.code).toBe("BOOKING_CLOSED");
    });

    it("hides another customer's payment from verification", async () => {
      const other = await createRider(http, "stranger");
      emails.push(other.email);
      const response = await postApi(
        http,
        "/api/v1/payments/verify",
        {
          razorpayOrderId,
          razorpayPaymentId: "pay_does_not_matter",
          razorpaySignature: "b".repeat(64),
        },
        other.accessToken,
      );
      expect(response.status).toBe(403);
      expect(response.body.code).toBe("PAYMENT_FORBIDDEN");
    });
  });

  describe("Scenario 9 — network failure during checkout", () => {
    it("fails cleanly when the gateway cannot be reached, then recovers", async () => {
      const bookingId = await createBooking(141);

      gateway.transport = "down";
      const outage = await createOrder(bookingId);
      expect(outage.status).toBe(502);
      expect(outage.body.code).toBe("PAYMENT_GATEWAY_UNREACHABLE");
      expect(
        await harness.prisma.payment.count({ where: { bookingId } }),
      ).toBe(0);

      gateway.transport = "ok";
      const retry = await createOrder(bookingId);
      expect(retry.status).toBe(201);
      expect(retry.body.order.status).toBe("PENDING");
      expect(
        await harness.prisma.payment.count({ where: { bookingId } }),
      ).toBe(1);
      await cancel(http, rider, bookingId);
    });

    it("surfaces a gateway error response as a 502", async () => {
      const bookingId = await createBooking(151);
      gateway.errorStatus = 500;
      const response = await createOrder(bookingId);
      gateway.errorStatus = null;

      expect(response.status).toBe(502);
      expect(response.body.code).toBe("PAYMENT_GATEWAY_ERROR");
      expect(
        await harness.prisma.payment.count({ where: { bookingId } }),
      ).toBe(0);
      await cancel(http, rider, bookingId);
    });

    it("keeps an order payable when verification loses the network", async () => {
      const bookingId = await createBooking(161);
      const order = await createOrder(bookingId);
      const razorpayOrderId = order.body.order.id as string;
      const razorpayPaymentId = payForOrder(razorpayOrderId);
      const payload = {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: checkoutSignature(razorpayOrderId, razorpayPaymentId),
      };

      gateway.transport = "down";
      const dropped = await postApi(
        http,
        "/api/v1/payments/verify",
        payload,
        rider.accessToken,
      );
      expect(dropped.status).toBe(502);
      expect(dropped.body.code).toBe("PAYMENT_GATEWAY_UNREACHABLE");

      const afterOutage = await harness.prisma.payment.findUniqueOrThrow({
        where: { id: order.body.paymentId as string },
        include: { booking: { select: { status: true, paymentStatus: true } } },
      });
      expect(afterOutage.status).toBe("PENDING");
      expect(afterOutage.booking.status).toBe("PENDING");

      // The customer retries from the checkout page and the money lands now.
      gateway.transport = "ok";
      const recovered = await postApi(
        http,
        "/api/v1/payments/verify",
        payload,
        rider.accessToken,
      );
      expect(recovered.status).toBe(201);
      expect(recovered.body.status).toBe("PAID");
      expect(
        (
          await harness.prisma.booking.findUniqueOrThrow({
            where: { id: bookingId },
          })
        ).status,
      ).toBe("CONFIRMED");

      await cancel(http, rider, bookingId);
    });

    it("replays the same order for a retried idempotency key", async () => {
      const bookingId = await createBooking(171);
      const key = `scenario-${Date.now()}`;

      const first = await createOrder(bookingId, { idempotencyKey: key });
      const callsAfterFirst = gateway.orderCalls;
      const second = await createOrder(bookingId, { idempotencyKey: key });

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(second.body.order.id).toBe(first.body.order.id);
      expect(gateway.orderCalls).toBe(callsAfterFirst);
      expect(
        await harness.prisma.payment.count({ where: { bookingId } }),
      ).toBe(1);

      const hijack = await createBooking(181);
      const reused = await createOrder(hijack, { idempotencyKey: key });
      expect(reused.status).toBe(409);
      expect(reused.body.code).toBe("IDEMPOTENCY_KEY_REUSED");

      await cancel(http, rider, bookingId);
      await cancel(http, rider, hijack);
    });
  });

  describe("Scenario 5 — refund processing", () => {
    it("refunds in parts and tracks the payment state", async () => {
      const paid = await settle(191);
      const half = Math.round((paid.amount / 2) * 100) / 100;

      const partial = await postApi(
        http,
        `/api/v1/payments/${paid.dbPaymentId}/refund`,
        { amount: half, reason: "Driver upgrade not used" },
        admin.accessToken,
      );
      expect(partial.status).toBe(201);
      expect(partial.body.status).toBe("COMPLETED");
      expect(
        (
          await harness.prisma.payment.findUniqueOrThrow({
            where: { id: paid.dbPaymentId },
          })
        ).status,
      ).toBe("PARTIALLY_REFUNDED");

      const greedy = await postApi(
        http,
        `/api/v1/payments/${paid.dbPaymentId}/refund`,
        { amount: paid.amount, reason: "More than what is left" },
        admin.accessToken,
      );
      expect(greedy.status).toBe(400);
      expect(greedy.body.code).toBe("REFUND_TOO_LARGE");
      expect(greedy.body.details).toEqual({ remaining: expect.any(Number) });

      const rest = await postApi(
        http,
        `/api/v1/payments/${paid.dbPaymentId}/refund`,
        { reason: "Cancellation approved by support" },
        admin.accessToken,
      );
      expect(rest.status).toBe(201);
      const fullyRefunded = await harness.prisma.payment.findUniqueOrThrow({
        where: { id: paid.dbPaymentId },
        include: { booking: { select: { paymentStatus: true } } },
      });
      expect(fullyRefunded.status).toBe("REFUNDED");
      expect(fullyRefunded.booking.paymentStatus).toBe("REFUNDED");

      const afterTheEnd = await postApi(
        http,
        `/api/v1/payments/${paid.dbPaymentId}/refund`,
        { amount: 10, reason: "Nothing left to give" },
        admin.accessToken,
      );
      expect(afterTheEnd.status).toBe(400);
      expect(afterTheEnd.body.code).toBe("PAYMENT_NOT_REFUNDABLE");

      await cancel(http, rider, paid.bookingId);
    });

    it("returns the money when a paid booking is cancelled", async () => {
      const paid = await settle(201);

      const cancelled = await cancel(http, rider, paid.bookingId, "Plans changed");
      expect(cancelled.status).toBe(201);
      expect(cancelled.body.booking.status).toBe("CANCELLED");
      expect(cancelled.body.cancellation.refund.status).toBe("COMPLETED");
      expect(
        Number(cancelled.body.cancellation.refund.amount),
      ).toBeLessThanOrEqual(paid.amount);

      const payment = await harness.prisma.payment.findUniqueOrThrow({
        where: { id: paid.dbPaymentId },
        include: { refunds: true },
      });
      expect(["REFUNDED", "PARTIALLY_REFUNDED"]).toContain(payment.status);
      expect(payment.refunds).toHaveLength(1);
      expect(payment.refunds[0].status).toBe("COMPLETED");
      expect(
        await harness.prisma.vehicleAvailability.count({
          where: { bookingId: paid.bookingId },
        }),
      ).toBe(0);
    });

    it("holds a queued refund until the gateway webhook confirms it", async () => {
      const paid = await settle(211);
      gateway.refundStatus = "pending";

      const queued = await postApi(
        http,
        `/api/v1/payments/${paid.dbPaymentId}/refund`,
        { reason: "Bank refund pending" },
        admin.accessToken,
      );
      expect(queued.status).toBe(201);
      expect(queued.body.status).toBe("PROCESSING");
      expect(
        (
          await harness.prisma.payment.findUniqueOrThrow({
            where: { id: paid.dbPaymentId },
          })
        ).status,
      ).toBe("PAID");

      const providerRefundId = queued.body.providerRefundId as string;
      const receipt = await webhook(
        refundEvent(providerRefundId),
        signWebhook(refundEvent(providerRefundId)),
      );
      expect(receipt.status).toBe(201);
      expect(receipt.body.handled).toBe(true);

      const settled = await harness.prisma.payment.findUniqueOrThrow({
        where: { id: paid.dbPaymentId },
        include: { refunds: true, booking: { select: { paymentStatus: true } } },
      });
      expect(settled.refunds[0].status).toBe("COMPLETED");
      expect(settled.status).toBe("REFUNDED");
      expect(settled.booking.paymentStatus).toBe("REFUNDED");

      gateway.refundStatus = "processed";
      await cancel(http, rider, paid.bookingId);
    });

    it("refuses a refund from anyone but finance staff", async () => {
      const paid = await settle(221);
      const response = await postApi(
        http,
        `/api/v1/payments/${paid.dbPaymentId}/refund`,
        { reason: "Customer self-service" },
        rider.accessToken,
      );
      expect(response.status).toBe(403);
      expect(response.body.code).toBe("FORBIDDEN");
      await cancel(http, rider, paid.bookingId);
    });
  });

  describe("Scenario 10 — duplicate and hostile webhooks", () => {
    it("applies a captured event once however often it is replayed", async () => {
      const bookingId = await createBooking(231);
      const order = await createOrder(bookingId);
      const razorpayOrderId = order.body.order.id as string;
      const razorpayPaymentId = payForOrder(razorpayOrderId);
      const body = paymentEvent(razorpayPaymentId);

      const first = await webhook(body, signWebhook(body));
      const second = await webhook(body, signWebhook(body));
      const third = await webhook(body, signWebhook(body));

      for (const receipt of [first, second, third]) {
        expect(receipt.status).toBe(201);
        expect(receipt.body).toMatchObject({
          received: true,
          handled: true,
          event: "payment.captured",
        });
      }

      const payment = await harness.prisma.payment.findUniqueOrThrow({
        where: { id: order.body.paymentId as string },
        include: { booking: true },
      });
      expect(payment.status).toBe("PAID");
      expect(payment.booking.status).toBe("CONFIRMED");
      expect(payment.paidAt).not.toBeNull();

      const code = payment.booking.code;
      expect(
        await harness.prisma.notification.count({
          where: { userId: rider.userId, type: "PAYMENT_RECEIVED", title: { contains: code } },
        }),
      ).toBe(1);

      await cancel(http, rider, bookingId);
    });

    it("still cannot pay for a booking that was cancelled mid-checkout", async () => {
      const bookingId = await createBooking(241);
      const order = await createOrder(bookingId);
      const razorpayOrderId = order.body.order.id as string;
      const razorpayPaymentId = payForOrder(razorpayOrderId);

      expect((await cancel(http, rider, bookingId)).status).toBe(201);

      const conflict = await postApi(
        http,
        "/api/v1/payments/verify",
        {
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: checkoutSignature(razorpayOrderId, razorpayPaymentId),
        },
        rider.accessToken,
      );
      expect(conflict.status).toBe(409);
      expect(conflict.body.code).toBe("BOOKING_CANCELLED");

      // The gateway may still push the capture later; the money must be
      // recorded without resurrecting the cancelled booking.
      const body = paymentEvent(razorpayPaymentId);
      expect((await webhook(body, signWebhook(body))).status).toBe(201);

      const payment = await harness.prisma.payment.findUniqueOrThrow({
        where: { id: order.body.paymentId as string },
        include: { booking: true },
      });
      expect(payment.status).toBe("PAID");
      expect(payment.booking.status).toBe("CANCELLED");
      expect(
        await harness.prisma.vehicleAvailability.count({
          where: { bookingId: bookingId },
        }),
      ).toBe(0);
    });

    it("marks an order failed from a payment.failed event", async () => {
      const bookingId = await createBooking(251);
      const order = await createOrder(bookingId);
      const razorpayOrderId = order.body.order.id as string;
      const razorpayPaymentId = payForOrder(razorpayOrderId, {
        status: "failed",
        captured: false,
        error_code: "BAD_REQUEST_ERROR",
        error_description: "Insufficient funds",
      });
      const body = paymentEvent(razorpayPaymentId, "payment.failed");

      expect((await webhook(body, signWebhook(body))).status).toBe(201);
      const payment = await harness.prisma.payment.findUniqueOrThrow({
        where: { id: order.body.paymentId as string },
      });
      expect(payment.status).toBe("FAILED");
      expect(payment.failureMessage).toBe("Insufficient funds");

      await cancel(http, rider, bookingId);
    });

    it("rejects unsigned and forged webhooks", async () => {
      const body = eventBody("payment.captured", {
        payment: { entity: { id: "pay_forged", order_id: "order_forged" } },
      });

      const unsigned = await webhook(body);
      expect(unsigned.status).toBe(400);
      expect(unsigned.body.code).toBe("WEBHOOK_SIGNATURE_MISSING");

      const forged = await webhook(body, signWebhook(`${body}tampered`));
      expect(forged.status).toBe(400);
      expect(forged.body.code).toBe("WEBHOOK_SIGNATURE_INVALID");
    });

    it("acknowledges events about records it does not own", async () => {
      const body = eventBody("payment.captured", {
        payment: {
          entity: {
            id: "pay_unknown",
            order_id: "order_unknown",
            status: "captured",
            amount: 10_000,
          },
        },
      });
      const response = await webhook(body, signWebhook(body));

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ received: true, handled: false });
    });

    it("leaves payments invisible to anyone else", async () => {
      const stranger = await createRider(http, "nosy");
      emails.push(stranger.email);
      const theirs = await getApi(http, "/api/v1/payments", stranger.accessToken);
      expect(theirs.status).toBe(200);
      expect(theirs.body.data).toHaveLength(0);
      expect(theirs.body.meta.total).toBe(0);

      const mine = await getApi(http, "/api/v1/payments", rider.accessToken);
      expect(mine.status).toBe(200);
      expect(mine.body.meta.total).toBe(
        await harness.prisma.payment.count({
          where: { booking: { customerId: rider.userId } },
        }),
      );
      expect(mine.body.meta.total).toBeGreaterThan(0);
    });
  });
});
