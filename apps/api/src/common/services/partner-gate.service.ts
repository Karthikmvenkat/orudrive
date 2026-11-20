import { ForbiddenException, Injectable } from "@nestjs/common";
import { PartnerStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "../decorators/current-user.decorator";

/**
 * Master Admin approval is what turns a partner account on. Until it is given
 * the account cannot sign in at all; after it is withdrawn the session stops
 * refreshing. Writes that put fleet in front of customers keep the same check.
 */
@Injectable()
export class PartnerGateService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * An application Master Admin has not approved has no portal to open yet, so
   * signing in is part of the gate rather than a step before it.
   */
  async assertSignInAllowed(
    userId: string,
    roles: readonly string[],
  ): Promise<void> {
    if (!roles.includes("VENDOR")) return;
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
      select: { status: true },
    });
    if (!profile || profile.status === PartnerStatus.APPROVED) return;
    throw new ForbiddenException({
      message:
        profile.status === PartnerStatus.REJECTED
          ? "Your partner application was declined. Write to support@savarigo.com to reapply."
          : profile.status === PartnerStatus.SUSPENDED
            ? "Your partner account is suspended. Write to support@savarigo.com."
            : "Master Admin is still reviewing your application. You can sign in to the partner portal once it is approved.",
      code: "PARTNER_NOT_APPROVED",
    });
  }

  async assertApproved(actor: AuthUser): Promise<void> {
    if (!actor.roles.includes("VENDOR")) return;
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { userId: actor.id },
      select: { status: true },
    });
    if (!profile || profile.status !== PartnerStatus.APPROVED) {
      throw new ForbiddenException({
        message:
          "Master Admin must approve your partner account before you can add or change vehicles.",
        code: "PARTNER_NOT_APPROVED",
      });
    }
  }

  /**
   * The vehicle side of the same rule. A user without a partner profile is not
   * held to it, because fleet owned by staff is not what this gate exists for.
   */
  async assertOwnerApproved(ownerId: string): Promise<void> {
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { userId: ownerId },
      select: { status: true },
    });
    if (profile && profile.status !== PartnerStatus.APPROVED) {
      throw new ForbiddenException({
        message: "This vehicle is not open for booking right now.",
        code: "PARTNER_NOT_APPROVED",
      });
    }
  }

  async assertVehicleOwnerApproved(vehicleId: string): Promise<void> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { ownerId: true },
    });
    if (vehicle) await this.assertOwnerApproved(vehicle.ownerId);
  }
}
