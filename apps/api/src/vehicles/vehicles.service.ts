import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AvailabilityStatus,
  DocumentKind,
  DocumentStatus,
  Prisma,
  VehicleStatus,
} from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { PartnerGateService } from "../common/services/partner-gate.service";
import { paginated } from "../common/dto/pagination.dto";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import type { RoleName } from "../common/constants/roles";
import { randomSuffix, slugify } from "../common/utils/slug";
import {
  CreateVehicleDto,
  ManageVehiclesQueryDto,
  UpdateVehicleDto,
  UpdateVehicleImageDto,
  VehicleImageInputDto,
  VehicleQueryDto,
  type VehicleSort,
} from "./vehicles.dto";
import {
  serializeVehicle,
  vehicleInclude,
  type VehicleWithRelations,
} from "./vehicle.serializer";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeImages(images?: VehicleImageInputDto[]) {
  if (!images?.length) return [];
  const primaryIndex = Math.max(
    0,
    images.findIndex((image) => image.isPrimary),
  );
  return images.map((image, index) => ({
    url: image.url,
    alt: image.alt,
    sortOrder: image.sortOrder ?? index,
    isPrimary: index === primaryIndex,
  }));
}

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly partnerGate: PartnerGateService,
  ) {}

  private isAdmin(roles: RoleName[]): boolean {
    return roles.includes("ADMIN");
  }

  private assertCanManage(
    actor: { id: string; roles: RoleName[] },
    ownerId: string,
  ): void {
    if (this.isAdmin(actor.roles)) return;
    if (actor.roles.includes("VENDOR") && actor.id === ownerId) return;
    throw new ForbiddenException({
      message: "You can only manage vehicles you own",
      code: "VEHICLE_FORBIDDEN",
    });
  }

  /** AVAILABLE is the publish switch, so a partner can never flip it alone. */
  private assertPublishable(roles: RoleName[], status?: VehicleStatus): void {
    if (this.isAdmin(roles) || status !== VehicleStatus.AVAILABLE) return;
    throw new ForbiddenException({
      message:
        "New vehicles stay pending until Master Admin approves them. Save as DRAFT and submit for approval.",
      code: "VEHICLE_APPROVAL_REQUIRED",
    });
  }

  /**
   * Publishing is where the paperwork has to be proven — this is the rule the
   * partner documents screen promises: no verified RC and insurance, no live listing.
   */
  private async assertComplianceDocuments(vehicleId: string) {
    const required = [DocumentKind.VEHICLE_RC, DocumentKind.INSURANCE];
    const verified = await this.prisma.vendorDocument.findMany({
      where: {
        vehicleId,
        kind: { in: required },
        status: DocumentStatus.APPROVED,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { kind: true },
    });
    const missing = required.filter(
      (kind) => !verified.some((doc) => doc.kind === kind),
    );
    if (missing.length) {
      throw new BadRequestException({
        message: `This vehicle goes live only after these documents are verified: ${missing.join(", ")}`,
        code: "VEHICLE_DOCUMENTS_MISSING",
        details: missing,
      });
    }
  }

  private orderBy(sort: VehicleSort = "popular"): Prisma.VehicleOrderByWithRelationInput[] {
    switch (sort) {
      case "price_asc":
        return [{ fromPrice: "asc" }, { createdAt: "desc" }];
      case "price_desc":
        return [{ fromPrice: "desc" }, { createdAt: "desc" }];
      case "rating":
        return [{ rating: "desc" }, { reviewCount: "desc" }];
      case "newest":
        return [{ createdAt: "desc" }];
      default:
        return [{ popular: "desc" }, { rating: "desc" }, { createdAt: "desc" }];
    }
  }

  private whereFor(
    query: VehicleQueryDto | ManageVehiclesQueryDto,
    publicOnly: boolean,
  ): Prisma.VehicleWhereInput {
    const manage = query as ManageVehiclesQueryDto;
    const categories = query.category
      ? query.category
          .split(",")
          .map((slug) => slug.trim())
          .filter(Boolean)
      : [];
    const now = new Date();
    return {
      ...(publicOnly ? { status: VehicleStatus.AVAILABLE } : {}),
      ...(!publicOnly && manage.status ? { status: manage.status } : {}),
      ...(categories.length === 1
        ? { category: { slug: categories[0] } }
        : categories.length > 1
          ? { category: { slug: { in: categories } } }
          : {}),
      ...(query.brand
        ? { brand: { equals: query.brand.trim(), mode: "insensitive" } }
        : {}),
      ...(query.minRating !== undefined ? { rating: { gte: query.minRating } } : {}),
      ...(query.availableNow
        ? {
            availability: {
              none: {
                status: {
                  in: [
                    AvailabilityStatus.BOOKED,
                    AvailabilityStatus.BLOCKED,
                    AvailabilityStatus.MAINTENANCE,
                  ],
                },
                startsAt: { lte: now },
                endsAt: { gte: now },
              },
            },
          }
        : {}),
      ...(!publicOnly && manage.bookedNow
        ? {
            availability: {
              some: {
                status: AvailabilityStatus.BOOKED,
                startsAt: { lte: now },
                endsAt: { gte: now },
              },
            },
          }
        : {}),
      ...(query.location ? { location: { slug: query.location } } : {}),
      ...(query.transmission ? { transmission: query.transmission } : {}),
      ...(query.fuelType ? { fuelType: query.fuelType } : {}),
      ...(query.seats ? { seats: { gte: query.seats } } : {}),
      ...(query.popular ? { popular: true } : {}),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? {
            fromPrice: {
              ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
              ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
            },
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { brand: { contains: query.q, mode: "insensitive" } },
              { description: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
  }

  async listPublic(query: VehicleQueryDto) {
    const where = this.whereFor(query, true);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        include: vehicleInclude,
        orderBy: this.orderBy(query.sort),
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.vehicle.count({ where }),
    ]);
    return paginated(
      rows.map((row) => serializeVehicle(row)),
      total,
      query.page,
      query.limit,
    );
  }

  async listForStaff(actor: AuthUser, query: ManageVehiclesQueryDto) {
    const where = this.whereFor(query, false);
    // A partner's fleet is pinned to their own user id whatever else their token
    // claims, so a dual VENDOR+SUPPORT role cannot widen it with `ownerId`.
    if (actor.roles.includes("VENDOR")) {
      where.ownerId = actor.id;
    } else if (query.ownerId) {
      where.ownerId = query.ownerId;
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        include: vehicleInclude,
        orderBy: this.orderBy(query.sort),
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.vehicle.count({ where }),
    ]);
    return paginated(
      rows.map((row) => serializeVehicle(row, { staff: true })),
      total,
      query.page,
      query.limit,
    );
  }

  async getPublic(idOrSlug: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        status: VehicleStatus.AVAILABLE,
        OR: [
          { slug: idOrSlug },
          ...(UUID_PATTERN.test(idOrSlug) ? [{ id: idOrSlug }] : []),
        ],
      },
      include: vehicleInclude,
    });
    if (!vehicle) {
      throw new NotFoundException({
        message: "Vehicle not found",
        code: "VEHICLE_NOT_FOUND",
      });
    }
    return serializeVehicle(vehicle);
  }

  async getForStaff(actor: AuthUser, id: string) {
    const vehicle = await this.findVehicle(id);
    this.assertCanManage(actor, vehicle.ownerId);
    return serializeVehicle(vehicle, { staff: true });
  }

  private async findVehicle(id: string): Promise<VehicleWithRelations> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: vehicleInclude,
    });
    if (!vehicle) {
      throw new NotFoundException({
        message: "Vehicle not found",
        code: "VEHICLE_NOT_FOUND",
      });
    }
    return vehicle;
  }

  private async uniqueSlug(value: string): Promise<string> {
    const base = slugify(value) || `vehicle-${randomSuffix()}`;
    let candidate = base;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const exists = await this.prisma.vehicle.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
      candidate = `${base}-${randomSuffix()}`;
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  private async ensureCatalogueRefs(categoryId: string, locationId: string) {
    const [category, location] = await Promise.all([
      this.prisma.vehicleCategory.findUnique({
        where: { id: categoryId },
        select: { id: true },
      }),
      this.prisma.vehicleLocation.findUnique({
        where: { id: locationId },
        select: { id: true },
      }),
    ]);
    if (!category) {
      throw new NotFoundException({
        message: "Vehicle category not found",
        code: "CATEGORY_NOT_FOUND",
      });
    }
    if (!location) {
      throw new NotFoundException({
        message: "Pickup location not found",
        code: "LOCATION_NOT_FOUND",
      });
    }
  }

  private async ensureUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException({
        message: "Owner account not found",
        code: "OWNER_NOT_FOUND",
      });
    }
  }

  async create(actor: AuthUser, dto: CreateVehicleDto) {
    await this.ensureCatalogueRefs(dto.categoryId, dto.locationId);
    const ownerId =
      this.isAdmin(actor.roles) && dto.ownerId ? dto.ownerId : actor.id;
    await this.ensureUser(ownerId);
    this.assertPublishable(actor.roles, dto.status);
    await this.partnerGate.assertApproved(actor);

    if (dto.pricing?.validTo && dto.pricing.validFrom) {
      if (
        new Date(dto.pricing.validTo).getTime() <=
        new Date(dto.pricing.validFrom).getTime()
      ) {
        throw new BadRequestException({
          message: "Pricing validTo must be after validFrom",
          code: "INVALID_PRICING_WINDOW",
        });
      }
    }

    const slug = dto.slug ?? (await this.uniqueSlug(dto.name));
    const images = normalizeImages(dto.images);

    const vehicle = await this.prisma.$transaction(async (tx) => {
      const created = await tx.vehicle.create({
        data: {
          slug,
          name: dto.name,
          brand: dto.brand,
          registrationNumber: dto.registrationNumber,
          year: dto.year,
          transmission: dto.transmission,
          fuelType: dto.fuelType,
          seats: dto.seats,
          engine: dto.engine,
          mileage: dto.mileage,
          description: dto.description,
          status: dto.status ?? VehicleStatus.DRAFT,
          popular: dto.popular ?? false,
          mileageLimitKm: dto.mileageLimitKm ?? null,
          depositAmount: new Prisma.Decimal(dto.depositAmount),
          fromPrice: dto.pricing
            ? new Prisma.Decimal(dto.pricing.baseDayRate)
            : new Prisma.Decimal(0),
          category: { connect: { id: dto.categoryId } },
          location: { connect: { id: dto.locationId } },
          owner: { connect: { id: ownerId } },
          ...(images.length ? { images: { create: images } } : {}),
        },
      });

      if (dto.pricing) {
        await tx.pricing.create({
          data: {
            vehicleId: created.id,
            name: dto.pricing.name ?? "Standard",
            baseDayRate: new Prisma.Decimal(dto.pricing.baseDayRate),
            extraKmRate: new Prisma.Decimal(dto.pricing.extraKmRate),
            depositAmount: new Prisma.Decimal(
              dto.pricing.depositAmount ?? dto.depositAmount,
            ),
            mileageLimitKm: dto.pricing.mileageLimitKm ?? null,
            minDays: dto.pricing.minDays ?? 1,
            weeklyDiscountPercent:
              dto.pricing.weeklyDiscountPercent !== undefined
                ? new Prisma.Decimal(dto.pricing.weeklyDiscountPercent)
                : null,
            monthlyDiscountPercent:
              dto.pricing.monthlyDiscountPercent !== undefined
                ? new Prisma.Decimal(dto.pricing.monthlyDiscountPercent)
                : null,
            validFrom: dto.pricing.validFrom
              ? new Date(dto.pricing.validFrom)
              : new Date(),
            validTo: dto.pricing.validTo ? new Date(dto.pricing.validTo) : null,
          },
        });
      }

      return tx.vehicle.findUniqueOrThrow({
        where: { id: created.id },
        include: vehicleInclude,
      });
    });

    return serializeVehicle(vehicle, { staff: true });
  }

  async update(actor: AuthUser, id: string, dto: UpdateVehicleDto) {
    const existing = await this.findVehicle(id);
    this.assertCanManage(actor, existing.ownerId);
    this.assertPublishable(actor.roles, dto.status);
    await this.partnerGate.assertApproved(actor);
    if (dto.status === VehicleStatus.AVAILABLE) {
      await this.assertComplianceDocuments(id);
    }

    if (dto.categoryId || dto.locationId) {
      await this.ensureCatalogueRefs(
        dto.categoryId ?? existing.categoryId,
        dto.locationId ?? existing.locationId,
      );
    }
    let ownerId: string | undefined;
    if (dto.ownerId && dto.ownerId !== existing.ownerId) {
      if (!this.isAdmin(actor.roles)) {
        throw new ForbiddenException({
          message: "Only an admin can transfer vehicle ownership",
          code: "OWNER_TRANSFER_FORBIDDEN",
        });
      }
      await this.ensureUser(dto.ownerId);
      ownerId = dto.ownerId;
    }

    const data: Prisma.VehicleUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
      ...(dto.brand !== undefined ? { brand: dto.brand } : {}),
      ...(dto.registrationNumber !== undefined
        ? { registrationNumber: dto.registrationNumber }
        : {}),
      ...(dto.year !== undefined ? { year: dto.year } : {}),
      ...(dto.transmission !== undefined ? { transmission: dto.transmission } : {}),
      ...(dto.fuelType !== undefined ? { fuelType: dto.fuelType } : {}),
      ...(dto.seats !== undefined ? { seats: dto.seats } : {}),
      ...(dto.engine !== undefined ? { engine: dto.engine } : {}),
      ...(dto.mileage !== undefined ? { mileage: dto.mileage } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.popular !== undefined ? { popular: dto.popular } : {}),
      ...(dto.mileageLimitKm !== undefined
        ? { mileageLimitKm: dto.mileageLimitKm }
        : {}),
      ...(dto.depositAmount !== undefined
        ? { depositAmount: new Prisma.Decimal(dto.depositAmount) }
        : {}),
      ...(dto.categoryId ? { category: { connect: { id: dto.categoryId } } } : {}),
      ...(dto.locationId ? { location: { connect: { id: dto.locationId } } } : {}),
      ...(ownerId ? { owner: { connect: { id: ownerId } } } : {}),
    };

    const vehicle = await this.prisma.vehicle.update({
      where: { id },
      data,
      include: vehicleInclude,
    });
    return serializeVehicle(vehicle, { staff: true });
  }

  async remove(actor: AuthUser, id: string) {
    const vehicle = await this.findVehicle(id);
    this.assertCanManage(actor, vehicle.ownerId);
    // Retire instead of deleting: bookings and payments reference this vehicle.
    await this.prisma.vehicle.update({
      where: { id },
      data: { status: VehicleStatus.RETIRED },
    });
    return { success: true, status: VehicleStatus.RETIRED };
  }

  async addImage(actor: AuthUser, vehicleId: string, dto: VehicleImageInputDto) {
    const vehicle = await this.findVehicle(vehicleId);
    this.assertCanManage(actor, vehicle.ownerId);
    const makePrimary = dto.isPrimary === true || vehicle.images.length === 0;

    const image = await this.prisma.$transaction(async (tx) => {
      if (makePrimary) {
        await tx.vehicleImage.updateMany({
          where: { vehicleId },
          data: { isPrimary: false },
        });
      }
      return tx.vehicleImage.create({
        data: {
          vehicleId,
          url: dto.url,
          alt: dto.alt,
          sortOrder: dto.sortOrder ?? vehicle.images.length,
          isPrimary: makePrimary,
        },
      });
    });

    return {
      id: image.id,
      url: image.url,
      alt: image.alt,
      sortOrder: image.sortOrder,
      isPrimary: image.isPrimary,
    };
  }

  async updateImage(actor: AuthUser, imageId: string, dto: UpdateVehicleImageDto) {
    const image = await this.prisma.vehicleImage.findUnique({
      where: { id: imageId },
      include: { vehicle: { select: { ownerId: true } } },
    });
    if (!image) {
      throw new NotFoundException({
        message: "Vehicle image not found",
        code: "IMAGE_NOT_FOUND",
      });
    }
    this.assertCanManage(actor, image.vehicle.ownerId);

    await this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary === true) {
        await tx.vehicleImage.updateMany({
          where: { vehicleId: image.vehicleId, NOT: { id: imageId } },
          data: { isPrimary: false },
        });
      }
      await tx.vehicleImage.update({
        where: { id: imageId },
        data: {
          ...(dto.alt !== undefined ? { alt: dto.alt } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
          ...(dto.isPrimary !== undefined ? { isPrimary: dto.isPrimary } : {}),
        },
      });
    });

    const updated = await this.prisma.vehicleImage.findUniqueOrThrow({
      where: { id: imageId },
    });
    return {
      id: updated.id,
      url: updated.url,
      alt: updated.alt,
      sortOrder: updated.sortOrder,
      isPrimary: updated.isPrimary,
    };
  }

  async removeImage(actor: AuthUser, imageId: string) {
    const image = await this.prisma.vehicleImage.findUnique({
      where: { id: imageId },
      include: { vehicle: { select: { ownerId: true } } },
    });
    if (!image) {
      throw new NotFoundException({
        message: "Vehicle image not found",
        code: "IMAGE_NOT_FOUND",
      });
    }
    this.assertCanManage(actor, image.vehicle.ownerId);

    await this.prisma.$transaction(async (tx) => {
      await tx.vehicleImage.delete({ where: { id: imageId } });
      if (image.isPrimary) {
        const next = await tx.vehicleImage.findFirst({
          where: { vehicleId: image.vehicleId },
          orderBy: { sortOrder: "asc" },
        });
        if (next) {
          await tx.vehicleImage.update({
            where: { id: next.id },
            data: { isPrimary: true },
          });
        }
      }
    });
    return { success: true };
  }
}
