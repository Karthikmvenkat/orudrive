import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { PartnerGateService } from "../common/services/partner-gate.service";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { CreatePricingDto, UpdatePricingDto } from "./pricing.dto";

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly partnerGate: PartnerGateService,
  ) {}

  private serialize(plan: {
    id: string;
    vehicleId: string;
    name: string;
    baseDayRate: Prisma.Decimal;
    extraKmRate: Prisma.Decimal;
    depositAmount: Prisma.Decimal;
    mileageLimitKm: number | null;
    minDays: number;
    weeklyDiscountPercent: Prisma.Decimal | null;
    monthlyDiscountPercent: Prisma.Decimal | null;
    currency: string;
    validFrom: Date;
    validTo: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: plan.id,
      vehicleId: plan.vehicleId,
      name: plan.name,
      baseDayRate: Number(plan.baseDayRate),
      extraKmRate: Number(plan.extraKmRate),
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
      currency: plan.currency,
      validFrom: plan.validFrom,
      validTo: plan.validTo,
      isActive: plan.isActive,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  private async assertCanManage(actor: AuthUser, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { ownerId: true },
    });
    if (!vehicle) {
      throw new NotFoundException({
        message: "Vehicle not found",
        code: "VEHICLE_NOT_FOUND",
      });
    }
    if (
      !actor.roles.includes("ADMIN") &&
      !(actor.roles.includes("VENDOR") && actor.id === vehicle.ownerId)
    ) {
      throw new ForbiddenException({
        message: "You can only manage pricing for vehicles you own",
        code: "VEHICLE_FORBIDDEN",
      });
    }
    await this.partnerGate.assertOwnerApproved(vehicle.ownerId);
  }

  private assertWindow(validFrom?: Date, validTo?: Date | null) {
    if (validFrom && validTo && validTo.getTime() <= validFrom.getTime()) {
      throw new BadRequestException({
        message: "validTo must be after validFrom",
        code: "INVALID_PRICING_WINDOW",
      });
    }
  }

  async listPublic(vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true },
    });
    if (!vehicle) {
      throw new NotFoundException({
        message: "Vehicle not found",
        code: "VEHICLE_NOT_FOUND",
      });
    }
    const now = new Date();
    const rows = await this.prisma.pricing.findMany({
      where: {
        vehicleId,
        isActive: true,
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
      },
      orderBy: { baseDayRate: "asc" },
    });
    return rows.map((row) => this.serialize(row));
  }

  async listForStaff(actor: AuthUser, vehicleId: string) {
    await this.assertCanManage(actor, vehicleId);
    const rows = await this.prisma.pricing.findMany({
      where: { vehicleId },
      orderBy: [{ isActive: "desc" }, { validFrom: "desc" }],
    });
    return rows.map((row) => this.serialize(row));
  }

  async create(actor: AuthUser, dto: CreatePricingDto) {
    await this.assertCanManage(actor, dto.vehicleId);
    const validFrom = dto.validFrom ? new Date(dto.validFrom) : new Date();
    const validTo = dto.validTo ? new Date(dto.validTo) : null;
    this.assertWindow(validFrom, validTo);

    const plan = await this.prisma.pricing.create({
      data: {
        vehicleId: dto.vehicleId,
        name: dto.name ?? "Standard",
        baseDayRate: new Prisma.Decimal(dto.baseDayRate),
        extraKmRate: new Prisma.Decimal(dto.extraKmRate),
        depositAmount: new Prisma.Decimal(dto.depositAmount),
        mileageLimitKm: dto.mileageLimitKm ?? null,
        minDays: dto.minDays ?? 1,
        weeklyDiscountPercent:
          dto.weeklyDiscountPercent !== undefined
            ? new Prisma.Decimal(dto.weeklyDiscountPercent)
            : null,
        monthlyDiscountPercent:
          dto.monthlyDiscountPercent !== undefined
            ? new Prisma.Decimal(dto.monthlyDiscountPercent)
            : null,
        validFrom,
        validTo,
        isActive: dto.isActive ?? true,
      },
    });
    await this.recalculateFromPrice(dto.vehicleId);
    return this.serialize(plan);
  }

  async update(actor: AuthUser, id: string, dto: UpdatePricingDto) {
    const existing = await this.prisma.pricing.findUnique({
      where: { id },
      select: { id: true, vehicleId: true, validFrom: true, validTo: true },
    });
    if (!existing) {
      throw new NotFoundException({
        message: "Pricing plan not found",
        code: "PRICING_NOT_FOUND",
      });
    }
    await this.assertCanManage(actor, existing.vehicleId);

    const validFrom = dto.validFrom ? new Date(dto.validFrom) : existing.validFrom;
    const validTo =
      dto.validTo !== undefined
        ? dto.validTo
          ? new Date(dto.validTo)
          : null
        : existing.validTo;
    this.assertWindow(validFrom, validTo);

    const plan = await this.prisma.pricing.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.baseDayRate !== undefined
          ? { baseDayRate: new Prisma.Decimal(dto.baseDayRate) }
          : {}),
        ...(dto.extraKmRate !== undefined
          ? { extraKmRate: new Prisma.Decimal(dto.extraKmRate) }
          : {}),
        ...(dto.depositAmount !== undefined
          ? { depositAmount: new Prisma.Decimal(dto.depositAmount) }
          : {}),
        ...(dto.mileageLimitKm !== undefined
          ? { mileageLimitKm: dto.mileageLimitKm }
          : {}),
        ...(dto.minDays !== undefined ? { minDays: dto.minDays } : {}),
        ...(dto.weeklyDiscountPercent !== undefined
          ? {
              weeklyDiscountPercent: new Prisma.Decimal(
                dto.weeklyDiscountPercent,
              ),
            }
          : {}),
        ...(dto.monthlyDiscountPercent !== undefined
          ? {
              monthlyDiscountPercent: new Prisma.Decimal(
                dto.monthlyDiscountPercent,
              ),
            }
          : {}),
        ...(dto.validFrom !== undefined ? { validFrom } : {}),
        ...(dto.validTo !== undefined ? { validTo } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    await this.recalculateFromPrice(existing.vehicleId);
    return this.serialize(plan);
  }

  async remove(actor: AuthUser, id: string) {
    const existing = await this.prisma.pricing.findUnique({
      where: { id },
      select: { id: true, vehicleId: true },
    });
    if (!existing) {
      throw new NotFoundException({
        message: "Pricing plan not found",
        code: "PRICING_NOT_FOUND",
      });
    }
    await this.assertCanManage(actor, existing.vehicleId);
    await this.prisma.pricing.update({
      where: { id },
      data: { isActive: false },
    });
    await this.recalculateFromPrice(existing.vehicleId);
    return { success: true };
  }

  /** Keeps vehicles.fromPrice in sync with the cheapest currently valid plan. */
  async recalculateFromPrice(vehicleId: string): Promise<void> {
    const now = new Date();
    const aggregate = await this.prisma.pricing.aggregate({
      where: {
        vehicleId,
        isActive: true,
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
      },
      _min: { baseDayRate: true },
    });
    await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { fromPrice: aggregate._min.baseDayRate ?? new Prisma.Decimal(0) },
    });
  }
}
