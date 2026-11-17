import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BookingStatus,
  DriverVerificationStatus,
  NotificationType,
  OtpPurpose,
  Prisma,
  UserStatus,
} from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { PasswordService } from "../common/services/password.service";
import { OtpService } from "../common/otp/otp.service";
import { paginated } from "../common/dto/pagination.dto";
import {
  DriverBookingsQueryDto,
  DriverQueryDto,
  DriverRegisterDto,
  DriverVerificationDto,
  ManageDriversQueryDto,
  UpdateDriverProfileDto,
} from "./drivers.dto";

const selfInclude = {
  user: {
    select: {
      id: true,
      email: true,
      phone: true,
      status: true,
      createdAt: true,
      customerProfile: { select: { city: true } },
    },
  },
} satisfies Prisma.DriverProfileInclude;

const publicInclude = {
  user: { select: { customerProfile: { select: { city: true } } } },
} satisfies Prisma.DriverProfileInclude;

const bookingInclude = {
  vehicle: {
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      category: true,
    },
  },
  customer: { include: { customerProfile: true } },
  pickupLocation: true,
  dropLocation: true,
} satisfies Prisma.BookingInclude;

type SelfDriver = Prisma.DriverProfileGetPayload<{ include: typeof selfInclude }>;
type PublicDriver = Prisma.DriverProfileGetPayload<{ include: typeof publicInclude }>;
type DriverBooking = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

