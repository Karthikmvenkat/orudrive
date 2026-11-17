import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { VehicleStatus } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { randomSuffix, slugify } from "../common/utils/slug";
import { CreateLocationDto, UpdateLocationDto } from "./locations.dto";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(
    row: {
      id: string;
      name: string;
      slug: string;
      addressLine1: string;
      addressLine2: string | null;
      city: string;
      state: string;
      postalCode: string;
      latitude: unknown;
      longitude: unknown;
      phone: string | null;
      opensAt: string;
      closesAt: string;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    },
    stats?: { count: number; from: number },
  ) {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2,
      city: row.city,
      state: row.state,
      postalCode: row.postalCode,
      latitude: row.latitude === null ? null : Number(row.latitude),
      longitude: row.longitude === null ? null : Number(row.longitude),
      phone: row.phone,
      opensAt: row.opensAt,
      closesAt: row.closesAt,
      isActive: row.isActive,
      vehicleCount: stats?.count ?? 0,
      fromPrice: stats?.from ?? 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async stats() {
    const rows = await this.prisma.vehicle.groupBy({
      by: ["locationId"],
      where: { status: VehicleStatus.AVAILABLE },
      _min: { fromPrice: true },
      _count: { _all: true },
    });
    return new Map(
      rows.map((row) => [
        row.locationId,
        { count: row._count._all, from: Number(row._min.fromPrice ?? 0) },
      ]),
    );
  }

  async listPublic() {
    const [rows, stats] = await Promise.all([
      this.prisma.vehicleLocation.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      this.stats(),
    ]);
    return rows.map((row) => this.serialize(row, stats.get(row.id)));
  }

  async listForAdmins() {
    const [rows, stats] = await Promise.all([
      this.prisma.vehicleLocation.findMany({ orderBy: { name: "asc" } }),
      this.stats(),
    ]);
    return rows.map((row) => this.serialize(row, stats.get(row.id)));
  }

  async getPublic(idOrSlug: string) {
    const row = await this.prisma.vehicleLocation.findFirst({
      where: {
        isActive: true,
        OR: [
          { slug: idOrSlug },
          ...(UUID_PATTERN.test(idOrSlug) ? [{ id: idOrSlug }] : []),
        ],
      },
    });
    if (!row) {
      throw new NotFoundException({
        message: "Location not found",
        code: "LOCATION_NOT_FOUND",
      });
    }
    const stats = await this.stats();
    return this.serialize(row, stats.get(row.id));
  }

  private async uniqueSlug(value: string): Promise<string> {
    const base = slugify(value) || `hub-${randomSuffix()}`;
    let candidate = base;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const exists = await this.prisma.vehicleLocation.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
      candidate = `${base}-${randomSuffix()}`;
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  async create(dto: CreateLocationDto) {
    const slug = dto.slug ?? (await this.uniqueSlug(dto.name));
    return this.prisma.vehicleLocation.create({
      data: {
        slug,
        name: dto.name,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2 ?? null,
        city: dto.city ?? "Puducherry",
        state: dto.state ?? "Puducherry",
        postalCode: dto.postalCode,
        latitude: dto.latitude !== undefined ? dto.latitude : null,
        longitude: dto.longitude !== undefined ? dto.longitude : null,
        phone: dto.phone ?? null,
        opensAt: dto.opensAt ?? "07:00",
        closesAt: dto.closesAt ?? "23:00",
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateLocationDto) {
    await this.ensureExists(id);
    return this.prisma.vehicleLocation.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.addressLine1 !== undefined ? { addressLine1: dto.addressLine1 } : {}),
        ...(dto.addressLine2 !== undefined ? { addressLine2: dto.addressLine2 } : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
        ...(dto.state !== undefined ? { state: dto.state } : {}),
        ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.opensAt !== undefined ? { opensAt: dto.opensAt } : {}),
        ...(dto.closesAt !== undefined ? { closesAt: dto.closesAt } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    const [vehicles, pickups, drops] = await Promise.all([
      this.prisma.vehicle.count({ where: { locationId: id } }),
      this.prisma.booking.count({ where: { pickupLocationId: id } }),
      this.prisma.booking.count({ where: { dropLocationId: id } }),
    ]);
    if (vehicles + pickups + drops > 0) {
      throw new BadRequestException({
        message: "This hub is referenced by vehicles or bookings; deactivate it instead",
        code: "LOCATION_IN_USE",
      });
    }
    await this.prisma.vehicleLocation.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(id: string) {
    const row = await this.prisma.vehicleLocation.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!row) {
      throw new NotFoundException({
        message: "Location not found",
        code: "LOCATION_NOT_FOUND",
      });
    }
  }
}
