import { Injectable, NotFoundException } from "@nestjs/common";
import {
  BookingStatus,
  DocumentStatus,
  DriverVerificationStatus,
  PartnerStatus,
  Prisma,
  RefundStatus,
  TicketStatus,
} from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { paginated } from "../common/dto/pagination.dto";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { AuditLogQueryDto, UpdateSettingDto } from "./admin.dto";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      users,
      customers,
      drivers,
      verifiedDrivers,
      vehicles,
      bookings,
      paidPayments,
      completedRefunds,
      recentBookings,
      pendingLicenceChecks,
      partnerGroups,
      recentPartners,
      fleetByOwner,
      pendingDocuments,
      openTickets,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.customerProfile.count(),
      this.prisma.driverProfile.count(),
      this.prisma.driverProfile.count({
        where: { verificationStatus: DriverVerificationStatus.VERIFIED },
      }),
      this.prisma.vehicle.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.payment.findMany({
        where: { paidAt: { not: null } },
        select: { amount: true, paidAt: true },
      }),
      this.prisma.refund.aggregate({
        where: { status: RefundStatus.COMPLETED },
        _sum: { amount: true },
      }),
      this.prisma.booking.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          code: true,
          status: true,
          paymentStatus: true,
          totalAmount: true,
          pickupAt: true,
          createdAt: true,
          customer: {
            select: {
              email: true,
              customerProfile: { select: { fullName: true } },
            },
          },
          vehicle: { select: { name: true } },
        },
      }),
      this.prisma.customerProfile.count({
        where: { licenceNumber: { not: null }, licenceVerifiedAt: null },
      }),
      this.prisma.vendorProfile.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.vendorProfile.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          userId: true,
          partnerCode: true,
          tradingName: true,
          city: true,
          status: true,
          createdAt: true,
          user: { select: { email: true } },
        },
      }),
      this.prisma.vehicle.groupBy({ by: ["ownerId"], _count: { _all: true } }),
      this.prisma.vendorDocument.count({
        where: { status: DocumentStatus.PENDING },
      }),
      this.prisma.supportTicket.count({
        where: {
          status: {
            in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS],
          },
        },
      }),
    ]);

    const collected = paidPayments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );
    const refunded = Number(completedRefunds._sum.amount ?? 0);

    const monthly = new Map<string, { revenue: number; bookings: number }>();
    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      monthly.set(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`, {
        revenue: 0,
        bookings: 0,
      });
    }
    for (const payment of paidPayments) {
      if (!payment.paidAt || payment.paidAt < sixMonthsAgo) continue;
      const key = `${payment.paidAt.getFullYear()}-${String(payment.paidAt.getMonth() + 1).padStart(2, "0")}`;
      const bucket = monthly.get(key);
      if (bucket) bucket.revenue += Number(payment.amount);
    }

    const bookingBuckets = await this.prisma.booking.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    });
    for (const booking of bookingBuckets) {
      const key = `${booking.createdAt.getFullYear()}-${String(booking.createdAt.getMonth() + 1).padStart(2, "0")}`;
      const bucket = monthly.get(key);
      if (bucket) bucket.bookings += 1;
    }

    const bookingCounts = Object.fromEntries(
      bookings.map((row) => [row.status, row._count._all]),
    );
    const vehicleCounts = Object.fromEntries(
      vehicles.map((row) => [row.status, row._count._all]),
    );
    const partnerCounts = Object.fromEntries(
      partnerGroups.map((row) => [row.status, row._count._all]),
    ) as Record<PartnerStatus, number>;
    const vehiclesByOwner = new Map(
      fleetByOwner.map((row) => [row.ownerId, row._count._all]),
    );

    return {
      users: { total: users, customers, drivers, verifiedDrivers },
      vehicles: {
        total: vehicles.reduce((sum, row) => sum + row._count._all, 0),
        byStatus: vehicleCounts,
      },
      bookings: {
        total: bookings.reduce((sum, row) => sum + row._count._all, 0),
        byStatus: bookingCounts,
      },
      revenue: {
        collected: Math.round(collected * 100) / 100,
        refunded: Math.round(refunded * 100) / 100,
        net: Math.round((collected - refunded) * 100) / 100,
        currency: "INR",
      },
      partners: {
        total: partnerGroups.reduce((sum, row) => sum + row._count._all, 0),
        byStatus: partnerCounts,
      },
      attention: {
        pendingDriverVerification: drivers - verifiedDrivers,
        pendingLicenceChecks,
        pendingPayments: bookingCounts[BookingStatus.PENDING] ?? 0,
        pendingPartnerApprovals:
          partnerCounts[PartnerStatus.PENDING] ?? 0,
        pendingDocuments,
        openTickets,
      },
      monthly: [...monthly.entries()].map(([month, value]) => ({
        month,
        revenue: Math.round(value.revenue * 100) / 100,
        bookings: value.bookings,
      })),
      recentBookings: recentBookings.map((booking) => ({
        id: booking.id,
        code: booking.code,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        totalAmount: Number(booking.totalAmount),
        pickupAt: booking.pickupAt,
        createdAt: booking.createdAt,
        customerName:
          booking.customer.customerProfile?.fullName ?? "SavariGo rider",
        customerEmail: booking.customer.email,
        vehicleName: booking.vehicle.name,
      })),
      recentPartners: recentPartners.map((partner) => ({
        id: partner.id,
        userId: partner.userId,
        partnerCode: partner.partnerCode,
        tradingName: partner.tradingName,
        city: partner.city,
        status: partner.status,
        email: partner.user.email,
        vehicles: vehiclesByOwner.get(partner.userId) ?? 0,
        createdAt: partner.createdAt,
      })),
    };
  }

  async auditLogs(query: AuditLogQueryDto) {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.action
        ? { action: { contains: query.action, mode: "insensitive" } }
        : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: query.skip,
        take: query.limit,
        include: {
          actor: {
            select: {
              email: true,
              customerProfile: { select: { fullName: true } },
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginated(
      rows.map((row) => ({
        id: row.id,
        actorId: row.actorId,
        actorEmail: row.actor?.email ?? null,
        actorName: row.actor?.customerProfile?.fullName ?? null,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: row.createdAt,
      })),
      total,
      query.page,
      query.limit,
    );
  }

  async settings() {
    const rows = await this.prisma.adminSetting.findMany({
      orderBy: { key: "asc" },
      include: { updatedBy: { select: { email: true } } },
    });
    return rows.map((row) => ({
      key: row.key,
      value: row.value,
      description: row.description,
      updatedBy: row.updatedBy?.email ?? null,
      updatedAt: row.updatedAt,
    }));
  }

  async updateSetting(actor: AuthUser, key: string, dto: UpdateSettingDto) {
    const normalized = key.trim();
    if (!/^[a-zA-Z0-9_.-]{2,60}$/.test(normalized)) {
      throw new NotFoundException({
        message: "Setting keys use 2-60 letters, digits, dots or dashes",
        code: "SETTING_KEY_INVALID",
      });
    }
    const row = await this.prisma.adminSetting.upsert({
      where: { key: normalized },
      update: {
        value: dto.value as Prisma.InputJsonValue,
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        updatedById: actor.id,
      },
      create: {
        key: normalized,
        value: dto.value as Prisma.InputJsonValue,
        description: dto.description ?? null,
        updatedById: actor.id,
      },
    });
    return {
      key: row.key,
      value: row.value,
      description: row.description,
      updatedAt: row.updatedAt,
    };
  }

  async roles() {
    const rows = await this.prisma.role.findMany({
      orderBy: { name: "asc" },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        _count: { select: { userRoles: true } },
      },
    });
    return rows.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      users: role._count.userRoles,
      permissions: role.rolePermissions.map((entry) => ({
        id: entry.permission.id,
        key: entry.permission.key,
        group: entry.permission.group,
        description: entry.permission.description,
      })),
    }));
  }
}
