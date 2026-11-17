import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomInt } from "node:crypto";
import {
  AvailabilityStatus,
  BookingItemKind,
  BookingStatus,
  DriverVerificationStatus,
  NotificationType,
  PaymentStatus,
  Prisma,
  VehicleStatus,
} from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PaymentsService } from "../payments/payments.service";
import { CouponsService } from "../coupons/coupons.service";
import { paginated } from "../common/dto/pagination.dto";
import { isOverlapViolation } from "../common/utils/overlap-violation";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import {
  AssignDriverDto,
  CancelBookingDto,
  CreateBookingDto,
  ManageBookingsQueryDto,
  MyBookingsQueryDto,
  UpdateBookingStatusDto,
} from "./bookings.dto";
import {
  calculateBookingPricing,
  MAX_BOOKING_DAYS,
  money,
  rentalDays,
} from "./booking-pricing";
import { calculateCancellationRefund } from "./booking-policy";

const BOOKING_ADD_ONS: BookingItemKind[] = [
  BookingItemKind.HELMET,
  BookingItemKind.DELIVERY,
  BookingItemKind.INSURANCE,
];

const RESERVED_STATUSES = [
  AvailabilityStatus.BLOCKED,
  AvailabilityStatus.BOOKED,
  AvailabilityStatus.MAINTENANCE,
];

const bookingInclude = {
  vehicle: {
    include: {
      category: true,
      location: true,
      images: { orderBy: { sortOrder: "asc" }, take: 3 },
    },
  },
  pickupLocation: true,
  dropLocation: true,
  coupon: { select: { code: true, title: true, type: true, value: true } },
  driver: {
    select: {
      id: true,
      userId: true,
      fullName: true,
      rating: true,
      totalTrips: true,
      user: { select: { phone: true } },
    },
  },
  customer: {
    select: {
      id: true,
      email: true,
      phone: true,
      customerProfile: {
        select: {
          fullName: true,
          avatarUrl: true,
          licenceNumber: true,
          licenceVerifiedAt: true,
        },
      },
    },
  },
  items: { orderBy: { createdAt: "asc" } },
  payments: { orderBy: { createdAt: "desc" } },
  review: { select: { id: true, rating: true } },
} satisfies Prisma.BookingInclude;

type BookingWithRelations = Prisma.BookingGetPayload<{
  include: typeof bookingInclude;
}>;

const STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.PENDING]: [
    BookingStatus.CONFIRMED,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.CONFIRMED]: [
    BookingStatus.ONGOING,
    BookingStatus.NO_SHOW,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.ONGOING]: [BookingStatus.COMPLETED],
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.NO_SHOW]: [],
};

