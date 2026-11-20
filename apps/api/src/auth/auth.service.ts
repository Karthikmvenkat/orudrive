import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { OtpPurpose, Prisma, UserStatus } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { PrismaService } from "../common/prisma/prisma.service";
import { PasswordService } from "../common/services/password.service";
import { PartnerGateService } from "../common/services/partner-gate.service";
import { OtpService } from "../common/otp/otp.service";
import { ttlToSeconds } from "../common/utils/ttl";
import type { RoleName } from "../common/constants/roles";
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  RequestPhoneCodeDto,
  ResendOtpDto,
  ResetPasswordDto,
  VerifyOtpDto,
  VerifyPhoneCodeDto,
} from "./auth.dto";

const userInclude = {
  userRoles: { include: { role: true } },
  customerProfile: true,
} satisfies Prisma.UserInclude;

type UserWithRoles = Prisma.UserGetPayload<{ include: typeof userInclude }>;

export interface RequestMeta {
  ip?: string | null;
  userAgent?: string | null;
}

export interface IssuedTokens {
  tokenType: "Bearer";
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  user: ReturnType<AuthService["userSummary"]>;
}

interface RefreshPayload {
  sub: string;
  type: string;
  jti?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly passwords: PasswordService,
    private readonly otp: OtpService,
    private readonly partnerGate: PartnerGateService,
  ) {}

  private get accessSecret(): string {
    return (
      this.config.get<string>("JWT_ACCESS_SECRET") ??
      "dev-only-access-secret-change-me"
    );
  }

  private get refreshSecret(): string {
    return (
      this.config.get<string>("JWT_REFRESH_SECRET") ??
      "dev-only-refresh-secret-change-me"
    );
  }

  private get accessTtl(): number {
    return ttlToSeconds(this.config.get<string>("JWT_ACCESS_TTL"), 900);
  }

  private get refreshTtl(): number {
    return ttlToSeconds(this.config.get<string>("JWT_REFRESH_TTL"), 2_592_000);
  }

  userSummary(user: UserWithRoles) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      fullName: user.customerProfile?.fullName ?? null,
      roles: user.userRoles.map((entry) => entry.role.name as RoleName),
      createdAt: user.createdAt,
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async ensureRole(name: RoleName) {
    return this.prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} role` },
    });
  }

  async register(dto: RegisterDto) {
    const email = this.normalizeEmail(dto.email);
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email }, ...(dto.phone ? [{ phone: dto.phone }] : [])] },
      select: { email: true, phone: true },
    });
    if (existing?.email === email) {
      throw new ConflictException({
        message: "An account with that email already exists",
        code: "EMAIL_TAKEN",
      });
    }
    if (existing?.phone && existing.phone === dto.phone) {
      throw new ConflictException({
        message: "An account with that phone already exists",
        code: "PHONE_TAKEN",
      });
    }

    const role = await this.ensureRole("CUSTOMER");
    const passwordHash = await this.passwords.hash(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          phone: dto.phone ?? null,
          passwordHash,
          status: UserStatus.PENDING_VERIFICATION,
          customerProfile: {
            create: {
              fullName: dto.fullName,
              city: dto.city ?? "Puducherry",
            },
          },
          userRoles: { create: [{ roleId: role.id }] },
        },
        include: userInclude,
      });
      return created;
    });

    const otp = await this.otp.issue(user.id, user.email, OtpPurpose.EMAIL_VERIFICATION);
    return {
      user: this.userSummary(user),
      message: "Account created. Enter the 6-digit code sent to your email.",
      verification: {
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        expiresInMinutes: otp.expiresInMinutes,
        ...(otp.devCode ? { devCode: otp.devCode } : {}),
      },
    };
  }

  async login(dto: LoginDto, meta: RequestMeta): Promise<IssuedTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(dto.email) },
      include: userInclude,
    });

    // Always run a hash comparison path so unknown emails are not trivially
    // distinguishable by response time.
    const passwordOk = user
      ? await this.passwords.verify(dto.password, user.passwordHash)
      : await this.passwords.verify(
          dto.password,
          "scrypt$00000000000000000000000000000000$" + "0".repeat(128),
        );

    if (!user || !passwordOk) {
      throw new UnauthorizedException({
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }
    if (user.status === UserStatus.PENDING_VERIFICATION) {
      throw new ForbiddenException({
        message: "Verify your email before signing in",
        code: "EMAIL_NOT_VERIFIED",
      });
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException({
        message: "This account is suspended",
        code: "ACCOUNT_SUSPENDED",
      });
    }
    if (user.status === UserStatus.DELETED) {
      throw new UnauthorizedException({
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }
    await this.partnerGate.assertSignInAllowed(
      user.id,
      user.userRoles.map((entry) => entry.role.name),
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const issued = await this.issueTokens(user, meta);
    return { ...issued, user: this.userSummary(user) };
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, "").slice(-10);
    return `+91${digits}`;
  }

  /** Phone numbers are stored in several shapes by older callers and seeds. */
  private phoneWhere(phone: string): Prisma.UserWhereInput {
    const digits = phone.replace(/\D/g, "");
    const local = digits.slice(-10);
    return {
      OR: [
        { phone: `+91${local}` },
        { phone: local },
        { phone: `+91 ${local.slice(0, 5)} ${local.slice(5)}` },
        { phone: { endsWith: local } },
      ],
    };
  }

  private stubPasswordHash(): Promise<string> {
    // Phone-first accounts never use a password, but the column is required;
    // this hash is of a random throwaway value nobody is given.
    return this.passwords.hash(randomUUID());
  }

  private async createPhoneAccount(phone: string): Promise<UserWithRoles> {
    const role = await this.ensureRole("CUSTOMER");
    const email = `${phone.replace(/\D/g, "")}@phone.savarigo.app`;
    try {
      return await this.prisma.user.create({
        data: {
          email,
          phone,
          passwordHash: await this.stubPasswordHash(),
          status: UserStatus.PENDING_VERIFICATION,
          customerProfile: {
            create: { fullName: "SavariGo rider", city: "Puducherry" },
          },
          userRoles: { create: [{ roleId: role.id }] },
        },
        include: userInclude,
      });
    } catch (cause) {
      // Two requests for the same new number can race; the loser reads the row
      // the winner created instead of failing the customer.
      if (
        cause instanceof Prisma.PrismaClientKnownRequestError &&
        cause.code === "P2002"
      ) {
        const existing = await this.prisma.user.findFirst({
          where: this.phoneWhere(phone),
          include: userInclude,
        });
        if (existing) return existing;
      }
      throw cause;
    }
  }

  /**
   * Phone + OTP is the app's only sign-in. A number that has never been seen
   * creates a customer account on first use, which is what "log in or sign up"
   * on the first screen promises.
   */
  async requestPhoneCode(dto: RequestPhoneCodeDto) {
    const phone = this.normalizePhone(dto.phone);
    let user = await this.prisma.user.findFirst({
      where: this.phoneWhere(dto.phone),
      include: userInclude,
    });
    if (!user) user = await this.createPhoneAccount(phone);

    const generic = {
      message: "If that number can sign in, a code is on its way.",
      expiresInMinutes: 10,
    };
    if (
      user.status === UserStatus.DELETED ||
      user.status === UserStatus.SUSPENDED
    ) {
      return generic;
    }

    const otp = await this.otp.issue(
      user.id,
      phone,
      OtpPurpose.PHONE_VERIFICATION,
    );
    return {
      message: "Enter the 6-digit code we sent to your phone.",
      expiresInMinutes: otp.expiresInMinutes,
      ...(otp.devCode ? { devCode: otp.devCode } : {}),
    };
  }

  async verifyPhoneCode(
    dto: VerifyPhoneCodeDto,
    meta: RequestMeta,
  ): Promise<IssuedTokens> {
    const phone = this.normalizePhone(dto.phone);
    const user = await this.prisma.user.findFirst({
      where: this.phoneWhere(dto.phone),
      include: userInclude,
    });
    if (!user || user.status === UserStatus.DELETED) {
      throw new UnauthorizedException({
        message: "Code is invalid or has expired",
        code: "INVALID_OTP",
      });
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException({
        message: "This account is suspended",
        code: "ACCOUNT_SUSPENDED",
      });
    }
    await this.partnerGate.assertSignInAllowed(
      user.id,
      user.userRoles.map((entry) => entry.role.name),
    );

    await this.otp.consume(
      phone,
      OtpPurpose.PHONE_VERIFICATION,
      dto.code,
      user.id,
    );

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        phoneVerifiedAt: new Date(),
        lastLoginAt: new Date(),
        ...(user.status === UserStatus.PENDING_VERIFICATION
          ? { status: UserStatus.ACTIVE }
          : {}),
      },
      include: userInclude,
    });

    const issued = await this.issueTokens(updated, meta);
    return { ...issued, user: this.userSummary(updated) };
  }

  async refresh(dto: RefreshTokenDto): Promise<IssuedTokens> {    let payload: RefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(dto.refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException({
        message: "Invalid or expired refresh token",
        code: "INVALID_REFRESH_TOKEN",
      });
    }
    if (payload.type !== "refresh") {
      throw new UnauthorizedException({
        message: "Invalid refresh token",
        code: "INVALID_REFRESH_TOKEN",
      });
    }

    const tokenHash = this.sha256(dto.refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: userInclude } },
    });
    if (!stored) {
      throw new UnauthorizedException({
        message: "Refresh token is no longer valid",
        code: "INVALID_REFRESH_TOKEN",
      });
    }
    if (stored.revokedAt) {
      // A rotated token was presented again: assume theft and kill the family.
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      this.logger.warn(`Refresh token reuse detected for user ${stored.userId}`);
      throw new UnauthorizedException({
        message: "Refresh token has been revoked",
        code: "REFRESH_TOKEN_REUSED",
      });
    }
    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException({
        message: "Refresh token has expired",
        code: "INVALID_REFRESH_TOKEN",
      });
    }

    const user = stored.user;
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException({
        message: "This account cannot refresh sessions",
        code: "ACCOUNT_INACTIVE",
      });
    }

    const roles = user.userRoles.map((entry) => entry.role.name as RoleName);
    await this.partnerGate.assertSignInAllowed(user.id, roles);
    const accessToken = await this.signAccessToken(user.id, user.email, roles);
    const refreshToken = await this.signRefreshToken(user.id);
    const refreshExpiresAt = new Date(Date.now() + this.refreshTtl * 1000);

    await this.prisma.$transaction(async (tx) => {
      const replacement = await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: this.sha256(refreshToken),
          expiresAt: refreshExpiresAt,
          userAgent: stored.userAgent,
          ipAddress: stored.ipAddress,
        },
      });
      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date(), replacedById: replacement.id },
      });
    });

    return {
      tokenType: "Bearer",
      accessToken,
      refreshToken,
      expiresIn: this.accessTtl,
      refreshExpiresIn: this.refreshTtl,
      user: this.userSummary(user),
    };
  }

  async logout(dto: RefreshTokenDto): Promise<{ success: true }> {
    const tokenHash = this.sha256(dto.refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(dto.email) },
      include: userInclude,
    });
    if (!user) {
      throw new BadRequestException({
        message: "Code is invalid or has expired",
        code: "INVALID_OTP",
      });
    }

    const identifier =
      dto.purpose === OtpPurpose.PHONE_VERIFICATION ? user.phone : user.email;
    if (!identifier) {
      throw new BadRequestException({
        message: "Add a phone number before verifying it",
        code: "PHONE_MISSING",
      });
    }

    await this.otp.consume(identifier, dto.purpose, dto.code, user.id);

    if (dto.purpose === OtpPurpose.EMAIL_VERIFICATION) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
          status:
            user.status === UserStatus.PENDING_VERIFICATION
              ? UserStatus.ACTIVE
              : user.status,
        },
      });
      await this.prisma.notification.create({
        data: {
          userId: user.id,
          type: "SYSTEM",
          channel: "IN_APP",
          title: "Welcome to SavariGo",
          body: "Your email is verified. Browse the fleet and book your first ride.",
          status: "SENT",
          sentAt: new Date(),
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { phoneVerifiedAt: new Date() },
      });
    }

    return {
      verified: true,
      purpose: dto.purpose,
      emailVerifiedAt:
        dto.purpose === OtpPurpose.EMAIL_VERIFICATION
          ? new Date().toISOString()
          : user.emailVerifiedAt,
    };
  }

  async resendOtp(dto: ResendOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(dto.email) },
      select: { id: true, email: true, phone: true, emailVerifiedAt: true, phoneVerifiedAt: true },
    });
    // Same response whether or not the account exists.
    const generic = {
      message: "If that account needs verification, a new code has been sent.",
      expiresInMinutes: 10,
    };
    if (!user) return generic;

    let identifier = user.email;
    if (dto.purpose === OtpPurpose.PHONE_VERIFICATION) {
      if (!user.phone) return generic;
      if (user.phoneVerifiedAt) return generic;
      identifier = user.phone;
    } else if (dto.purpose === OtpPurpose.EMAIL_VERIFICATION) {
      if (user.emailVerifiedAt) return generic;
    }

    await this.prisma.verificationCode.updateMany({
      where: { identifier, purpose: dto.purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    const otp = await this.otp.issue(user.id, identifier, dto.purpose);
    return { ...generic, ...(otp.devCode ? { devCode: otp.devCode } : {}) };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(dto.email) },
      select: { id: true, email: true, status: true },
    });
    const generic = {
      message: "If that email is registered, a reset code has been sent.",
    };
    if (!user || user.status === UserStatus.DELETED) return generic;

    await this.prisma.verificationCode.updateMany({
      where: {
        identifier: user.email,
        purpose: OtpPurpose.PASSWORD_RESET,
        consumedAt: null,
      },
      data: { consumedAt: new Date() },
    });
    const otp = await this.otp.issue(user.id, user.email, OtpPurpose.PASSWORD_RESET);
    return { ...generic, ...(otp.devCode ? { devCode: otp.devCode } : {}) };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(dto.email) },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new BadRequestException({
        message: "Code is invalid or has expired",
        code: "INVALID_OTP",
      });
    }

    await this.otp.consume(user.email, OtpPurpose.PASSWORD_RESET, dto.code, user.id);
    const passwordHash = await this.passwords.hash(dto.newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: "Password updated. Sign in with your new password." };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
    const ok = await this.passwords.verify(dto.currentPassword, user.passwordHash);
    if (!ok) {
      throw new BadRequestException({
        message: "Current password is incorrect",
        code: "INVALID_PASSWORD",
      });
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException({
        message: "New password must be different",
        code: "PASSWORD_UNCHANGED",
      });
    }

    const passwordHash = await this.passwords.hash(dto.newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    if (dto.revokeOtherSessions !== false) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { message: "Password updated" };
  }

  private async signAccessToken(
    userId: string,
    email: string,
    roles: RoleName[],
  ): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, email, roles, type: "access" },
      { secret: this.accessSecret, expiresIn: this.accessTtl },
    );
  }

  private async signRefreshToken(userId: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, type: "refresh", jti: randomUUID() },
      { secret: this.refreshSecret, expiresIn: this.refreshTtl },
    );
  }

  private async issueTokens(
    user: UserWithRoles,
    meta: RequestMeta,
  ): Promise<Omit<IssuedTokens, "user">> {
    const roles = user.userRoles.map((entry) => entry.role.name as RoleName);
    const accessToken = await this.signAccessToken(user.id, user.email, roles);
    const refreshToken = await this.signRefreshToken(user.id);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.sha256(refreshToken),
        expiresAt: new Date(Date.now() + this.refreshTtl * 1000),
        userAgent: meta.userAgent ?? null,
        ipAddress: meta.ip ?? null,
      },
    });

    return {
      tokenType: "Bearer",
      accessToken,
      refreshToken,
      expiresIn: this.accessTtl,
      refreshExpiresIn: this.refreshTtl,
    };
  }

  private sha256(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }
}
