import { ForbiddenException, Injectable } from "@nestjs/common";
import { PartnerStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "../decorators/current-user.decorator";

/**
 * Master Admin approval is what turns a partner account on. Reads stay open so a
 * pending partner can chase their own paperwork, but nothing that puts fleet in
 * front of customers — and nothing that books it — runs without APPROVED.
 */
@Injectable()
export class PartnerGateService {
  constructor(private readonly prisma: PrismaService) {}

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