@Injectable()
export class BookingsService {
  private readonly taxPercent: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
    private readonly payments: PaymentsService,
    private readonly coupons: CouponsService,
  ) {
    const tax = Number(this.config.get<string>("BOOKING_TAX_PERCENT") ?? 0);
    this.taxPercent = Number.isFinite(tax) ? Math.min(50, Math.max(0, tax)) : 0;
  }

  private serialize(booking: BookingWithRelations) {
    const primary = booking.vehicle.images[0] ?? null;
    return {
      id: booking.id,
      code: booking.code,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      pickupAt: booking.pickupAt,
      returnAt: booking.returnAt,
      durationDays: booking.durationDays,
      currency: booking.currency,
      customer: {
        id: booking.customer.id,
        fullName:
          booking.customer.customerProfile?.fullName ?? "SavariGo rider",
        email: booking.customer.email,
        phone: booking.customer.phone,
        avatarUrl: booking.customer.customerProfile?.avatarUrl ?? null,
        licenceNumber: booking.customer.customerProfile?.licenceNumber ?? null,
        licenceVerified:
          booking.customer.customerProfile?.licenceVerifiedAt !== null &&
          booking.customer.customerProfile?.licenceVerifiedAt !== undefined,
      },
      vehicle: {
        id: booking.vehicle.id,
        slug: booking.vehicle.slug,
        name: booking.vehicle.name,
        brand: booking.vehicle.brand,
        category: booking.vehicle.category.name,
        image: primary?.url ?? null,
        location: {
          id: booking.vehicle.location.id,
          name: booking.vehicle.location.name,
          city: booking.vehicle.location.city,
        },
      },
      pickupLocation: this.location(booking.pickupLocation),
      dropLocation: booking.dropLocation
        ? this.location(booking.dropLocation)
        : null,
      driver: booking.driver
        ? {
            id: booking.driver.id,
            fullName: booking.driver.fullName,
            rating: Number(booking.driver.rating),
            totalTrips: booking.driver.totalTrips,
            phone:
              booking.status === BookingStatus.PENDING
                ? null
                : booking.driver.user.phone,
          }
        : null,
      coupon: booking.coupon
        ? {
            code: booking.coupon.code,
            title: booking.coupon.title,
            type: booking.coupon.type,
            value: Number(booking.coupon.value),
          }
        : null,
      amounts: {
        rentalAmount: Number(booking.rentalAmount),
        extrasAmount: Number(booking.extrasAmount),
        taxAmount: Number(booking.taxAmount),
        depositAmount: Number(booking.depositAmount),
        discountAmount: Number(booking.discountAmount),
        totalAmount: Number(booking.totalAmount),
        subtotal: money(
          Number(booking.rentalAmount) + Number(booking.extrasAmount),
        ),
      },
      items: booking.items.map((item) => ({
        id: item.id,
        kind: item.kind,
        label: item.label,
        quantity: item.quantity,
        unitAmount: Number(item.unitAmount),
        totalAmount: Number(item.totalAmount),
      })),
      payments: booking.payments.map((payment) => ({
        id: payment.id,
        provider: payment.provider,
        method: payment.method,
        amount: Number(payment.amount),
        status: payment.status,
        providerOrderId: payment.providerOrderId,
        providerPaymentId: payment.providerPaymentId,
        paidAt: payment.paidAt,
        failureMessage: payment.failureMessage,
        createdAt: payment.createdAt,
      })),
      review: booking.review,
      specialRequests: booking.specialRequests,
      cancelledAt: booking.cancelledAt,
      cancellationReason: booking.cancellationReason,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }

  private location(location: {
    id: string;
    name: string;
    slug: string;
    addressLine1: string;
    city: string;
    phone: string | null;
  }) {
    return {
      id: location.id,
      name: location.name,
      slug: location.slug,
      address: location.addressLine1,
      city: location.city,
      phone: location.phone,
    };
  }

  private window(dto: { pickupAt: string; returnAt: string }) {
    const pickupAt = new Date(dto.pickupAt);
    const returnAt = new Date(dto.returnAt);
    if (Number.isNaN(pickupAt.getTime()) || Number.isNaN(returnAt.getTime())) {
      throw new BadRequestException({
        message: "pickupAt and returnAt must be valid dates",
        code: "INVALID_DATE_RANGE",
      });
    }
    if (returnAt.getTime() <= pickupAt.getTime()) {
      throw new BadRequestException({
        message: "returnAt must be after pickupAt",
        code: "INVALID_DATE_RANGE",
      });
    }
    if (pickupAt.getTime() < Date.now() - 5 * 60_000) {
      throw new BadRequestException({
        message: "Pickup time cannot be in the past",
        code: "PICKUP_IN_PAST",
      });
    }
    const days = rentalDays(pickupAt, returnAt);
    if (days > MAX_BOOKING_DAYS) {
      throw new BadRequestException({
        message: `Bookings are limited to ${MAX_BOOKING_DAYS} days`,
        code: "BOOKING_TOO_LONG",
      });
    }
    return { pickupAt, returnAt, days };
  }

  private normalizeAddOns(addOns?: BookingItemKind[]): BookingItemKind[] {
    if (!addOns?.length) return [];
    const unique = [...new Set(addOns)];
    const invalid = unique.filter((kind) => !BOOKING_ADD_ONS.includes(kind));
    if (invalid.length) {
      throw new BadRequestException({
        message: "Unsupported add-on selected",
        code: "INVALID_ADD_ON",
        details: { invalid },
      });
    }
    return unique;
  }

  private async prepare(
    dto: CreateBookingDto,
    client: PrismaService | Prisma.TransactionClient,
  ) {
    const { pickupAt, returnAt, days } = this.window(dto);

    const vehicle = await client.vehicle.findFirst({
      where: { id: dto.vehicleId, status: VehicleStatus.AVAILABLE },
      include: {
        category: true,
        location: true,
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        pricing: {
          where: {
            isActive: true,
            validFrom: { lte: pickupAt },
            OR: [{ validTo: null }, { validTo: { gte: pickupAt } }],
          },
          orderBy: { validFrom: "desc" },
          take: 1,
        },
      },
    });
    if (!vehicle) {
      throw new NotFoundException({
        message: "Vehicle is not available for booking",
        code: "VEHICLE_NOT_AVAILABLE",
      });
    }

    const plan =
      vehicle.pricing[0] ??
      (await client.pricing.findFirst({
        where: { vehicleId: vehicle.id, isActive: true },
        orderBy: { validFrom: "desc" },
      }));
    if (!plan) {
      throw new BadRequestException({
        message: "This vehicle has no active pricing",
        code: "VEHICLE_HAS_NO_PRICING",
      });
    }
    if (days < plan.minDays) {
      throw new BadRequestException({
        message: `This vehicle has a ${plan.minDays}-day minimum rental`,
        code: "MIN_RENTAL_DAYS",
        details: { minDays: plan.minDays },
      });
    }

    const pickupLocation = await client.vehicleLocation.findFirst({
      where: { id: dto.pickupLocationId, isActive: true },
      select: { id: true, name: true, addressLine1: true },
    });
    if (!pickupLocation) {
      throw new BadRequestException({
        message: "Pickup location is not available",
        code: "PICKUP_LOCATION_UNAVAILABLE",
      });
    }
    if (dto.dropLocationId) {
      const dropLocation = await client.vehicleLocation.findFirst({
        where: { id: dto.dropLocationId, isActive: true },
        select: { id: true },
      });
      if (!dropLocation) {
        throw new BadRequestException({
          message: "Drop location is not available",
          code: "DROP_LOCATION_UNAVAILABLE",
        });
      }
    }

    const driver = dto.driverId
      ? await client.driverProfile.findFirst({
          where: {
            id: dto.driverId,
            verificationStatus: DriverVerificationStatus.VERIFIED,
          },
          select: {
            id: true,
            userId: true,
            fullName: true,
            dailyRate: true,
            isAvailable: true,
          },
        })
      : null;
    if (dto.driverId && !driver) {
      throw new NotFoundException({
        message: "Driver not found or not verified",
        code: "DRIVER_NOT_AVAILABLE",
      });
    }

    const addOns = this.normalizeAddOns(dto.addOns);
    const pricing = calculateBookingPricing({
      plan: {
        baseDayRate: Number(plan.baseDayRate),
        depositAmount: Number(plan.depositAmount),
        mileageLimitKm: plan.mileageLimitKm,
        minDays: plan.minDays,
        weeklyDiscountPercent:
          plan.weeklyDiscountPercent === null
            ? null
            : Number(plan.weeklyDiscountPercent),
        monthlyDiscountPercent:
          plan.monthlyDiscountPercent === null
            ? null
            : Number(plan.monthlyDiscountPercent),
      },
      durationDays: days,
      addOns,
      driverDailyRate: driver ? Number(driver.dailyRate) : null,
      taxPercent: this.taxPercent,
    });

    return { pickupAt, returnAt, days, vehicle, plan, pickupLocation, driver, addOns, pricing };
  }

  async quote(dto: CreateBookingDto) {
    const prepared = await this.prepare(dto, this.prisma);
    const { pricing, vehicle } = prepared;

    let coupon: { code: string; discount: number } | null = null;
    if (dto.couponCode) {
      const evaluation = await this.coupons.evaluate(
        dto.couponCode,
        {
          customerId: "",
          vehicleId: vehicle.id,
          categoryId: vehicle.categoryId,
          subtotal: pricing.subtotal,
          durationDays: pricing.durationDays,
        },
        this.prisma,
        { skipUserLimit: true },
      );
      coupon = {
        code: evaluation.coupon.code,
        discount: evaluation.discount,
      };
    }

    const discount = coupon?.discount ?? 0;
    const taxable = Math.max(0, pricing.subtotal - discount);
    const taxAmount = money((taxable * this.taxPercent) / 100);
    const totalAmount = money(taxable + taxAmount + pricing.depositAmount);

    return {
      vehicle: {
        id: vehicle.id,
        slug: vehicle.slug,
        name: vehicle.name,
        brand: vehicle.brand,
        category: vehicle.category.name,
        image: vehicle.images[0]?.url ?? null,
      },
      pickupAt: prepared.pickupAt,
      returnAt: prepared.returnAt,
      durationDays: pricing.durationDays,
      pickupLocation: prepared.pickupLocation,
      dropLocationId: dto.dropLocationId ?? null,
      driver: prepared.driver
        ? {
            id: prepared.driver.id,
            fullName: prepared.driver.fullName,
            dailyRate: Number(prepared.driver.dailyRate),
          }
        : dto.requestDriver
          ? { requested: true, id: null }
          : null,
      pricing: {
        baseDayRate: Number(prepared.plan.baseDayRate),
        grossRentalAmount: pricing.grossRentalAmount,
        durationDiscount: pricing.durationDiscount,
        rentalAmount: pricing.rentalAmount,
        extrasAmount: pricing.extrasAmount,
        subtotal: pricing.subtotal,
        coupon,
        discountAmount: discount,
        taxPercent: this.taxPercent,
        taxAmount,
        depositAmount: pricing.depositAmount,
        totalAmount,
        currency: prepared.plan.currency,
      },
      items: pricing.items,
    };
  }

  private async generateCode(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = `SVR${randomInt(100_000, 1_000_000)}`;
      const existing = await tx.booking.findUnique({
        where: { code },
        select: { id: true },
      });
      if (!existing) return code;
    }
    throw new ConflictException({
      message: "Could not allocate a booking reference, please retry",
      code: "BOOKING_CODE_EXHAUSTED",
    });
  }

  async create(userId: string, dto: CreateBookingDto) {
    const created = await this.prisma.$transaction(async (tx) => {
      const prepared = await this.prepare(dto, tx);
      const { pickupAt, returnAt, vehicle, driver, pricing } = prepared;

      const overlap = await tx.vehicleAvailability.findFirst({
        where: {
          vehicleId: vehicle.id,
          status: { in: RESERVED_STATUSES },
          startsAt: { lt: returnAt },
          endsAt: { gt: pickupAt },
        },
        select: { id: true, startsAt: true, endsAt: true, status: true },
      });
      if (overlap) {
        throw new ConflictException({
          message: "Those dates are no longer available",
          code: "BOOKING_CONFLICT",
          details: overlap,
        });
      }

      let couponId: string | null = null;
      let discountAmount = 0;
      if (dto.couponCode) {
        const evaluation = await this.coupons.evaluate(
          dto.couponCode,
          {
            customerId: userId,
            vehicleId: vehicle.id,
            categoryId: vehicle.categoryId,
            subtotal: pricing.subtotal,
            durationDays: pricing.durationDays,
          },
          tx,
        );
        couponId = evaluation.coupon.id;
        discountAmount = evaluation.discount;
      }

      const taxable = Math.max(0, pricing.subtotal - discountAmount);
      const taxAmount = money((taxable * this.taxPercent) / 100);
      const totalAmount = money(taxable + taxAmount + pricing.depositAmount);
      const code = await this.generateCode(tx);

      const booking = await tx.booking.create({
        data: {
          code,
          customerId: userId,
          vehicleId: vehicle.id,
          pickupLocationId: dto.pickupLocationId,
          dropLocationId: dto.dropLocationId ?? null,
          couponId,
          driverId: driver?.id ?? null,
          pickupAt,
          returnAt,
          durationDays: pricing.durationDays,
          status: BookingStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          rentalAmount: new Prisma.Decimal(pricing.rentalAmount),
          extrasAmount: new Prisma.Decimal(pricing.extrasAmount),
          taxAmount: new Prisma.Decimal(taxAmount),
          depositAmount: new Prisma.Decimal(pricing.depositAmount),
          discountAmount: new Prisma.Decimal(discountAmount),
          totalAmount: new Prisma.Decimal(totalAmount),
          specialRequests: dto.specialRequests ?? null,
          items: {
            create: pricing.items.map((item) => ({
              kind: item.kind,
              label: item.label,
              quantity: item.quantity,
              unitAmount: new Prisma.Decimal(item.unitAmount),
              totalAmount: new Prisma.Decimal(item.totalAmount),
            })),
          },
        },
        include: bookingInclude,
      });

      // A BOOKED row reserves the window for this vehicle. The GiST exclusion
      // constraint is the final guard against concurrent double bookings.
      await tx.vehicleAvailability.create({
        data: {
          vehicleId: vehicle.id,
          bookingId: booking.id,
          startsAt: pickupAt,
          endsAt: returnAt,
          status: AvailabilityStatus.BOOKED,
          note: `Booking ${booking.code}`,
        },
      });

      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      return booking;
    })
      .catch((error: unknown) => {
        if (!isOverlapViolation(error)) throw error;
        // The exclusion constraint refused this rider rather than the pre-check,
        // which means they lost a race for the very same window. Same answer.
        throw new ConflictException({
          message: "Those dates are no longer available",
          code: "BOOKING_CONFLICT",
        });
      });

    await this.notifications.notify(
      userId,
      NotificationType.SYSTEM,
      `Booking ${created.code} received`,
      `We have reserved ${created.vehicle.name} from ${created.pickupAt.toISOString()}. Complete payment to confirm.`,
      { bookingId: created.id, bookingCode: created.code },
    );
    if (created.driver) {
      await this.notifications.notify(
        created.driver.userId,
        NotificationType.SYSTEM,
        "New booking request",
        `You have a new request for booking ${created.code}.`,
        { bookingId: created.id, bookingCode: created.code },
      );
    }

    return this.serialize(created);
  }

  async listMine(userId: string, query: MyBookingsQueryDto) {
    const where: Prisma.BookingWhereInput = {
      customerId: userId,
      ...(query.status ? { status: query.status } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        include: bookingInclude,
        orderBy: { pickupAt: "desc" },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.booking.count({ where }),
    ]);
    return paginated(rows.map((row) => this.serialize(row)), total, query.page, query.limit);
  }

  async getMine(userId: string, idOrCode: string) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        OR: [{ id: this.uuidOrUndefined(idOrCode) }, { code: idOrCode.toUpperCase() }],
        customerId: userId,
      },
      include: bookingInclude,
    });
    if (!booking) {
      throw new NotFoundException({
        message: "Booking not found",
        code: "BOOKING_NOT_FOUND",
      });
    }
    return this.serialize(booking);
  }

  async listForStaff(query: ManageBookingsQueryDto) {
    const where: Prisma.BookingWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
      ...(query.driverId ? { driverId: query.driverId } : {}),
      ...(query.from || query.to
        ? {
            pickupAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { code: { contains: query.q.toUpperCase() } },
              { customer: { email: { contains: query.q, mode: "insensitive" } } },
              { customer: { phone: { contains: query.q } } },
              { vehicle: { name: { contains: query.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        include: bookingInclude,
        orderBy: { createdAt: "desc" },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.booking.count({ where }),
    ]);
    return paginated(rows.map((row) => this.serialize(row)), total, query.page, query.limit);
  }

  async getForStaff(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: bookingInclude,
    });
    if (!booking) {
      throw new NotFoundException({
        message: "Booking not found",
        code: "BOOKING_NOT_FOUND",
      });
    }
    return this.serialize(booking);
  }

  async getManaged(actor: AuthUser, id: string) {
    const { booking } = await this.loadForActor(actor, id);
    return this.getForStaff(booking.id);
  }

  private async loadForActor(actor: AuthUser, id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        ...bookingInclude,
        vehicle: { select: { ownerId: true, name: true } },
      },
    });
    if (!booking) {
      throw new NotFoundException({
        message: "Booking not found",
        code: "BOOKING_NOT_FOUND",
      });
    }
    const isOwner = booking.customerId === actor.id;
    const isStaff =
      actor.roles.includes("ADMIN") || actor.roles.includes("SUPPORT");
    const isVehicleOwner =
      actor.roles.includes("VENDOR") && booking.vehicle.ownerId === actor.id;
    if (!isOwner && !isStaff && !isVehicleOwner) {
      throw new ForbiddenException({
        message: "You cannot access this booking",
        code: "BOOKING_FORBIDDEN",
      });
    }
    return { booking, isStaff: isStaff || isVehicleOwner };
  }

  async cancel(actor: AuthUser, id: string, dto: CancelBookingDto) {
    const { booking } = await this.loadForActor(actor, id);
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException({
        message: "Booking is already cancelled",
        code: "BOOKING_ALREADY_CANCELLED",
      });
    }
    if (
      booking.status === BookingStatus.COMPLETED ||
      booking.status === BookingStatus.NO_SHOW
    ) {
      throw new BadRequestException({
        message: "This booking can no longer be cancelled",
        code: "INVALID_BOOKING_STATUS",
      });
    }

    const refund = calculateCancellationRefund({
      pickupAt: booking.pickupAt,
      durationDays: booking.durationDays,
      rentalAmount: Number(booking.rentalAmount),
      depositAmount: Number(booking.depositAmount),
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: dto.reason ?? "Cancelled by customer",
        },
      });
      await tx.vehicleAvailability.deleteMany({
        where: { bookingId: booking.id },
      });
      if (booking.couponId) {
        await tx.coupon.updateMany({
          where: { id: booking.couponId, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
      }
    });

    let refundResult: {
      amount: number;
      status: string;
      providerRefundId?: string | null;
      message?: string;
    };
    try {
      const processed = await this.payments.refundBooking(
        booking.id,
        refund.totalRefund,
        dto.reason ?? "Booking cancelled",
      );
      refundResult = processed
        ? {
            amount: processed.amount,
            status: processed.status,
            providerRefundId: processed.providerRefundId,
          }
        : {
            amount: refund.totalRefund,
            status: "NOT_DUE",
            message:
              "No captured payment exists for this booking; nothing was charged.",
          };
    } catch (error) {
      refundResult = {
        amount: refund.totalRefund,
        status: "FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Refund could not be processed automatically",
      };
    }

    await this.notifications.notify(
      booking.customerId,
      NotificationType.BOOKING_CANCELLED,
      `Booking ${booking.code} cancelled`,
      `Your booking was cancelled. ${refund.policy}.`,
      { bookingId: booking.id, bookingCode: booking.code },
    );

    return {
      booking: await this.getForStaff(booking.id),
      cancellation: {
        cancelledAt: new Date(),
        reason: dto.reason ?? null,
        ...refund,
        refund: refundResult,
      },
    };
  }

  async updateStatus(actor: AuthUser, id: string, dto: UpdateBookingStatusDto) {
    const { booking } = await this.loadForActor(actor, id);
    if (dto.status === BookingStatus.CANCELLED) {
      throw new BadRequestException({
        message: "Use the cancellation endpoint so refunds are calculated",
        code: "USE_CANCEL_ENDPOINT",
      });
    }
    const allowed = STATUS_TRANSITIONS[booking.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException({
        message: `Cannot move a booking from ${booking.status} to ${dto.status}`,
        code: "INVALID_BOOKING_STATUS",
        details: { from: booking.status, to: dto.status, allowed },
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: dto.status },
      });
      if (
        dto.status === BookingStatus.COMPLETED ||
        dto.status === BookingStatus.NO_SHOW
      ) {
        await tx.vehicleAvailability.deleteMany({
          where: { bookingId: booking.id },
        });
      }
      if (dto.status === BookingStatus.COMPLETED && booking.driverId) {
        await tx.driverProfile.update({
          where: { id: booking.driverId },
          data: { totalTrips: { increment: 1 } },
        });
      }
    });

    const messages: Record<string, string> = {
      [BookingStatus.CONFIRMED]: `Booking ${booking.code} is confirmed.`,
      [BookingStatus.ONGOING]: `Your ${booking.vehicle.name} rental is now underway.`,
      [BookingStatus.COMPLETED]: `Thanks for riding with SavariGo. Booking ${booking.code} is complete — we would love your review.`,
      [BookingStatus.NO_SHOW]: `Booking ${booking.code} was marked as a no-show.`,
    };
    await this.notifications.notify(
      booking.customerId,
      dto.status === BookingStatus.COMPLETED
        ? NotificationType.SYSTEM
        : NotificationType.BOOKING_CONFIRMED,
      `Booking ${booking.code} ${dto.status.toLowerCase()}`,
      dto.note ?? messages[dto.status] ?? `Booking status updated to ${dto.status}.`,
      { bookingId: booking.id, bookingCode: booking.code },
    );

    return this.getForStaff(booking.id);
  }

  async assignDriver(actor: AuthUser, id: string, dto: AssignDriverDto) {
    const { booking } = await this.loadForActor(actor, id);
    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.COMPLETED
    ) {
      throw new BadRequestException({
        message: "The booking is closed",
        code: "INVALID_BOOKING_STATUS",
      });
    }

    if (dto.driverId === null) {
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { driverId: null },
      });
      return this.getForStaff(booking.id);
    }
    if (!dto.driverId) {
      throw new BadRequestException({
        message: "Provide a driverId or null to unassign",
        code: "DRIVER_ID_REQUIRED",
      });
    }

    const driver = await this.prisma.driverProfile.findFirst({
      where: {
        id: dto.driverId,
        verificationStatus: DriverVerificationStatus.VERIFIED,
      },
      select: { id: true, userId: true, fullName: true },
    });
    if (!driver) {
      throw new NotFoundException({
        message: "Driver not found or not verified",
        code: "DRIVER_NOT_AVAILABLE",
      });
    }

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { driverId: driver.id },
    });

    await this.notifications.notify(
      driver.userId,
      NotificationType.SYSTEM,
      "New booking request",
      `You have been assigned booking ${booking.code}.`,
      { bookingId: booking.id, bookingCode: booking.code },
    );

    return this.getForStaff(booking.id);
  }

  private uuidOrUndefined(value: string): string | undefined {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
      ? value
      : undefined;
  }
}