@Injectable()
export class DriversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly otp: OtpService,
  ) {}

  private own(profile: SelfDriver) {
    return {
      id: profile.id,
      userId: profile.userId,
      fullName: profile.fullName,
      email: profile.user.email,
      phone: profile.user.phone,
      accountStatus: profile.user.status,
      licenceNumber: profile.licenceNumber,
      licenceExpiry: profile.licenceExpiry,
      experienceYears: profile.experienceYears,
      languages: profile.languages,
      bio: profile.bio,
      verificationStatus: profile.verificationStatus,
      rating: Number(profile.rating),
      totalTrips: profile.totalTrips,
      hourlyRate: Number(profile.hourlyRate),
      dailyRate: Number(profile.dailyRate),
      isAvailable: profile.isAvailable,
      city: profile.user.customerProfile?.city ?? null,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  private publicProfile(profile: PublicDriver) {
    return {
      id: profile.id,
      fullName: profile.fullName,
      experienceYears: profile.experienceYears,
      languages: profile.languages,
      bio: profile.bio,
      rating: Number(profile.rating),
      totalTrips: profile.totalTrips,
      hourlyRate: Number(profile.hourlyRate),
      dailyRate: Number(profile.dailyRate),
      isAvailable: profile.isAvailable,
      city: profile.user.customerProfile?.city ?? null,
    };
  }

  private bookingSummary(booking: DriverBooking) {
    const primary = booking.vehicle.images[0];
    return {
      id: booking.id,
      code: booking.code,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      pickupAt: booking.pickupAt,
      returnAt: booking.returnAt,
      durationDays: booking.durationDays,
      totalAmount: Number(booking.totalAmount),
      depositAmount: Number(booking.depositAmount),
      specialRequests: booking.specialRequests,
      customer: {
        fullName: booking.customer.customerProfile?.fullName ?? "SavariGo rider",
        phone:
          booking.status === BookingStatus.PENDING
            ? null
            : booking.customer.phone,
      },
      vehicle: {
        id: booking.vehicle.id,
        slug: booking.vehicle.slug,
        name: booking.vehicle.name,
        category: booking.vehicle.category.name,
        image: primary?.url ?? null,
      },
      pickupLocation: {
        id: booking.pickupLocation.id,
        name: booking.pickupLocation.name,
        address: booking.pickupLocation.addressLine1,
      },
      dropLocation: booking.dropLocation
        ? {
            id: booking.dropLocation.id,
            name: booking.dropLocation.name,
            address: booking.dropLocation.addressLine1,
          }
        : null,
      createdAt: booking.createdAt,
    };
  }

  private async ensureRole() {
    return this.prisma.role.upsert({
      where: { name: "DRIVER" },
      update: {},
      create: { name: "DRIVER", description: "Approved SavariGo driver" },
    });
  }

  async register(dto: DriverRegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { phone: dto.phone }] },
      select: { email: true },
    });
    if (existing) {
      throw new ConflictException({
        message:
          existing.email === email
            ? "An account with that email already exists"
            : "An account with that phone already exists",
        code: existing.email === email ? "EMAIL_TAKEN" : "PHONE_TAKEN",
      });
    }
    const licence = await this.prisma.driverProfile.findUnique({
      where: { licenceNumber: dto.licenceNumber },
      select: { id: true },
    });
    if (licence) {
      throw new ConflictException({
        message: "That driving licence is already registered",
        code: "LICENCE_TAKEN",
      });
    }

    const role = await this.ensureRole();
    const passwordHash = await this.passwords.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email,
        phone: dto.phone,
        passwordHash,
        status: UserStatus.PENDING_VERIFICATION,
        customerProfile: {
          create: {
            fullName: dto.fullName,
            city: dto.city ?? "Puducherry",
          },
        },
        driverProfile: {
          create: {
            fullName: dto.fullName,
            licenceNumber: dto.licenceNumber,
            licenceExpiry: new Date(dto.licenceExpiry),
            experienceYears: dto.experienceYears ?? 0,
            languages: dto.languages ?? [],
            bio: dto.bio ?? null,
            hourlyRate: new Prisma.Decimal(dto.hourlyRate),
            dailyRate: new Prisma.Decimal(dto.dailyRate),
            verificationStatus: DriverVerificationStatus.PENDING,
            isAvailable: false,
          },
        },
        userRoles: { create: [{ roleId: role.id }] },
      },
      include: { driverProfile: { include: selfInclude } },
    });

    const otp = await this.otp.issue(
      user.id,
      user.email,
      OtpPurpose.EMAIL_VERIFICATION,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
        roles: ["DRIVER"],
      },
      driver: user.driverProfile ? this.own(user.driverProfile) : null,
      message:
        "Driver application created. Verify your email, then our team reviews your licence.",
      verification: {
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        expiresInMinutes: otp.expiresInMinutes,
        ...(otp.devCode ? { devCode: otp.devCode } : {}),
      },
    };
  }

  async me(userId: string) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId },
      include: selfInclude,
    });
    if (!profile) {
      throw new NotFoundException({
        message: "No driver profile exists for this account",
        code: "DRIVER_PROFILE_NOT_FOUND",
      });
    }
    return this.own(profile);
  }

  async updateMe(userId: string, dto: UpdateDriverProfileDto) {
    await this.me(userId);
    const licenceChanged =
      dto.licenceNumber !== undefined || dto.licenceExpiry !== undefined;

    if (dto.licenceNumber) {
      const taken = await this.prisma.driverProfile.findFirst({
        where: { licenceNumber: dto.licenceNumber, NOT: { userId } },
        select: { id: true },
      });
      if (taken) {
        throw new ConflictException({
          message: "That driving licence is already registered",
          code: "LICENCE_TAKEN",
        });
      }
    }

    const profile = await this.prisma.driverProfile.update({
      where: { userId },
      data: {
        ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
        ...(dto.languages !== undefined ? { languages: dto.languages } : {}),
        ...(dto.experienceYears !== undefined
          ? { experienceYears: dto.experienceYears }
          : {}),
        ...(dto.hourlyRate !== undefined
          ? { hourlyRate: new Prisma.Decimal(dto.hourlyRate) }
          : {}),
        ...(dto.dailyRate !== undefined
          ? { dailyRate: new Prisma.Decimal(dto.dailyRate) }
          : {}),
        ...(dto.licenceNumber !== undefined
          ? { licenceNumber: dto.licenceNumber }
          : {}),
        ...(dto.licenceExpiry !== undefined
          ? { licenceExpiry: new Date(dto.licenceExpiry) }
          : {}),
        ...(licenceChanged
          ? {
              verificationStatus: DriverVerificationStatus.PENDING,
              isAvailable: false,
            }
          : {}),
      },
      include: selfInclude,
    });
    return this.own(profile);
  }

  async setAvailability(userId: string, isAvailable: boolean) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId },
      select: { id: true, verificationStatus: true },
    });
    if (!profile) {
      throw new NotFoundException({
        message: "No driver profile exists for this account",
        code: "DRIVER_PROFILE_NOT_FOUND",
      });
    }
    if (profile.verificationStatus !== DriverVerificationStatus.VERIFIED) {
      throw new ForbiddenException({
        message: "Only verified drivers can change availability",
        code: "DRIVER_NOT_VERIFIED",
      });
    }
    await this.prisma.driverProfile.update({
      where: { userId },
      data: { isAvailable },
    });
    return { isAvailable };
  }

  async listPublic(query: DriverQueryDto) {
    const where: Prisma.DriverProfileWhereInput = {
      verificationStatus: DriverVerificationStatus.VERIFIED,
      ...(query.available ? { isAvailable: true } : {}),
      ...(query.language ? { languages: { has: query.language } } : {}),
      ...(query.q
        ? {
            OR: [
              { fullName: { contains: query.q, mode: "insensitive" } },
              { bio: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.driverProfile.findMany({
        where,
        include: publicInclude,
        orderBy: [{ isAvailable: "desc" }, { rating: "desc" }],
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.driverProfile.count({ where }),
    ]);
    return paginated(rows.map((row) => this.publicProfile(row)), total, query.page, query.limit);
  }

  async listForAdmins(query: ManageDriversQueryDto) {
    const where: Prisma.DriverProfileWhereInput = {
      ...(query.status ? { verificationStatus: query.status } : {}),
      ...(query.available ? { isAvailable: true } : {}),
      ...(query.q
        ? {
            OR: [
              { fullName: { contains: query.q, mode: "insensitive" } },
              { licenceNumber: { contains: query.q, mode: "insensitive" } },
              { user: { email: { contains: query.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.driverProfile.findMany({
        where,
        include: selfInclude,
        orderBy: { createdAt: "desc" },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.driverProfile.count({ where }),
    ]);
    return paginated(rows.map((row) => this.own(row)), total, query.page, query.limit);
  }

  async getPublic(id: string) {
    const profile = await this.prisma.driverProfile.findFirst({
      where: { id, verificationStatus: DriverVerificationStatus.VERIFIED },
      include: publicInclude,
    });
    if (!profile) {
      throw new NotFoundException({
        message: "Driver not found",
        code: "DRIVER_NOT_FOUND",
      });
    }
    return this.publicProfile(profile);
  }

  async verify(id: string, dto: DriverVerificationDto) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException({
        message: "Driver not found",
        code: "DRIVER_NOT_FOUND",
      });
    }
    const updated = await this.prisma.driverProfile.update({
      where: { id },
      data: {
        verificationStatus: dto.status,
        ...(dto.status !== DriverVerificationStatus.VERIFIED
          ? { isAvailable: false }
          : {}),
      },
      include: selfInclude,
    });
    return this.own(updated);
  }

  async bookingRequests(userId: string, query: DriverBookingsQueryDto) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException({
        message: "No driver profile exists for this account",
        code: "DRIVER_PROFILE_NOT_FOUND",
      });
    }

    const where: Prisma.BookingWhereInput = {
      driverId: profile.id,
      status: query.status
        ? query.status
        : { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.ONGOING] },
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        include: bookingInclude,
        orderBy: { pickupAt: "asc" },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.booking.count({ where }),
    ]);
    return paginated(rows.map((row) => this.bookingSummary(row)), total, query.page, query.limit);
  }

  async acceptRequest(userId: string, bookingId: string) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId },
      select: { id: true, fullName: true },
    });
    if (!profile) {
      throw new NotFoundException({
        message: "No driver profile exists for this account",
        code: "DRIVER_PROFILE_NOT_FOUND",
      });
    }
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, driverId: profile.id },
      include: bookingInclude,
    });
    if (!booking) {
      throw new NotFoundException({
        message: "Booking request not found",
        code: "BOOKING_NOT_FOUND",
      });
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException({
        message: "Only pending requests can be accepted",
        code: "INVALID_BOOKING_STATUS",
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CONFIRMED, driverId: profile.id },
        include: bookingInclude,
      });
      await tx.notification.create({
        data: {
          userId: booking.customerId,
          type: NotificationType.BOOKING_CONFIRMED,
          channel: "IN_APP",
          title: "Driver assigned",
          body: `${profile.fullName} confirmed your booking ${booking.code}.`,
          status: "SENT",
          sentAt: new Date(),
          metadata: { bookingCode: booking.code },
        },
      });
      return result;
    });

    return this.bookingSummary(updated);
  }

  async declineRequest(userId: string, bookingId: string) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException({
        message: "No driver profile exists for this account",
        code: "DRIVER_PROFILE_NOT_FOUND",
      });
    }
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, driverId: profile.id },
      select: { id: true, status: true, customerId: true, code: true },
    });
    if (!booking) {
      throw new NotFoundException({
        message: "Booking request not found",
        code: "BOOKING_NOT_FOUND",
      });
    }
    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      throw new BadRequestException({
        message: "This booking can no longer be declined",
        code: "INVALID_BOOKING_STATUS",
      });
    }

    await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: booking.id },
        data: { driverId: null, status: BookingStatus.PENDING },
      }),
      this.prisma.notification.create({
        data: {
          userId: booking.customerId,
          type: NotificationType.SYSTEM,
          channel: "IN_APP",
          title: "Finding another driver",
          body: `Your driver could not take booking ${booking.code}. We are assigning someone else.`,
          status: "SENT",
          sentAt: new Date(),
          metadata: { bookingCode: booking.code },
        },
      }),
    ]);

    return { success: true };
  }
}
