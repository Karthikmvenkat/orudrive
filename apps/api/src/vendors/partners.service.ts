import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import {
  PartnerStatus,
  Prisma,
  UserStatus,
  VehicleStatus,
} from "@prisma/client";
import { randomInt } from "node:crypto";
import { PrismaService } from "../common/prisma/prisma.service";
import { PasswordService } from "../common/services/password.service";
import { ROLES } from "../common/constants/roles";
import { paginated } from "../common/dto/pagination.dto";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import {
  CreatePartnerDto,
  PartnerQueryDto,
  SetCommissionDto,
  SetPartnerStatusDto,
  UpdatePartnerDto,
} from "./vendors.dto";

interface FleetStats {
  vehicles: number;
  available: number;
  bookings: number;
  revenue: number;
}

const EMPTY_STATS: FleetStats = {
  vehicles: 0,
  available: 0,
  bookings: 0,
  revenue: 0,
};

@Injectable()
export class PartnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
  ) {}

  async list(query: PartnerQueryDto) {
    const where: Prisma.VendorProfileWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.city ? { city: { equals: query.city } } : {}),
      ...(query.q
        ? {
            OR: [
              { tradingName: { contains: query.q, mode: "insensitive" } },
              { legalName: { contains: query.q, mode: "insensitive" } },
              { partnerCode: { contains: query.q, mode: "insensitive" } },
              { user: { email: { contains: query.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.vendorProfile.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: query.skip,
        take: query.limit,
        include: {
          user: {
            select: {
              email: true,
              phone: true,
              status: true,
              lastLoginAt: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.vendorProfile.count({ where }),
    ]);

    const stats = await this.statsFor(rows.map((row) => row.userId));
    return paginated(
      rows.map((row) => ({
        ...this.shape(row),
        ...stats.get(row.userId) ?? EMPTY_STATS,
      })),
      total,
      query.page,
      query.limit,
    );
  }

  async detail(id: string) {
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            status: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
      },
    });
    if (!profile) throw this.notFound();

    const [stats, vehicles, documents, tickets] = await Promise.all([
      this.statsFor([profile.userId]),
      this.prisma.vehicle.findMany({
        where: { ownerId: profile.userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          name: true,
          slug: true,
          registrationNumber: true,
          status: true,
          fromPrice: true,
          category: { select: { name: true } },
          location: { select: { name: true, city: true } },
        },
      }),
      this.prisma.vendorDocument.findMany({
        where: { vendorId: profile.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          kind: true,
          title: true,
          status: true,
          url: true,
          expiresAt: true,
        },
      }),
      this.prisma.supportTicket.count({ where: { vendorId: profile.id } }),
    ]);

    return {
      ...this.shape(profile),
      ...(stats.get(profile.userId) ?? EMPTY_STATS),
      openTickets: tickets,
      vehicles: vehicles.map((vehicle) => ({
        id: vehicle.id,
        name: vehicle.name,
        slug: vehicle.slug,
        registrationNumber: vehicle.registrationNumber,
        status: vehicle.status,
        category: vehicle.category.name,
        location: vehicle.location.name,
        city: vehicle.location.city,
        fromPrice: Number(vehicle.fromPrice),
      })),
      documents,
    };
  }

  async create(dto: CreatePartnerDto) {
    const role = await this.prisma.role.findUnique({
      where: { name: ROLES.VENDOR },
      select: { id: true },
    });
    if (!role) {
      throw new InternalServerErrorException({
        message: "The VENDOR role is missing from the database",
        code: "ROLE_MISSING",
      });
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        message: "A user with that email already exists",
        code: "PARTNER_EMAIL_TAKEN",
      });
    }

    const commission =
      dto.commissionPercent ?? (await this.defaultCommissionPercent());
    const passwordHash = await this.password.hash(dto.password);
    const partnerCode = await this.nextPartnerCode();

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
          ...(dto.phone ? { phone: dto.phone } : {}),
          userRoles: { create: { roleId: role.id } },
        },
      });
      return tx.vendorProfile.create({
        data: {
          userId: user.id,
          partnerCode,
          tradingName: dto.tradingName,
          legalName: dto.legalName ?? null,
          logoUrl: dto.logoUrl ?? null,
          phone: dto.phone ?? null,
          city: dto.city ?? "Puducherry",
          state: dto.state ?? "Puducherry",
          addressLine1: dto.addressLine1 ?? null,
          gstin: dto.gstin ?? null,
          commissionPercent: new Prisma.Decimal(commission.toFixed(2)),
          status: PartnerStatus.PENDING,
        },
        include: { user: { select: { email: true, status: true } } },
      });
    });

    return this.shape(created);
  }

  async update(id: string, dto: UpdatePartnerDto) {
    await this.ensureExists(id);
    const row = await this.prisma.vendorProfile.update({
      where: { id },
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
        ...(dto.gstin !== undefined ? { gstin: dto.gstin } : {}),
      },
      include: { user: { select: { email: true, status: true } } },
    });
    return this.shape(row);
  }

  async setStatus(
    id: string,
    dto: SetPartnerStatusDto,
    actor: AuthUser,
  ) {
    await this.ensureExists(id);
    const row = await this.prisma.vendorProfile.update({
      where: { id },
      data: {
        status: dto.status,
        decisionNote: dto.note ?? null,
        approvedAt:
          dto.status === PartnerStatus.APPROVED ? new Date() : undefined,
      },
      include: { user: { select: { email: true, status: true } } },
    });

    // Riders must not be able to book a fleet whose partner was just pulled.
    if (
      dto.status === PartnerStatus.SUSPENDED ||
      dto.status === PartnerStatus.REJECTED
    ) {
      await this.prisma.vehicle.updateMany({
        where: { ownerId: row.userId, status: VehicleStatus.AVAILABLE },
        data: { status: VehicleStatus.UNAVAILABLE },
      });
    }

    await this.prisma.notification.create({
      data: {
        userId: row.userId,
        type: "SYSTEM",
        title:
          dto.status === PartnerStatus.APPROVED
            ? "Your partner account is approved"
            : `Partner account ${dto.status.toLowerCase()}`,
        body:
          dto.note ??
          (dto.status === PartnerStatus.APPROVED
            ? `Partner code ${row.partnerCode} is live. Your approved vehicles are now bookable.`
            : `Master Admin set your partner status to ${dto.status}.`),
        status: "SENT",
        sentAt: new Date(),
      },
    });

    return {
      ...this.shape(row),
      actorId: actor.id,
    };
  }

  async setCommission(id: string, dto: SetCommissionDto) {
    await this.ensureExists(id);
    const row = await this.prisma.vendorProfile.update({
      where: { id },
      data: { commissionPercent: new Prisma.Decimal(dto.percent.toFixed(2)) },
      include: { user: { select: { email: true, status: true } } },
    });
    return this.shape(row);
  }

  async cities() {
    const rows = await this.prisma.vendorProfile.groupBy({
      by: ["city"],
      _count: { _all: true },
      orderBy: { city: "asc" },
    });
    return rows.map((row) => ({ city: row.city, partners: row._count._all }));
  }

  // ------------------------------------------------------------------ helpers

  private shape(row: {
    id: string;
    partnerCode: string;
    tradingName: string;
    legalName: string | null;
    logoUrl: string | null;
    phone: string | null;
    city: string;
    state: string;
    addressLine1: string | null;
    gstin: string | null;
    commissionPercent: Prisma.Decimal;
    status: PartnerStatus;
    decisionNote: string | null;
    approvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    user?: { email: string; status?: UserStatus; phone?: string | null; lastLoginAt?: Date | null; createdAt?: Date; id?: string };
  }) {
    return {
      id: row.id,
      userId: row.userId,
      partnerCode: row.partnerCode,
      tradingName: row.tradingName,
      legalName: row.legalName,
      logoUrl: row.logoUrl,
      phone: row.phone ?? row.user?.phone ?? null,
      city: row.city,
      state: row.state,
      addressLine1: row.addressLine1,
      gstin: row.gstin,
      commissionPercent: Number(row.commissionPercent),
      status: row.status,
      decisionNote: row.decisionNote,
      approvedAt: row.approvedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      email: row.user?.email ?? null,
      userStatus: row.user?.status ?? null,
      lastLoginAt: row.user?.lastLoginAt ?? null,
      joinedAt: row.user?.createdAt ?? null,
    };
  }

  /** Vehicles, availability, bookings and collected revenue per owner id. */
  private async statsFor(ownerIds: string[]) {
    const unique = [...new Set(ownerIds)];
    const result = new Map<string, FleetStats>();
    if (unique.length === 0) return result;

    const vehicles = await this.prisma.vehicle.findMany({
      where: { ownerId: { in: unique } },
      select: { id: true, ownerId: true, status: true },
    });

    const vehicleIds = vehicles.map((vehicle) => vehicle.id);
    const [bookingGroups, payments] = await Promise.all([
      vehicleIds.length
        ? this.prisma.booking.groupBy({
            by: ["vehicleId"],
            where: { vehicleId: { in: vehicleIds } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      this.prisma.payment.findMany({
        where: {
          paidAt: { not: null },
          booking: { vehicle: { ownerId: { in: unique } } },
        },
        select: {
          amount: true,
          booking: { select: { vehicleId: true } },
        },
      }),
    ]);

    const ownerOfVehicle = new Map(
      vehicles.map((vehicle) => [vehicle.id, vehicle.ownerId]),
    );

    for (const vehicle of vehicles) {
      const entry = result.get(vehicle.ownerId) ?? { ...EMPTY_STATS };
      entry.vehicles += 1;
      if (vehicle.status === VehicleStatus.AVAILABLE) entry.available += 1;
      result.set(vehicle.ownerId, entry);
    }

    const add = (ownerId: string | undefined, patch: Partial<FleetStats>) => {
      if (!ownerId) return;
      const entry = result.get(ownerId) ?? { ...EMPTY_STATS };
      result.set(ownerId, {
        vehicles: entry.vehicles,
        available: entry.available,
        bookings: entry.bookings + (patch.bookings ?? 0),
        revenue: entry.revenue + (patch.revenue ?? 0),
      });
    };

    for (const group of bookingGroups) {
      add(ownerOfVehicle.get(group.vehicleId), {
        bookings: group._count._all,
      });
    }
    for (const payment of payments) {
      add(ownerOfVehicle.get(payment.booking.vehicleId), {
        revenue: Number(payment.amount),
      });
    }

    return result;
  }

  private async defaultCommissionPercent() {
    const setting = await this.prisma.adminSetting.findUnique({
      where: { key: "platform.commission_percent" },
      select: { value: true },
    });
    const value = Number(setting?.value);
    return Number.isFinite(value) && value >= 0 && value <= 100 ? value : 20;
  }

  private async nextPartnerCode() {
    const taken = await this.prisma.vendorProfile.count();
    for (let attempt = 1; attempt <= 8; attempt += 1) {
      const candidate = `PR${String(taken + attempt).padStart(3, "0")}`;
      const clash = await this.prisma.vendorProfile.findUnique({
        where: { partnerCode: candidate },
        select: { id: true },
      });
      if (!clash) return candidate;
    }
    return `PR${randomInt(1000, 9999)}`;
  }

  private async ensureExists(id: string) {
    const row = await this.prisma.vendorProfile.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!row) throw this.notFound();
  }

  private notFound() {
    return new NotFoundException({
      message: "Rental partner not found",
      code: "PARTNER_NOT_FOUND",
    });
  }
}
