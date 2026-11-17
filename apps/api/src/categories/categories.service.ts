import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { VehicleStatus } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { randomSuffix, slugify } from "../common/utils/slug";
import { CreateCategoryDto, UpdateCategoryDto } from "./categories.dto";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private async stats() {
    const rows = await this.prisma.vehicle.groupBy({
      by: ["categoryId"],
      where: { status: VehicleStatus.AVAILABLE },
      _min: { fromPrice: true },
      _count: { _all: true },
    });
    return new Map(
      rows.map((row) => [
        row.categoryId,
        { count: row._count._all, from: Number(row._min.fromPrice ?? 0) },
      ]),
    );
  }

  async listPublic() {
    const [rows, stats] = await Promise.all([
      this.prisma.vehicleCategory.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      this.stats(),
    ]);
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      tagline: row.tagline,
      description: row.description,
      imageUrl: row.imageUrl,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      vehicleCount: stats.get(row.id)?.count ?? 0,
      fromPrice: stats.get(row.id)?.from ?? 0,
    }));
  }

  async listForAdmins() {
    const [rows, stats] = await Promise.all([
      this.prisma.vehicleCategory.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      this.stats(),
    ]);
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      tagline: row.tagline,
      description: row.description,
      imageUrl: row.imageUrl,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      vehicleCount: stats.get(row.id)?.count ?? 0,
      fromPrice: stats.get(row.id)?.from ?? 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async getPublic(idOrSlug: string) {
    const row = await this.prisma.vehicleCategory.findFirst({
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
        message: "Vehicle category not found",
        code: "CATEGORY_NOT_FOUND",
      });
    }
    const stats = await this.stats();
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      tagline: row.tagline,
      description: row.description,
      imageUrl: row.imageUrl,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      vehicleCount: stats.get(row.id)?.count ?? 0,
      fromPrice: stats.get(row.id)?.from ?? 0,
    };
  }

  private async uniqueSlug(value: string): Promise<string> {
    const base = slugify(value) || `category-${randomSuffix()}`;
    let candidate = base;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const exists = await this.prisma.vehicleCategory.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
      candidate = `${base}-${randomSuffix()}`;
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  async create(dto: CreateCategoryDto) {
    const slug = dto.slug ?? (await this.uniqueSlug(dto.name));
    try {
      return await this.prisma.vehicleCategory.create({
        data: {
          slug,
          name: dto.name,
          tagline: dto.tagline ?? null,
          description: dto.description ?? null,
          imageUrl: dto.imageUrl ?? null,
          sortOrder: dto.sortOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
      });
    } catch {
      throw new ConflictException({
        message: "A category with that slug already exists",
        code: "CATEGORY_SLUG_TAKEN",
      });
    }
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.ensureExists(id);
    return this.prisma.vehicleCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.tagline !== undefined ? { tagline: dto.tagline } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    const vehicles = await this.prisma.vehicle.count({ where: { categoryId: id } });
    if (vehicles > 0) {
      throw new BadRequestException({
        message: "Move or retire the category's vehicles before deleting it",
        code: "CATEGORY_HAS_VEHICLES",
      });
    }
    await this.prisma.vehicleCategory.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(id: string) {
    const row = await this.prisma.vehicleCategory.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!row) {
      throw new NotFoundException({
        message: "Vehicle category not found",
        code: "CATEGORY_NOT_FOUND",
      });
    }
  }
}
