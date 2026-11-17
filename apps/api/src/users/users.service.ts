import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, UserStatus } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { ROLES, type RoleName } from "../common/constants/roles";
import { paginated } from "../common/dto/pagination.dto";
import {
  AssignRolesDto,
  UpdateMeDto,
  UpdateUserStatusDto,
  UsersQueryDto,
} from "./users.dto";

const safeUserInclude = {
  userRoles: { include: { role: true } },
  customerProfile: true,
  driverProfile: true,
  addresses: true,
} satisfies Prisma.UserInclude;

type SafeUser = Prisma.UserGetPayload<{ include: typeof safeUserInclude }>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(user: SafeUser) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.userRoles.map((entry) => entry.role.name as RoleName),
      customerProfile: user.customerProfile,
      driverProfile: user.driverProfile
        ? {
            id: user.driverProfile.id,
            verificationStatus: user.driverProfile.verificationStatus,
            rating: Number(user.driverProfile.rating),
            totalTrips: user.driverProfile.totalTrips,
            isAvailable: user.driverProfile.isAvailable,
          }
        : null,
      addresses: user.addresses,
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: safeUserInclude,
    });
    if (!user) throw new NotFoundException({ message: "User not found", code: "USER_NOT_FOUND" });
    return this.serialize(user);
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    if (dto.phone) {
      const taken = await this.prisma.user.findFirst({
        where: { phone: dto.phone, NOT: { id: userId } },
        select: { id: true },
      });
      if (taken) {
        throw new ConflictException({
          message: "That phone number is already in use",
          code: "PHONE_TAKEN",
        });
      }
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { ...(dto.phone ? { phone: dto.phone } : {}) },
      include: safeUserInclude,
    });
    return this.serialize(user);
  }

  async list(query: UsersQueryDto) {
    const where: Prisma.UserWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.role
        ? { userRoles: { some: { role: { name: query.role } } } }
        : {}),
      ...(query.q
        ? {
            OR: [
              { email: { contains: query.q, mode: "insensitive" } },
              { phone: { contains: query.q } },
              {
                customerProfile: {
                  fullName: { contains: query.q, mode: "insensitive" },
                },
              },
              {
                driverProfile: {
                  fullName: { contains: query.q, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: safeUserInclude,
        orderBy: { createdAt: "desc" },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginated(rows.map((row) => this.serialize(row)), total, query.page, query.limit);
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: safeUserInclude,
    });
    if (!user) throw new NotFoundException({ message: "User not found", code: "USER_NOT_FOUND" });
    return this.serialize(user);
  }

  async updateStatus(actorId: string, id: string, dto: UpdateUserStatusDto) {
    if (actorId === id && dto.status !== UserStatus.ACTIVE) {
      throw new BadRequestException({
        message: "You cannot deactivate your own account",
        code: "SELF_DEACTIVATION",
      });
    }
    await this.getById(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
      include: safeUserInclude,
    });
    if (dto.status !== UserStatus.ACTIVE) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return this.serialize(user);
  }

  async assignRoles(actorId: string, id: string, dto: AssignRolesDto) {
    const unique = [...new Set(dto.roles)];
    if (!unique.length) {
      throw new BadRequestException({
        message: "At least one role is required",
        code: "ROLES_REQUIRED",
      });
    }
    if (actorId === id && !unique.includes(ROLES.ADMIN)) {
      throw new BadRequestException({
        message: "You cannot remove your own admin role",
        code: "SELF_ROLE_CHANGE",
      });
    }
    await this.getById(id);

    const roles = await Promise.all(
      unique.map((name) =>
        this.prisma.role.upsert({
          where: { name },
          update: {},
          create: { name, description: `${name} role` },
        }),
      ),
    );

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: id } }),
      this.prisma.userRole.createMany({
        data: roles.map((role) => ({ userId: id, roleId: role.id })),
      }),
    ]);
    return this.getById(id);
  }

  async softDelete(actorId: string, id: string) {
    if (actorId === id) {
      throw new BadRequestException({
        message: "You cannot delete your own account from the admin API",
        code: "SELF_DELETION",
      });
    }
    await this.getById(id);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { status: UserStatus.DELETED },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { success: true };
  }
}
