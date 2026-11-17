import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { paginated } from "../common/dto/pagination.dto";
import {
  CustomersQueryDto,
  UpdateCustomerProfileDto,
} from "./customers.dto";

const profileInclude = {
  user: {
    select: {
      id: true,
      email: true,
      phone: true,
      status: true,
      createdAt: true,
      _count: { select: { bookings: true } },
    },
  },
} satisfies Prisma.CustomerProfileInclude;

type Profile = Prisma.CustomerProfileGetPayload<{ include: typeof profileInclude }>;

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(profile: Profile) {
    return {
      id: profile.id,
      userId: profile.userId,
      fullName: profile.fullName,
      email: profile.user.email,
      phone: profile.user.phone,
      status: profile.user.status,
      dateOfBirth: profile.dateOfBirth,
      licenceNumber: profile.licenceNumber,
      licenceExpiry: profile.licenceExpiry,
      licenceVerifiedAt: profile.licenceVerifiedAt,
      avatarUrl: profile.avatarUrl,
      city: profile.city,
      preferences: profile.preferences,
      totalBookings: profile.user._count.bookings,
      memberSince: profile.user.createdAt,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  async me(userId: string) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
      include: profileInclude,
    });
    if (!profile) {
      throw new NotFoundException({
        message: "Customer profile not found",
        code: "CUSTOMER_PROFILE_NOT_FOUND",
      });
    }
    return this.serialize(profile);
  }

  async updateMe(userId: string, dto: UpdateCustomerProfileDto) {
    await this.me(userId);
    const profile = await this.prisma.customerProfile.update({
      where: { userId },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.dateOfBirth !== undefined
          ? { dateOfBirth: new Date(dto.dateOfBirth) }
          : {}),
        ...(dto.licenceNumber !== undefined
          ? { licenceNumber: dto.licenceNumber }
          : {}),
        ...(dto.licenceExpiry !== undefined
          ? { licenceExpiry: new Date(dto.licenceExpiry) }
          : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
        ...(dto.preferences !== undefined
          ? { preferences: dto.preferences as Prisma.InputJsonValue }
          : {}),
        // A changed licence must be re-verified by staff.
        ...(dto.licenceNumber !== undefined || dto.licenceExpiry !== undefined
          ? { licenceVerifiedAt: null }
          : {}),
      },
      include: profileInclude,
    });
    return this.serialize(profile);
  }

  async list(query: CustomersQueryDto) {
    const where: Prisma.CustomerProfileWhereInput = {
      ...(query.city ? { city: { equals: query.city, mode: "insensitive" } } : {}),
      ...(query.q
        ? {
            OR: [
              { fullName: { contains: query.q, mode: "insensitive" } },
              { user: { email: { contains: query.q, mode: "insensitive" } } },
              { user: { phone: { contains: query.q } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.customerProfile.findMany({
        where,
        include: profileInclude,
        orderBy: { createdAt: "desc" },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.customerProfile.count({ where }),
    ]);

    return paginated(rows.map((row) => this.serialize(row)), total, query.page, query.limit);
  }

  async getById(id: string) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { id },
      include: profileInclude,
    });
    if (!profile) {
      throw new NotFoundException({
        message: "Customer profile not found",
        code: "CUSTOMER_PROFILE_NOT_FOUND",
      });
    }
    return this.serialize(profile);
  }
}
