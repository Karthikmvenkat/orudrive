import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AvailabilityStatus,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { isOverlapViolation } from "../common/utils/overlap-violation";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import {
  AvailabilityQueryDto,
  CreateAvailabilityDto,
} from "./availability.dto";

const RESERVED_STATUSES = [
  AvailabilityStatus.BLOCKED,
  AvailabilityStatus.BOOKED,
  AvailabilityStatus.MAINTENANCE,
];

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

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
        message: "You can only manage availability for vehicles you own",
        code: "VEHICLE_FORBIDDEN",
      });
    }
  }

  private window(query: AvailabilityQueryDto) {
    const from = query.from ? new Date(query.from) : new Date();
    const to = query.to
      ? new Date(query.to)
      : new Date(from.getTime() + 30 * 86_400_000);
    if (to.getTime() <= from.getTime()) {
      throw new BadRequestException({
        message: "`to` must be after `from`",
        code: "INVALID_DATE_RANGE",
      });
    }
    return { from, to };
  }

  async list(vehicleId: string, query: AvailabilityQueryDto) {
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
    const { from, to } = this.window(query);

    const ranges = await this.prisma.vehicleAvailability.findMany({
      where: {
        vehicleId,
        status: { in: RESERVED_STATUSES },
        startsAt: { lt: to },
        endsAt: { gt: from },
      },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        status: true,
        note: true,
      },
    });

    return {
      vehicleId,
      from,
      to,
      isAvailable: ranges.length === 0,
      ranges,
    };
  }

  async createBlock(actor: AuthUser, vehicleId: string, dto: CreateAvailabilityDto) {
    await this.assertCanManage(actor, vehicleId);

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt.getTime() <= startsAt.getTime()) {
      throw new BadRequestException({
        message: "endsAt must be after startsAt",
        code: "INVALID_DATE_RANGE",
      });
    }
    const status = dto.status ?? AvailabilityStatus.BLOCKED;

    const overlap = await this.prisma.vehicleAvailability.findFirst({
      where: {
        vehicleId,
        status: { in: RESERVED_STATUSES },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true, startsAt: true, endsAt: true, status: true },
    });
    if (overlap) {
      throw new ConflictException({
        message: "That period overlaps an existing reservation or block",
        code: "AVAILABILITY_OVERLAP",
        details: overlap,
      });
    }

    // The GiST exclusion constraint is the final guard against concurrent
    // inserts; this pre-check just produces a friendlier error.
    const range = await this.prisma.vehicleAvailability.create({
      data: {
        vehicleId,
        startsAt,
        endsAt,
        status,
        note: dto.note ?? null,
      },
      select: {
        id: true,
        vehicleId: true,
        startsAt: true,
        endsAt: true,
        status: true,
        note: true,
        createdAt: true,
      },
    }).catch((error: unknown) => {
      if (!isOverlapViolation(error)) throw error;
      throw new ConflictException({
        message: "That period overlaps an existing reservation or block",
        code: "AVAILABILITY_OVERLAP",
      });
    });
    return range;
  }

  async remove(actor: AuthUser, id: string) {
    const range = await this.prisma.vehicleAvailability.findUnique({
      where: { id },
      include: { vehicle: { select: { ownerId: true } } },
    });
    if (!range) {
      throw new NotFoundException({
        message: "Availability block not found",
        code: "AVAILABILITY_NOT_FOUND",
      });
    }
    await this.assertCanManage(actor, range.vehicleId);
    if (range.status === AvailabilityStatus.BOOKED) {
      throw new BadRequestException({
        message: "Booked periods are released by cancelling the booking",
        code: "AVAILABILITY_BOOKED",
      });
    }

    await this.prisma.vehicleAvailability.delete({ where: { id } });
    return { success: true };
  }
}
