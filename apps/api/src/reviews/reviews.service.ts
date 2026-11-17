import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BookingStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { paginated } from "../common/dto/pagination.dto";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import {
  CreateReviewDto,
  ManageReviewsQueryDto,
  ModerateReviewDto,
  ReviewSort,
  VehicleReviewsQueryDto,
} from "./reviews.dto";

const reviewInclude = {
  customer: {
    select: {
      customerProfile: { select: { fullName: true, avatarUrl: true } },
    },
  },
  vehicle: {
    select: {
      id: true,
      slug: true,
      name: true,
      images: { where: { isPrimary: true }, take: 1 },
    },
  },
  booking: { select: { code: true } },
} satisfies Prisma.ReviewInclude;

type ReviewWithRelations = Prisma.ReviewGetPayload<{
  include: typeof reviewInclude;
}>;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(review: ReviewWithRelations, staff = false) {
    return {
      id: review.id,
      bookingId: review.bookingId,
      vehicleId: review.vehicleId,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      isPublished: review.isPublished,
      customerName:
        review.customer.customerProfile?.fullName ?? "SavariGo rider",
      customerAvatar: review.customer.customerProfile?.avatarUrl ?? null,
      ...(staff
        ? {
            bookingCode: review.booking.code,
            vehicle: {
              id: review.vehicle.id,
              slug: review.vehicle.slug,
              name: review.vehicle.name,
              image: review.vehicle.images[0]?.url ?? null,
            },
          }
        : {}),
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  private async recalculateVehicleRating(
    vehicleId: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const aggregate = await client.review.aggregate({
      where: { vehicleId, isPublished: true },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const average = aggregate._avg.rating ?? 0;
    await client.vehicle.update({
      where: { id: vehicleId },
      data: {
        rating: new Prisma.Decimal(average.toFixed(2)),
        reviewCount: aggregate._count._all,
      },
    });
  }

  async create(userId: string, dto: CreateReviewDto) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: dto.bookingId, customerId: userId },
      select: {
        id: true,
        vehicleId: true,
        status: true,
        review: { select: { id: true } },
      },
    });
    if (!booking) {
      throw new NotFoundException({
        message: "Booking not found",
        code: "BOOKING_NOT_FOUND",
      });
    }
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException({
        message: "You can review a vehicle once the rental is complete",
        code: "BOOKING_NOT_COMPLETED",
      });
    }
    if (booking.review) {
      throw new ConflictException({
        message: "This booking already has a review",
        code: "REVIEW_EXISTS",
      });
    }

    const review = await this.prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          bookingId: booking.id,
          vehicleId: booking.vehicleId,
          customerId: userId,
          rating: dto.rating,
          title: dto.title ?? null,
          comment: dto.comment,
        },
        include: reviewInclude,
      });
      await this.recalculateVehicleRating(booking.vehicleId, tx);
      return created;
    });

    return this.serialize(review);
  }

  async listForVehicle(idOrSlug: string, query: VehicleReviewsQueryDto) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: this.uuidOrSlug(idOrSlug),
      select: { id: true, name: true, slug: true },
    });
    if (!vehicle) {
      throw new NotFoundException({
        message: "Vehicle not found",
        code: "VEHICLE_NOT_FOUND",
      });
    }

    const where: Prisma.ReviewWhereInput = {
      vehicleId: vehicle.id,
      isPublished: true,
      ...(query.rating ? { rating: query.rating } : {}),
    };
    const orderBy: Prisma.ReviewOrderByWithRelationInput =
      query.sort === ReviewSort.HIGHEST
        ? { rating: "desc" }
        : query.sort === ReviewSort.LOWEST
          ? { rating: "asc" }
          : { createdAt: "desc" };

    const [rows, total, grouped] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: reviewInclude,
        orderBy,
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.groupBy({
        by: ["rating"],
        where: { vehicleId: vehicle.id, isPublished: true },
        _count: { _all: true },
      }),
    ]);

    const distribution: Record<string, number> = {
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
    };
    let sum = 0;
    let count = 0;
    for (const row of grouped) {
      distribution[String(row.rating)] = row._count._all;
      sum += row.rating * row._count._all;
      count += row._count._all;
    }

    return {
      vehicle: { id: vehicle.id, slug: vehicle.slug, name: vehicle.name },
      summary: {
        average: count ? Math.round((sum / count) * 100) / 100 : 0,
        total: count,
        distribution,
      },
      ...paginated(rows.map((row) => this.serialize(row)), total, query.page, query.limit),
    };
  }

  async listMine(userId: string, query: VehicleReviewsQueryDto) {
    const where: Prisma.ReviewWhereInput = {
      customerId: userId,
      ...(query.rating ? { rating: query.rating } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        include: reviewInclude,
        orderBy: { createdAt: "desc" },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.review.count({ where }),
    ]);
    return paginated(
      rows.map((row) => ({
        ...this.serialize(row),
        vehicle: {
          id: row.vehicle.id,
          slug: row.vehicle.slug,
          name: row.vehicle.name,
          image: row.vehicle.images[0]?.url ?? null,
        },
      })),
      total,
      query.page,
      query.limit,
    );
  }

  async listAll(query: ManageReviewsQueryDto) {
    const where: Prisma.ReviewWhereInput = {
      ...(query.published !== undefined ? { isPublished: query.published } : {}),
      ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
      ...(query.rating ? { rating: query.rating } : {}),
      ...(query.q
        ? {
            OR: [
              { comment: { contains: query.q, mode: "insensitive" } },
              { title: { contains: query.q, mode: "insensitive" } },
              { vehicle: { name: { contains: query.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        include: reviewInclude,
        orderBy: { createdAt: "desc" },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.review.count({ where }),
    ]);
    return paginated(
      rows.map((row) => this.serialize(row, true)),
      total,
      query.page,
      query.limit,
    );
  }

  async moderate(_actor: AuthUser, id: string, dto: ModerateReviewDto) {
    const existing = await this.prisma.review.findUnique({
      where: { id },
      select: { id: true, vehicleId: true },
    });
    if (!existing) {
      throw new NotFoundException({
        message: "Review not found",
        code: "REVIEW_NOT_FOUND",
      });
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const review = await tx.review.update({
        where: { id },
        data: {
          ...(dto.isPublished !== undefined
            ? { isPublished: dto.isPublished }
            : {}),
          ...(dto.rating !== undefined ? { rating: dto.rating } : {}),
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.comment !== undefined ? { comment: dto.comment } : {}),
        },
        include: reviewInclude,
      });
      await this.recalculateVehicleRating(existing.vehicleId, tx);
      return review;
    });
    return this.serialize(updated, true);
  }

  async remove(_actor: AuthUser, id: string) {
    const existing = await this.prisma.review.findUnique({
      where: { id },
      select: { id: true, vehicleId: true },
    });
    if (!existing) {
      throw new NotFoundException({
        message: "Review not found",
        code: "REVIEW_NOT_FOUND",
      });
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.review.delete({ where: { id } });
      await this.recalculateVehicleRating(existing.vehicleId, tx);
    });
    return { success: true };
  }

  private uuidOrSlug(value: string): Prisma.VehicleWhereInput {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
      ? { id: value }
      : { slug: value };
  }
}
