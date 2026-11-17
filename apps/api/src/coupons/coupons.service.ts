import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CouponType, Prisma, VehicleStatus } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { paginated } from "../common/dto/pagination.dto";
import {
  CouponsQueryDto,
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
} from "./coupons.dto";

type Client = PrismaService | Prisma.TransactionClient;

export interface CouponContext {
  customerId: string;
  vehicleId: string;
  categoryId: string;
  subtotal: number;
  durationDays: number;
}

export interface CouponEvaluation {
  coupon: {
    id: string;
    code: string;
    title: string;
    type: CouponType;
    value: number;
    maxDiscount: number | null;
    minOrderAmount: number;
    validTill: Date;
  };
  discount: number;
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(coupon: {
    id: string;
    code: string;
    title: string;
    description: string | null;
    type: CouponType;
    value: Prisma.Decimal;
    maxDiscount: Prisma.Decimal | null;
    minOrderAmount: Prisma.Decimal;
    validFrom: Date;
    validTill: Date;
    usageLimit: number | null;
    perUserLimit: number;
    usedCount: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    categories?: {
      category: { id: string; slug: string; name: string };
    }[];
  }) {
    return {
      id: coupon.id,
      code: coupon.code,
      title: coupon.title,
      description: coupon.description,
      type: coupon.type,
      value: Number(coupon.value),
      maxDiscount:
        coupon.maxDiscount === null ? null : Number(coupon.maxDiscount),
      minOrderAmount: Number(coupon.minOrderAmount),
      validFrom: coupon.validFrom,
      validTill: coupon.validTill,
      usageLimit: coupon.usageLimit,
      perUserLimit: coupon.perUserLimit,
      usedCount: coupon.usedCount,
      remainingUses:
        coupon.usageLimit === null
          ? null
          : Math.max(0, coupon.usageLimit - coupon.usedCount),
      isActive: coupon.isActive,
      appliesTo:
        coupon.categories?.map((entry) => ({
          id: entry.category.id,
          slug: entry.category.slug,
          name: entry.category.name,
        })) ?? [],
      createdAt: coupon.createdAt,
      updatedAt: coupon.updatedAt,
    };
  }

  async listPublic() {
    const now = new Date();
    const rows = await this.prisma.coupon.findMany({
      where: {
        isActive: true,
        validFrom: { lte: now },
        validTill: { gte: now },
      },
      include: { categories: { include: { category: true } } },
      orderBy: { validTill: "asc" },
    });
    // Prisma cannot compare two columns directly; filter exhausted codes in code.
    return rows
      .filter((row) => row.usageLimit === null || row.usedCount < row.usageLimit)
      .map((row) => this.serialize(row));
  }

  async listForAdmins(query: CouponsQueryDto) {
    const where: Prisma.CouponWhereInput = {
      ...(query.active !== undefined ? { isActive: query.active } : {}),
      ...(query.q
        ? {
            OR: [
              { code: { contains: query.q.toUpperCase() } },
              { title: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.coupon.findMany({
        where,
        include: { categories: { include: { category: true } } },
        orderBy: { createdAt: "desc" },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.coupon.count({ where }),
    ]);
    return paginated(rows.map((row) => this.serialize(row)), total, query.page, query.limit);
  }

  async validate(dto: ValidateCouponDto) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, status: VehicleStatus.AVAILABLE },
      select: { id: true, categoryId: true, fromPrice: true },
    });
    if (!vehicle) {
      throw new NotFoundException({
        message: "Vehicle not found",
        code: "VEHICLE_NOT_FOUND",
      });
    }
    const days = dto.durationDays ?? 1;
    const subtotal =
      dto.subtotal ?? Number(vehicle.fromPrice) * days;
    // Validation is a preview; use a synthetic buyer id so per-user limits are
    // checked again with the real customer at booking time.
    const evaluation = await this.evaluate(
      dto.code,
      {
        customerId: "",
        vehicleId: vehicle.id,
        categoryId: vehicle.categoryId,
        subtotal,
        durationDays: days,
      },
      this.prisma,
      { skipUserLimit: true },
    );
    return {
      code: evaluation.coupon.code,
      coupon: evaluation.coupon,
      subtotal: money(subtotal),
      discount: evaluation.discount,
      estimatedTotal: money(Math.max(0, subtotal - evaluation.discount)),
    };
  }

  async evaluate(
    code: string,
    context: CouponContext,
    client: Client = this.prisma,
    options: { skipUserLimit?: boolean } = {},
  ): Promise<CouponEvaluation> {
    const coupon = await client.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: { categories: true },
    });
    if (!coupon) {
      throw new BadRequestException({
        message: "Coupon code is not valid",
        code: "COUPON_INVALID",
      });
    }

