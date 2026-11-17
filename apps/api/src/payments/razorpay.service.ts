import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "node:crypto";

const RAZORPAY_BASE = "https://api.razorpay.com/v1";

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string | null;
  status: string;
  notes: Record<string, string>;
  created_at: number;
}

export interface RazorpayPayment {
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

export interface RazorpayRefund {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  payment_id: string;
  status: string | null;
  created_at: number;
}

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly keyId?: string;
  private readonly keySecret?: string;
  private readonly webhookSecret?: string;

  constructor(config: ConfigService) {
    this.keyId = config.get<string>("RAZORPAY_KEY_ID") || undefined;
    this.keySecret = config.get<string>("RAZORPAY_KEY_SECRET") || undefined;
    this.webhookSecret =
      config.get<string>("RAZORPAY_WEBHOOK_SECRET") || undefined;
  }

  get publicKeyId(): string | null {
    return this.keyId ?? null;
  }

  isConfigured(): boolean {
    return Boolean(this.keyId && this.keySecret);
  }

  isWebhookConfigured(): boolean {
    return Boolean(this.webhookSecret);
  }

  private credentials() {
    if (!this.keyId || !this.keySecret) {
      throw new ServiceUnavailableException({
        message:
          "Online payments are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
        code: "PAYMENT_PROVIDER_NOT_CONFIGURED",
      });
    }
    return { keyId: this.keyId, keySecret: this.keySecret };
  }

  private async request<T>(
    path: string,
    init: { method: "GET" | "POST"; body?: unknown } = { method: "GET" },
  ): Promise<T> {
    const { keyId, keySecret } = this.credentials();
    const authorization = Buffer.from(`${keyId}:${keySecret}`).toString(
      "base64",
    );
    let response: Response;
    try {
      response = await fetch(`${RAZORPAY_BASE}${path}`, {
        method: init.method,
        headers: {
          Authorization: `Basic ${authorization}`,
          "Content-Type": "application/json",
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      });
    } catch (error) {
      this.logger.error(
        `Razorpay request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadGatewayException({
        message: "Could not reach the payment gateway",
        code: "PAYMENT_GATEWAY_UNREACHABLE",
      });
    }

    const payload = (await response.json().catch(() => null)) as
      | (T & { error?: { description?: string; code?: string; reason?: string } })
      | null;

    if (!response.ok || !payload) {
      const description =
        payload?.error?.description ??
        `Payment gateway responded with HTTP ${response.status}`;
      this.logger.error(`Razorpay ${init.method} ${path} failed: ${description}`);
      throw new BadGatewayException({
        message: description,
        code: "PAYMENT_GATEWAY_ERROR",
        details: {
          gatewayStatus: response.status,
          gatewayCode: payload?.error?.code,
          gatewayReason: payload?.error?.reason,
        },
      });
    }
    return payload;
  }

  createOrder(input: {
    amountPaise: number;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<RazorpayOrder> {
    return this.request<RazorpayOrder>("/orders", {
      method: "POST",
      body: {
        amount: input.amountPaise,
        currency: "INR",
        receipt: input.receipt,
        notes: input.notes,
      },
    });
  }

  getPayment(paymentId: string): Promise<RazorpayPayment> {
    return this.request<RazorpayPayment>(`/payments/${paymentId}`);
  }

  refundPayment(
    paymentId: string,
    amountPaise: number,
    notes?: Record<string, string>,
  ): Promise<RazorpayRefund> {
    return this.request<RazorpayRefund>(`/payments/${paymentId}/refund`, {
      method: "POST",
      body: { amount: amountPaise, notes },
    });
  }

  private hmac(payload: string, secret: string): string {
    return createHmac("sha256", secret).update(payload).digest("hex");
  }

  verifyCheckoutSignature(input: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    const { keySecret } = this.credentials();
    return this.safeEqual(
      this.hmac(`${input.orderId}|${input.paymentId}`, keySecret),
      input.signature,
    );
  }

  verifyWebhookSignature(rawBody: Buffer | string, signature: string): boolean {
    if (!this.webhookSecret) return false;
    return this.safeEqual(
      this.hmac(rawBody.toString(), this.webhookSecret),
      signature,
    );
  }

  private safeEqual(expected: string, received: string): boolean {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(received, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
