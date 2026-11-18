import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BookingStatus,
  Prisma,
  VehicleStatus,
} from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { paginated } from "../common/dto/pagination.dto";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { UpdateVendorProfileDto, VendorBookingQueryDto, VendorAvailabilityQueryDto } from "./vendors.dto";

const BOOKING_INCLUDE = {
  customer: {
    select: { email: true, customerProfile: { select: { fullName: true } } },
  },
  vehicle: {
    select: {
      id: true,
      name: true,
      slug: true,
      registrationNumber: true,
      category: { select: { name: true } },
    },
  },
  pickupLocation: { select: { name: true, city: true } },
  dropLocation: { select: { name: true, city: true } },
  driver: { select: { fullName: true } },
  coupon: { select: { code: true } },
  payments: { select: { id: true, amount: true, status: true, paidAt: true } },
} satisfies Prisma.BookingInclude;

type BookingWithRelations = Prisma.BookingGetPayload<{
  include: typeof BOOKING_INCLUDE;
}>;

@Injectable()
export class VendorPortalService {
  constructor(private readonly prisma: PrismaService) {}

  /** Every partner endpoint starts here: the caller's own profile only. */
  async profileOf(userId: string) {
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            email: true,
            phone: true,
            lastLoginAt: true,
            userRoles: { include: { role: { select: { name: true } } } },
          },
        },
      },
    });
    if (!profile) {
      throw new NotFoundException({
        message: "No rental partner profile is linked to this account",
        code: "PARTNER_PROFILE_MISSING",
      });
    }
    return profile;
  }

  async vendorIdFor(userId: string) {
    const profile = await this.profileOf(userId);
    return profile.id;
  }

  async profile(actor: AuthUser) {
    const profile = await this.profileOf(actor.id);
    return {
      id: profile.id,
      partnerCode: profile.partnerCode,
      tradingName: profile.tradingName,
      legalName: profile.legalName,
      logoUrl: profile.logoUrl,
      phone: profile.phone,
      city: profile.city,
      state: profile.state,
      addressLine1: profile.addressLine1,
      gstin: profile.gstin,
      commissionPercent: Number(profile.commissionPercent),
      status: profile.status,
      decisionNote: profile.decisionNote,
      approvedAt: profile.approvedAt,
      createdAt: profile.createdAt,
      email: profile.user.email,
      roles: profile.user.userRoles.map((entry) => entry.role.name),
    };
  }

  async updateProfile(actor: AuthUser, dto: UpdateVendorProfileDto) {
    const profile = await this.profileOf(actor.id);
    const row = await this.prisma.vendorProfile.update({
      where: { id: profile.id },
      data: {
        ...(dto.tradingName !== undefined ? { tradingName: dto.tradingName } : {}),
        ...(dto.legalName !== undefined ? { legalName: dto.legalName } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
        ...(dto.state !== undefined ? { state: dto.state } : {}),
        ...(dto.addressLine1 !== undefined
          ? { addressLine1: dto.addressLine1 }
          : {}),
      },
    });
    return {
      id: row.id,
      partnerCode: row.partnerCode,
      tradingName: row.tradingName,
      legalName: row.legalName,
      logoUrl: row.logoUrl,
      phone: row.phone,
      city: row.city,
      state: row.state,
      addressLine1: row.addressLine1,
      gstin: row.gstin,
      commissionPercent: Number(row.commissionPercent),
      status: row.status,
    };
  }

  async overview(actor: AuthUser) {
    const profile = await this.profileOf(actor.id);
    const ownerId = profile.userId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [vehicleGroups, bookingGroups, active, monthRows, allRows, recent, reviews] =
      await Promise.all([
        this.prisma.vehicle.groupBy({
          by: ["status"],
          where: { ownerId },
          _count: { _all: true },
        }),
        this.prisma.booking.groupBy({
          by: ["status"],
          where: { vehicle: { ownerId } },
          _count: { _all: true },
        }),
        this.prisma.booking.count({
          where: {
            vehicle: { ownerId },
            status: { in: [BookingStatus.CONFIRMED, BookingStatus.ONGOING] },
          },
        }),
        this.prisma.payment.findMany({
          where: {
            paidAt: { gte: monthStart },
            booking: { vehicle: { ownerId } },
          },
          select: { amount: true },
        }),
        this.prisma.payment.findMany({
          where: { paidAt: { not: null }, booking: { vehicle: { ownerId } } },
          select: { amount: true },
        }),
        this.prisma.booking.findMany({
          where: { vehicle: { ownerId } },
          orderBy: { createdAt: "desc" },
          take: 8,
          include: BOOKING_INCLUDE,
        }),
        this.prisma.review.aggregate({
          where: { vehicle: { ownerId }, isPublished: true },
          _count: { _all: true },
          _avg: { rating: true },
        }),
      ]);

    const commissionPercent = Number(profile.commissionPercent);
    const grossMonth = monthRows.reduce((sum, row) => sum + Number(row.amount), 0);
    const grossTotal = allRows.reduce((sum, row) => sum + Number(row.amount), 0);
    const byStatus = Object.fromEntries(
      vehicleGroups.map((row) => [row.status, row._count._all]),
    ) as Record<VehicleStatus, number>;
    const bookingsByStatus = Object.fromEntries(
      bookingGroups.map((row) => [row.status, row._count._all]),
    ) as Record<BookingStatus, number>;

    return {
      partner: {
        id: profile.id,
        partnerCode: profile.partnerCode,
        tradingName: profile.tradingName,
        status: profile.status,
        commissionPercent,
        city: profile.city,
      },
      vehicles: {
        total: vehicleGroups.reduce((sum, row) => sum + row._count._all, 0),
        available: byStatus[VehicleStatus.AVAILABLE] ?? 0,
        byStatus,
      },
      bookings: {
        total: bookingGroups.reduce((sum, row) => sum + row._count._all, 0),
        pending: bookingsByStatus[BookingStatus.PENDING] ?? 0,
        active,
        completed: bookingsByStatus[BookingStatus.COMPLETED] ?? 0,
        cancelled: bookingsByStatus[BookingStatus.CANCELLED] ?? 0,
        byStatus: bookingsByStatus,
      },
      earnings: {
        currency: "INR",
        commissionPercent,
        monthGross: round(grossMonth),
        monthCommission: round((grossMonth * commissionPercent) / 100),
        monthNet: round(grossMonth * (1 - commissionPercent / 100)),
        totalGross: round(grossTotal),
        totalNet: round(grossTotal * (1 - commissionPercent / 100)),
      },
      reviews: {
        count: reviews._count._all,
        average: reviews._avg.rating ? Number(reviews._avg.rating.toFixed(2)) : 0,
      },
      pendingApprovals: byStatus[VehicleStatus.DRAFT] ?? 0,
      recentBookings: recent.map((booking) => this.shapeBooking(booking)),
    };
  }

  async bookings(actor: AuthUser, query: VendorBookingQueryDto) {
    const profile = await this.profileOf(actor.id);
    const where: Prisma.BookingWhereInput = {
      vehicle: {
        ownerId: profile.userId,
        ...(query.vehicleId ? { id: query.vehicleId } : {}),
      },
      ...(query.status ? { status: toBookingStatus(query.status) } : {}),
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
              { code: { contains: query.q, mode: "insensitive" } },
              { customer: { email: { contains: query.q, mode: "insensitive" } } },
              {
                customer: {
                  customerProfile: { fullName: { contains: query.q, mode: "insensitive" } },
                },
              },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        orderBy: { pickupAt: "desc" },
        skip: query.skip,
        take: query.limit,
        include: BOOKING_INCLUDE,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return paginated(
      rows.map((row) => this.shapeBooking(row)),
      total,
      query.page,
      query.limit,
    );
  }

  async earnings(actor: AuthUser) {
    const profile = await this.profileOf(actor.id);
    const commissionPercent = Number(profile.commissionPercent);
    const now = new Date();

    const [payments, refunds] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          paidAt: { not: null },
          booking: { vehicle: { ownerId: profile.userId } },
        },
        select: {
          id: true,
          amount: true,
          paidAt: true,
          provider: true,
          method: true,
          booking: {
            select: {
              id: true,
              code: true,
              totalAmount: true,
              vehicle: { select: { name: true } },
            },
          },
        },
        orderBy: { paidAt: "desc" },
      }),
      this.prisma.refund.aggregate({
        where: {
          status: "COMPLETED",
          payment: { booking: { vehicle: { ownerId: profile.userId } } },
        },
        _sum: { amount: true },
      }),
    ]);

    const months = new Map<string, { gross: number; net: number }>();
    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      months.set(monthKey(date), { gross: 0, net: 0 });
    }

    let lifetimeGross = 0;
    for (const payment of payments) {
      if (!payment.paidAt) continue;
      const amount = Number(payment.amount);
      lifetimeGross += amount;
      const bucket = months.get(monthKey(payment.paidAt));
      if (bucket) {
        bucket.gross += amount;
        bucket.net += amount * (1 - commissionPercent / 100);
      }
    }

    const refunded = Number(refunds._sum.amount ?? 0);

    return {
      partner: {
        partnerCode: profile.partnerCode,
        tradingName: profile.tradingName,
        commissionPercent,
      },
      currency: "INR",
      lifetime: {
        gross: round(lifetimeGross),
        commission: round((lifetimeGross * commissionPercent) / 100),
        net: round(lifetimeGross * (1 - commissionPercent / 100)),
        refunded: round(refunded),
      },
      monthly: [...months.entries()].map(([month, value]) => ({
        month,
        gross: round(value.gross),
        commission: round((value.gross * commissionPercent) / 100),
        net: round(value.net),
      })),
      transactions: payments.slice(0, 40).map((payment) => ({
        id: payment.id,
        bookingId: payment.booking.id,
        bookingCode: payment.booking.code,
        vehicleName: payment.booking.vehicle.name,
        amount: Number(payment.amount),
        bookingTotal: Number(payment.booking.totalAmount),
        provider: payment.provider,
        method: payment.method,
        paidAt: payment.paidAt,
      })),
    };
  }

  async availability(actor: AuthUser, query: VendorAvailabilityQueryDto) {
    const profile = await this.profileOf(actor.id);
    const from = query.from ? new Date(query.from) : startOfToday();
    const to = query.to ? new Date(query.to) : addDays(from, 60);

    const [vehicles, rows] = await Promise.all([
      this.prisma.vehicle.findMany({
        where: {
          ownerId: profile.userId,
          ...(query.vehicleId ? { id: query.vehicleId } : {}),
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true, status: true, slug: true },
      }),
      this.prisma.vehicleAvailability.findMany({
        where: {
          vehicle: { ownerId: profile.userId },
          ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
          startsAt: { lte: to },
          endsAt: { gte: from },
        },
        orderBy: { startsAt: "asc" },
        select: {
          id: true,
          vehicleId: true,
          startsAt: true,
          endsAt: true,
          status: true,
          note: true,
          bookingId: true,
        },
      }),
    ]);

    return {
      from,
      to,
      vehicles: vehicles.map((vehicle) => ({
        id: vehicle.id,
        name: vehicle.name,
        slug: vehicle.slug,
        status: vehicle.status,
      })),
      rows: rows.map((row) => ({
        id: row.id,
        vehicleId: row.vehicleId,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        status: row.status,
        note: row.note,
        bookingId: row.bookingId,
      })),
    };
  }

  /** Published reviews on this partner's own fleet, with the star spread. */
  async reviews(actor: AuthUser) {
    const profile = await this.profileOf(actor.id);

    const rows = await this.prisma.review.findMany({
      where: { vehicle: { ownerId: profile.userId }, isPublished: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        rating: true,
        title: true,
        comment: true,
        createdAt: true,
        booking: { select: { code: true } },
        vehicle: { select: { id: true, name: true, slug: true } },
        customer: { select: { customerProfile: { select: { fullName: true } } } },
      },
    });

    const perVehicle = new Map<
      string,
      { name: string; slug: string; count: number; total: number }
    >();
    const spread = [1, 2, 3, 4, 5].map((stars) => ({
      stars,
      count: rows.filter((row) => row.rating === stars).length,
    }));

    for (const row of rows) {
      const entry = perVehicle.get(row.vehicle.id) ?? {
        name: row.vehicle.name,
        slug: row.vehicle.slug,
        count: 0,
        total: 0,
      };
      entry.count += 1;
      entry.total += row.rating;
      perVehicle.set(row.vehicle.id, entry);
    }

    const average = rows.length
      ? Number((rows.reduce((sum, row) => sum + row.rating, 0) / rows.length).toFixed(2))
      : 0;

    return {
      summary: { count: rows.length, average },
      spread,
      perVehicle: [...perVehicle.entries()]
        .map(([id, value]) => ({
          id,
          name: value.name,
          slug: value.slug,
          count: value.count,
          average: Number((value.total / value.count).toFixed(2)),
        }))
        .sort((a, b) => b.count - a.count),
      items: rows.map((row) => ({
        id: row.id,
        rating: row.rating,
        title: row.title,
        comment: row.comment,
        createdAt: row.createdAt,
        bookingCode: row.booking.code,
        vehicleName: row.vehicle.name,
        vehicleSlug: row.vehicle.slug,
        customerName: row.customer.customerProfile?.fullName ?? "SavariGo rider",
      })),
    };
  }

  // ------------------------------------------------------------------ helpers

  private shapeBooking(booking: BookingWithRelations) {
    return {
      id: booking.id,
      code: booking.code,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      pickupAt: booking.pickupAt,
      returnAt: booking.returnAt,
      durationDays: booking.durationDays,
      rentalAmount: Number(booking.rentalAmount),
      taxAmount: Number(booking.taxAmount),
      depositAmount: Number(booking.depositAmount),
      discountAmount: Number(booking.discountAmount),
      totalAmount: Number(booking.totalAmount),
      specialRequests: booking.specialRequests,
      createdAt: booking.createdAt,
      cancelledAt: booking.cancelledAt,
      customerName: booking.customer.customerProfile?.fullName ?? "SavariGo rider",
      customerEmail: booking.customer.email,
      vehicle: {
        id: booking.vehicle.id,
        name: booking.vehicle.name,
        slug: booking.vehicle.slug,
        registrationNumber: booking.vehicle.registrationNumber,
        category: booking.vehicle.category.name,
      },
      pickupLocation: booking.pickupLocation.name,
      dropLocation: booking.dropLocation?.name ?? null,
      driverName: booking.driver?.fullName ?? null,
      couponCode: booking.coupon?.code ?? null,
      paidAmount: booking.payments
        .filter((payment) => payment.paidAt)
        .reduce((sum, payment) => sum + Number(payment.amount), 0),
    };
  }
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function toBookingStatus(raw: string): BookingStatus {
  const key = raw.trim().toUpperCase();
  if (!(key in BookingStatus)) {
    throw new BadRequestException({
      message: `Unknown booking status ${raw}`,
      code: "BOOKING_STATUS_INVALID",
    });
  }
  return BookingStatus[key as keyof typeof BookingStatus];
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}
