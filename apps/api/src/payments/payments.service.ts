import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  BookingStatus,
  NotificationType,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  RefundStatus,
} from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { paginated } from "../common/dto/pagination.dto";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { RazorpayService } from "./razorpay.service";
import {
  CreatePaymentOrderDto,
  ManagePaymentsQueryDto,
  PaymentsQueryDto,
  RefundPaymentDto,
  VerifyPaymentDto,
} from "./payments.dto";

const paymentInclude = {
  booking: {
    select: {
      id: true,
      code: true,
      status: true,
      paymentStatus: true,
      customerId: true,
      totalAmount: true,
      driverId: true,
      customer: { select: { email: true, phone: true } },
    },
  },
  refunds: { orderBy: { createdAt: "desc" } },
} satisfies Prisma.PaymentInclude;

type PaymentWithRelations = Prisma.PaymentGetPayload<{
  include: typeof paymentInclude;
}>;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayService,
    private readonly notifications: NotificationsService,
  ) {}

  private serialize(payment: PaymentWithRelations) {
    return {
      id: payment.id,
      bookingId: payment.bookingId,
      bookingCode: payment.booking.code,
      bookingStatus: payment.booking.status,
      provider: payment.provider,
      method: payment.method,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      providerOrderId: payment.providerOrderId,
      providerPaymentId: payment.providerPaymentId,
      failureCode: payment.failureCode,
      failureMessage: payment.failureMessage,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      refunds: payment.refunds.map((refund) => ({
        id: refund.id,
        amount: Number(refund.amount),
        status: refund.status,
        reason: refund.reason,
        providerRefundId: refund.providerRefundId,
        processedAt: refund.processedAt,
        createdAt: refund.createdAt,
      })),
    };
  }

  private mapMethod(method: string | null | undefined): PaymentMethod | null {
    switch ((method ?? "").toLowerCase()) {
      case "upi":
        return PaymentMethod.UPI;
      case "card":
        return PaymentMethod.CARD;
      case "netbanking":
        return PaymentMethod.NETBANKING;
      case "wallet":
        return PaymentMethod.WALLET;
      default:
        return null;
    }
  }

  private async orderResponse(payment: PaymentWithRelations) {
    const amountPaise = Math.round(Number(payment.amount) * 100);
    return {
      paymentId: payment.id,
      bookingId: payment.bookingId,
      bookingCode: payment.booking.code,
      amount: Number(payment.amount),
      amountPaise,
      currency: payment.currency,
      keyId: this.razorpay.publicKeyId,
      order: {
        id: payment.providerOrderId,
        amount: amountPaise,
        currency: payment.currency,
        status: payment.status,
      },
    };
  }

  async createOrder(userId: string, dto: CreatePaymentOrderDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      select: {
        id: true,
        code: true,
        customerId: true,
        status: true,
        paymentStatus: true,
        totalAmount: true,
        currency: true,
      },
    });
    if (!booking) {
      throw new NotFoundException({
        message: "Booking not found",
        code: "BOOKING_NOT_FOUND",
      });
    }
    if (booking.customerId !== userId) {
      throw new ForbiddenException({
        message: "You can only pay for your own bookings",
        code: "BOOKING_FORBIDDEN",
      });
    }
    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.NO_SHOW
    ) {
      throw new BadRequestException({
        message: "This booking is closed",
        code: "BOOKING_CLOSED",
      });
    }
    if (booking.paymentStatus === PaymentStatus.PAID) {
      throw new ConflictException({
        message: "This booking is already paid",
        code: "BOOKING_ALREADY_PAID",
      });
    }
    if (Number(booking.totalAmount) <= 0) {
      throw new BadRequestException({
        message: "This booking has nothing to pay",
        code: "BOOKING_ZERO_AMOUNT",
      });
    }

    if (dto.idempotencyKey) {
      const prior = await this.prisma.payment.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: paymentInclude,
      });
      if (prior) {
        if (prior.bookingId !== booking.id) {
          throw new ConflictException({
            message: "Idempotency key was already used for another booking",
            code: "IDEMPOTENCY_KEY_REUSED",
          });
        }
        return this.orderResponse(prior);
      }
    }

    const pending = await this.prisma.payment.findFirst({
      where: {
        bookingId: booking.id,
        status: PaymentStatus.PENDING,
        providerOrderId: { not: null },
      },
      orderBy: { createdAt: "desc" },
      include: paymentInclude,
    });
    if (pending) {
      return this.orderResponse(pending);
    }

    if (!this.razorpay.isConfigured()) {
      throw new ServiceUnavailableException({
        message:
          "Online payments are not configured. Use cash at pickup or contact support.",
        code: "PAYMENT_PROVIDER_NOT_CONFIGURED",
      });
    }

    const amountPaise = Math.round(Number(booking.totalAmount) * 100);
    const order = await this.razorpay.createOrder({
      amountPaise,
      receipt: booking.code,
      notes: { bookingId: booking.id, bookingCode: booking.code },
    });

    const payment = await this.prisma.payment.create({
      data: {
        bookingId: booking.id,
        provider: PaymentProvider.RAZORPAY,
        method: null,
        amount: booking.totalAmount,
        currency: booking.currency,
        status: PaymentStatus.PENDING,
        providerOrderId: order.id,
        idempotencyKey: dto.idempotencyKey ?? null,
      },
      include: paymentInclude,
    });

    return this.orderResponse(payment);
  }

  private async applyPaid(
    payment: PaymentWithRelations,
    input: {
      providerPaymentId: string;
      method: PaymentMethod | null;
      paidAt: Date;
    },
  ) {
    if (payment.status === PaymentStatus.PAID) {
      return this.serialize(payment);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          providerPaymentId: input.providerPaymentId,
          method: input.method,
          paidAt: input.paidAt,
          failureCode: null,
          failureMessage: null,
        },
      });
      await tx.booking.update({
        where: { id: payment.bookingId },
        data: {
          paymentStatus: PaymentStatus.PAID,
          ...(payment.booking.status === BookingStatus.PENDING &&
          !payment.booking.driverId
            ? { status: BookingStatus.CONFIRMED }
            : {}),
        },
      });
    });

    await this.notifications.notify(
      payment.booking.customerId,
      NotificationType.PAYMENT_RECEIVED,
      `Payment received for ${payment.booking.code}`,
      `We received ₹${Number(payment.amount).toFixed(2)} for your booking ${payment.booking.code}.`,
      { bookingId: payment.bookingId, bookingCode: payment.booking.code, paymentId: payment.id },
    );

    const updated = await this.prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
      include: paymentInclude,
    });
    return this.serialize(updated);
  }

  async verify(userId: string, dto: VerifyPaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { providerOrderId: dto.razorpayOrderId },
      include: paymentInclude,
    });
    if (!payment) {
      throw new NotFoundException({
        message: "Payment order not found",
        code: "PAYMENT_NOT_FOUND",
      });
    }
    if (payment.booking.customerId !== userId) {
      throw new ForbiddenException({
        message: "You can only verify your own payments",
        code: "PAYMENT_FORBIDDEN",
      });
    }
    if (!this.razorpay.verifyCheckoutSignature({
      orderId: dto.razorpayOrderId,
      paymentId: dto.razorpayPaymentId,
      signature: dto.razorpaySignature,
    })) {
      throw new BadRequestException({
        message: "Payment signature verification failed",
        code: "PAYMENT_SIGNATURE_INVALID",
      });
    }

    if (
      payment.status === PaymentStatus.PAID &&
      payment.providerPaymentId === dto.razorpayPaymentId
    ) {
      return this.serialize(payment);
    }
    if (payment.booking.status === BookingStatus.CANCELLED) {
      throw new ConflictException({
        message: "The booking was cancelled before payment completed",
        code: "BOOKING_CANCELLED",
      });
    }

    const gateway = await this.razorpay.getPayment(dto.razorpayPaymentId);
    if (gateway.order_id !== payment.providerOrderId) {
      throw new BadRequestException({
        message: "Payment does not belong to this order",
        code: "PAYMENT_ORDER_MISMATCH",
      });
    }
    if (!["captured", "authorized"].includes(gateway.status)) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureCode: gateway.error_code,
          failureMessage: gateway.error_description,
        },
      });
      throw new BadRequestException({
        message: `Payment was not captured (gateway status: ${gateway.status})`,
        code: "PAYMENT_NOT_CAPTURED",
      });
    }
    if (gateway.amount < Math.round(Number(payment.amount) * 100)) {
      throw new BadRequestException({
        message: "Paid amount is less than the booking total",
        code: "PAYMENT_AMOUNT_MISMATCH",
      });
    }

    return this.applyPaid(payment, {
      providerPaymentId: gateway.id,
      method: this.mapMethod(gateway.method),
      paidAt: gateway.created_at
        ? new Date(gateway.created_at * 1000)
        : new Date(),
    });
  }

  async history(userId: string, query: PaymentsQueryDto) {
    const where: Prisma.PaymentWhereInput = {
      booking: { customerId: userId },
      ...(query.status ? { status: query.status } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        include: paymentInclude,
        orderBy: { createdAt: "desc" },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return paginated(rows.map((row) => this.serialize(row)), total, query.page, query.limit);
  }

  async listAll(query: ManagePaymentsQueryDto) {
    const where: Prisma.PaymentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.bookingId ? { bookingId: query.bookingId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { providerOrderId: { contains: query.q } },
              { providerPaymentId: { contains: query.q } },
              { booking: { code: { contains: query.q.toUpperCase() } } },
              {
                booking: {
                  customer: {
                    email: { contains: query.q, mode: "insensitive" },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        include: paymentInclude,
        orderBy: { createdAt: "desc" },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return paginated(
      rows.map((row) => ({
        ...this.serialize(row),
        customerEmail: row.booking.customer.email,
      })),
      total,
      query.page,
      query.limit,
    );
  }

  private async refreshRefundState(paymentId: string) {
    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: { refunds: true },
    });
    // Only money actually returned by the gateway moves the payment status.
    const refunded = payment.refunds
      .filter((refund) => refund.status === RefundStatus.COMPLETED)
      .reduce((sum, refund) => sum + Number(refund.amount), 0);
    const status =
      refunded <= 0
        ? PaymentStatus.PAID
        : refunded >= Number(payment.amount)
          ? PaymentStatus.REFUNDED
          : PaymentStatus.PARTIALLY_REFUNDED;

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status },
    });
    await this.prisma.booking.update({
      where: { id: payment.bookingId },
      data: { paymentStatus: status },
    });
    return { refunded, status };
  }

  private refundStatusFromGateway(status: string | null): RefundStatus {
    switch ((status ?? "").toLowerCase()) {
      case "processed":
        return RefundStatus.COMPLETED;
      case "failed":
        return RefundStatus.FAILED;
      default:
        return RefundStatus.PROCESSING;
    }
  }

  private async processRefund(
    payment: PaymentWithRelations,
    amount: number,
    reason: string,
  ) {
    if (
      payment.status !== PaymentStatus.PAID &&
      payment.status !== PaymentStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException({
        message: "Only captured payments can be refunded",
        code: "PAYMENT_NOT_REFUNDABLE",
      });
    }
    const alreadyRefunded = payment.refunds
      .filter((refund) => refund.status !== RefundStatus.FAILED)
      .reduce((sum, refund) => sum + Number(refund.amount), 0);
    const remaining =
      Math.round((Number(payment.amount) - alreadyRefunded) * 100) / 100;
    if (amount > remaining) {
      throw new BadRequestException({
        message: `Refund exceeds the remaining refundable amount of ₹${remaining}`,
        code: "REFUND_TOO_LARGE",
        details: { remaining },
      });
    }
    if (amount <= 0) {
      throw new BadRequestException({
        message: "Refund amount must be greater than zero",
        code: "REFUND_AMOUNT_INVALID",
      });
    }

    const refund = await this.prisma.refund.create({
      data: {
        paymentId: payment.id,
        amount: new Prisma.Decimal(amount),
        reason,
        status: RefundStatus.PENDING,
      },
    });

    let status: RefundStatus = RefundStatus.PENDING;
    let providerRefundId: string | null = null;

    if (this.razorpay.isConfigured() && payment.providerPaymentId) {
      try {
        const gateway = await this.razorpay.refundPayment(
          payment.providerPaymentId,
          Math.round(amount * 100),
          { reason, bookingId: payment.bookingId },
        );
        status = this.refundStatusFromGateway(gateway.status);
        providerRefundId = gateway.id;
        await this.prisma.refund.update({
          where: { id: refund.id },
          data: {
            status,
            providerRefundId,
            processedAt: status === RefundStatus.COMPLETED ? new Date() : null,
          },
        });
      } catch (error) {
        await this.prisma.refund.update({
          where: { id: refund.id },
          data: {
            status: RefundStatus.FAILED,
            reason: `${reason} — gateway error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        });
        await this.refreshRefundState(payment.id);
        throw error;
      }
    }

    await this.refreshRefundState(payment.id);

    if (status === RefundStatus.COMPLETED) {
      await this.notifications.notify(
        payment.booking.customerId,
        NotificationType.REFUND_PROCESSED,
        `Refund processed for ${payment.booking.code}`,
        `₹${amount.toFixed(2)} has been refunded to your original payment method.`,
        { bookingId: payment.bookingId, bookingCode: payment.booking.code, paymentId: payment.id },
      );
    }

    return {
      id: refund.id,
      amount,
      status,
      providerRefundId,
      message:
        status === RefundStatus.PENDING
          ? "Refund queued for manual processing; the payment gateway is not configured."
          : undefined,
    };
  }

  async refundBooking(bookingId: string, amount: number, reason: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        bookingId,
        status: {
          in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED],
        },
      },
      orderBy: { paidAt: "desc" },
      include: paymentInclude,
    });
    if (!payment) return null;

    const alreadyRefunded = payment.refunds
      .filter((refund) => refund.status !== RefundStatus.FAILED)
      .reduce((sum, refund) => sum + Number(refund.amount), 0);
    const remaining = Math.max(
      0,
      Math.round((Number(payment.amount) - alreadyRefunded) * 100) / 100,
    );
    const refundAmount = Math.min(amount, remaining);
    if (refundAmount <= 0) return null;

    return this.processRefund(payment, refundAmount, reason);
  }

  async refundPayment(_actor: AuthUser, paymentId: string, dto: RefundPaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: paymentInclude,
    });
    if (!payment) {
      throw new NotFoundException({
        message: "Payment not found",
        code: "PAYMENT_NOT_FOUND",
      });
    }
    const alreadyRefunded = payment.refunds
      .filter((refund) => refund.status !== RefundStatus.FAILED)
      .reduce((sum, refund) => sum + Number(refund.amount), 0);
    const remaining =
      Math.round((Number(payment.amount) - alreadyRefunded) * 100) / 100;
    const amount = dto.amount ?? remaining;
    return this.processRefund(payment, amount, dto.reason ?? "Refund issued by support");
  }

  async handleWebhook(rawBody: Buffer | string, signature: string | undefined) {
    if (!signature) {
      throw new BadRequestException({
        message: "Missing webhook signature",
        code: "WEBHOOK_SIGNATURE_MISSING",
      });
    }
    if (!this.razorpay.isWebhookConfigured()) {
      throw new ServiceUnavailableException({
        message: "RAZORPAY_WEBHOOK_SECRET is not configured",
        code: "WEBHOOK_NOT_CONFIGURED",
      });
    }
    if (!this.razorpay.verifyWebhookSignature(rawBody, signature)) {
      throw new BadRequestException({
        message: "Webhook signature verification failed",
        code: "WEBHOOK_SIGNATURE_INVALID",
      });
    }

    let event: {
      event?: string;
      payload?: Record<string, { entity?: Record<string, unknown> }>;
    };
    try {
      event = JSON.parse(rawBody.toString());
    } catch {
      throw new BadRequestException({
        message: "Webhook body is not valid JSON",
        code: "WEBHOOK_INVALID_BODY",
      });
    }

    const type = event.event ?? "";
    const entity = event.payload?.payment?.entity as
      | {
          id?: string;
          order_id?: string;
          amount?: number;
          method?: string;
          status?: string;
          error_code?: string;
          error_description?: string;
          created_at?: number;
        }
      | undefined;
    const refundEntity = event.payload?.refund?.entity as
      | { id?: string; payment_id?: string; status?: string; amount?: number }
      | undefined;

    if (type.startsWith("payment.") && entity?.order_id) {
      const payment = await this.prisma.payment.findUnique({
        where: { providerOrderId: entity.order_id },
        include: paymentInclude,
      });
      if (!payment) {
        this.logger.warn(
          `Webhook ${type} references unknown order ${entity.order_id}`,
        );
        return { received: true, event: type, handled: false };
      }

      if (type === "payment.captured" || type === "payment.authorized") {
        if (payment.status !== PaymentStatus.PAID) {
          await this.applyPaid(payment, {
            providerPaymentId: entity.id ?? "",
            method: this.mapMethod(entity.method),
            paidAt: entity.created_at
              ? new Date(entity.created_at * 1000)
              : new Date(),
          });
        }
      } else if (type === "payment.failed") {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            failureCode: entity.error_code ?? null,
            failureMessage: entity.error_description ?? null,
          },
        });
      }
      return { received: true, event: type, handled: true };
    }

    if (type.startsWith("refund.") && refundEntity?.id) {
      const refund = await this.prisma.refund.findFirst({
        where: {
          OR: [
            { providerRefundId: refundEntity.id },
            ...(refundEntity.payment_id
              ? [
                  {
                    status: RefundStatus.PENDING,
                    payment: { providerPaymentId: refundEntity.payment_id },
                  },
                ]
              : []),
          ],
        },
        orderBy: { createdAt: "desc" },
      });
      if (!refund) {
        this.logger.warn(`Webhook ${type} references unknown refund`);
        return { received: true, event: type, handled: false };
      }
      const status =
        type === "refund.failed"
          ? RefundStatus.FAILED
          : type === "refund.processed"
            ? RefundStatus.COMPLETED
            : RefundStatus.PROCESSING;
      await this.prisma.refund.update({
        where: { id: refund.id },
        data: {
          providerRefundId: refundEntity.id,
          status,
          processedAt: status === RefundStatus.COMPLETED ? new Date() : null,
        },
      });
      await this.refreshRefundState(refund.paymentId);
      return { received: true, event: type, handled: true };
    }

    return { received: true, event: type, handled: false };
  }
}
