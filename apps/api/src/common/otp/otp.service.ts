import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OtpPurpose } from "@prisma/client";
import { createHmac, randomInt } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";

export interface IssuedOtp {
  expiresInMinutes: number;
  devCode?: string;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async issue(
    userId: string,
    identifier: string,
    purpose: OtpPurpose,
  ): Promise<IssuedOtp> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const expiresInMinutes = purpose === OtpPurpose.PASSWORD_RESET ? 15 : 10;

    await this.prisma.verificationCode.create({
      data: {
        userId,
        identifier,
        purpose,
        codeHash: this.digest(identifier, purpose, code),
        expiresAt: new Date(Date.now() + expiresInMinutes * 60_000),
      },
    });

    if (purpose === OtpPurpose.PHONE_VERIFICATION) {
      this.logger.warn(
        `SMS provider is not configured; phone code for ${identifier} was not delivered`,
      );
      // With no gateway wired up, a non-production API has no way to deliver
      // the code, so it hands the code back to the caller to keep the phone
      // sign-in testable. Production must configure an SMS provider first.
      if (this.config.get<string>("NODE_ENV") !== "production") {
        this.logger.debug(`OTP for ${identifier} (${purpose}): ${code}`);
        return { expiresInMinutes, devCode: code };
      }
    } else {
      const subject =
        purpose === OtpPurpose.PASSWORD_RESET
          ? "SavariGo password reset code"
          : "Verify your SavariGo email";
      const text =
        purpose === OtpPurpose.PASSWORD_RESET
          ? `Your SavariGo password reset code is ${code}. It expires in ${expiresInMinutes} minutes. If you did not request this, ignore this email.`
          : `Welcome to SavariGo. Your verification code is ${code}. It expires in ${expiresInMinutes} minutes.`;
      await this.mail.send({ to: identifier, subject, text });
    }

    const expose =
      this.config.get<string>("NODE_ENV") !== "production" &&
      this.config.get<string>("AUTH_DEBUG_OTP") === "true";
    if (expose) {
      this.logger.debug(`OTP for ${identifier} (${purpose}): ${code}`);
      return { expiresInMinutes, devCode: code };
    }
    return { expiresInMinutes };
  }

  async consume(
    identifier: string,
    purpose: OtpPurpose,
    code: string,
    userId: string,
  ): Promise<void> {
    const record = await this.prisma.verificationCode.findFirst({
      where: { identifier, purpose, userId, consumedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (!record || record.expiresAt.getTime() <= Date.now() || record.attempts >= 5) {
      throw new BadRequestException({
        message: "Code is invalid or has expired",
        code: "INVALID_OTP",
      });
    }

    if (this.digest(identifier, purpose, code) !== record.codeHash) {
      await this.prisma.verificationCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException({
        message: "Code is invalid or has expired",
        code: "INVALID_OTP",
      });
    }

    await this.prisma.verificationCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
  }

  private digest(identifier: string, purpose: OtpPurpose, code: string): string {
    const secret =
      this.config.get<string>("OTP_SECRET") ??
      this.config.get<string>("JWT_REFRESH_SECRET") ??
      "dev-only-otp-secret";
    return createHmac("sha256", secret)
      .update(`${identifier}:${purpose}:${code}`)
      .digest("hex");
  }
}