    const now = new Date();
    if (
      !coupon.isActive ||
      coupon.validFrom.getTime() > now.getTime() ||
      coupon.validTill.getTime() < now.getTime()
    ) {
      throw new BadRequestException({
        message: "Coupon is not valid right now",
        code: "COUPON_EXPIRED",
      });
    }
    if (context.subtotal < Number(coupon.minOrderAmount)) {
      throw new BadRequestException({
        message: `A minimum order of ₹${Number(coupon.minOrderAmount)} is required`,
        code: "COUPON_MIN_ORDER",
      });
    }
    if (
      coupon.categories.length > 0 &&
      !coupon.categories.some((entry) => entry.categoryId === context.categoryId)
    ) {
      throw new BadRequestException({
        message: "Coupon does not apply to this vehicle category",
        code: "COUPON_NOT_APPLICABLE",
      });
    }
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException({
        message: "Coupon usage limit has been reached",
        code: "COUPON_LIMIT_REACHED",
      });
    }

    if (!options.skipUserLimit && context.customerId) {
      const used = await client.booking.count({
        where: {
          customerId: context.customerId,
          couponId: coupon.id,
          status: { not: "CANCELLED" },
        },
      });
      if (used >= coupon.perUserLimit) {
        throw new BadRequestException({
          message: "You have already used this coupon",
          code: "COUPON_USER_LIMIT",
        });
      }
    }

    const base = context.subtotal;
    let discount =
      coupon.type === CouponType.PERCENT
        ? (base * Number(coupon.value)) / 100
        : Number(coupon.value);
    if (coupon.maxDiscount !== null) {
      discount = Math.min(discount, Number(coupon.maxDiscount));
    }
    discount = money(Math.min(discount, base));

    if (discount <= 0) {
      throw new BadRequestException({
        message: "Coupon provides no discount for this booking",
        code: "COUPON_NO_BENEFIT",
      });
    }

    return {
      coupon: {
        id: coupon.id,
        code: coupon.code,
        title: coupon.title,
        type: coupon.type,
        value: Number(coupon.value),
        maxDiscount:
          coupon.maxDiscount === null ? null : Number(coupon.maxDiscount),
        minOrderAmount: Number(coupon.minOrderAmount),
        validTill: coupon.validTill,
      },
      discount,
    };
  }

  private async ensureCategories(categoryIds: string[]) {
    if (!categoryIds.length) return;
    const found = await this.prisma.vehicleCategory.count({
      where: { id: { in: categoryIds } },
    });
    if (found !== new Set(categoryIds).size) {
      throw new NotFoundException({
        message: "One or more vehicle categories were not found",
        code: "CATEGORY_NOT_FOUND",
      });
    }
  }

  async create(dto: CreateCouponDto) {
    const validFrom = dto.validFrom ? new Date(dto.validFrom) : new Date();
    const validTill = new Date(dto.validTill);
    if (validTill.getTime() <= validFrom.getTime()) {
      throw new BadRequestException({
        message: "validTill must be after validFrom",
        code: "INVALID_COUPON_WINDOW",
      });
    }
    const categoryIds = [...new Set(dto.categoryIds ?? [])];
    await this.ensureCategories(categoryIds);

    const coupon = await this.prisma.$transaction(async (tx) => {
      const created = await tx.coupon.create({
        data: {
          code: dto.code.toUpperCase(),
          title: dto.title,
          description: dto.description ?? null,
          type: dto.type,
          value: new Prisma.Decimal(dto.value),
          maxDiscount:
            dto.maxDiscount !== undefined
              ? new Prisma.Decimal(dto.maxDiscount)
              : null,
          minOrderAmount: new Prisma.Decimal(dto.minOrderAmount ?? 0),
          validFrom,
          validTill,
          usageLimit: dto.usageLimit ?? null,
          perUserLimit: dto.perUserLimit ?? 1,
          isActive: dto.isActive ?? true,
        },
      });
      if (categoryIds.length) {
        await tx.couponCategory.createMany({
          data: categoryIds.map((categoryId) => ({
            couponId: created.id,
            categoryId,
          })),
        });
      }
      return tx.coupon.findUniqueOrThrow({
        where: { id: created.id },
        include: { categories: { include: { category: true } } },
      });
    });

    return this.serialize(coupon);
  }

  async update(id: string, dto: UpdateCouponDto) {
    const existing = await this.prisma.coupon.findUnique({
      where: { id },
      select: { id: true, validFrom: true, validTill: true },
    });
    if (!existing) {
      throw new NotFoundException({
        message: "Coupon not found",
        code: "COUPON_NOT_FOUND",
      });
    }

    const validFrom = dto.validFrom ? new Date(dto.validFrom) : existing.validFrom;
    const validTill = dto.validTill ? new Date(dto.validTill) : existing.validTill;
    if (validTill.getTime() <= validFrom.getTime()) {
      throw new BadRequestException({
        message: "validTill must be after validFrom",
        code: "INVALID_COUPON_WINDOW",
      });
    }
    const categoryIds =
      dto.categoryIds !== undefined ? [...new Set(dto.categoryIds)] : undefined;
    if (categoryIds?.length) await this.ensureCategories(categoryIds);

    const coupon = await this.prisma.$transaction(async (tx) => {
      await tx.coupon.update({
        where: { id },
        data: {
          ...(dto.code !== undefined ? { code: dto.code.toUpperCase() } : {}),
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.value !== undefined
            ? { value: new Prisma.Decimal(dto.value) }
            : {}),
          ...(dto.maxDiscount !== undefined
            ? {
                maxDiscount:
                  dto.maxDiscount === null
                    ? null
                    : new Prisma.Decimal(dto.maxDiscount),
              }
            : {}),
          ...(dto.minOrderAmount !== undefined
            ? { minOrderAmount: new Prisma.Decimal(dto.minOrderAmount) }
            : {}),
          ...(dto.validFrom !== undefined ? { validFrom } : {}),
          ...(dto.validTill !== undefined ? { validTill } : {}),
          ...(dto.usageLimit !== undefined ? { usageLimit: dto.usageLimit } : {}),
          ...(dto.perUserLimit !== undefined
            ? { perUserLimit: dto.perUserLimit }
            : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
      if (categoryIds !== undefined) {
        await tx.couponCategory.deleteMany({ where: { couponId: id } });
        if (categoryIds.length) {
          await tx.couponCategory.createMany({
            data: categoryIds.map((categoryId) => ({
              couponId: id,
              categoryId,
            })),
          });
        }
      }
      return tx.coupon.findUniqueOrThrow({
        where: { id },
        include: { categories: { include: { category: true } } },
      });
    });

    return this.serialize(coupon);
  }

  async remove(id: string) {
    const existing = await this.prisma.coupon.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException({
        message: "Coupon not found",
        code: "COUPON_NOT_FOUND",
      });
    }
    await this.prisma.coupon.update({
      where: { id },
      data: { isActive: false },
    });
    return { success: true };
  }
}
