import {
  Body,
  Controller,
  Get,
  Patch,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../common/decorators/auth.decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { ROLES } from "../common/constants/roles";
import {
  UpdateVendorProfileDto,
  VendorAvailabilityQueryDto,
  VendorBookingQueryDto,
} from "./vendors.dto";
import { VendorPortalService } from "./vendor-portal.service";

/** Everything here is scoped to the signed-in partner's own fleet. */
@ApiTags("partner portal")
@ApiBearerAuth()
@Controller("vendor")
@Roles(ROLES.VENDOR)
export class VendorController {
  constructor(private readonly portal: VendorPortalService) {}

  @Get("profile")
  @ApiOperation({ summary: "The signed-in partner's own profile" })
  profile(@CurrentUser() actor: AuthUser) {
    return this.portal.profile(actor);
  }

  @Patch("profile")
  @ApiOperation({ summary: "Update own trading details (commission and status stay admin-only)" })
  updateProfile(
    @CurrentUser() actor: AuthUser,
    @Body() dto: UpdateVendorProfileDto,
  ) {
    return this.portal.updateProfile(actor, dto);
  }

  @Get("overview")
  @ApiOperation({ summary: "Fleet, booking, earnings and review totals for this partner" })
  overview(@CurrentUser() actor: AuthUser) {
    return this.portal.overview(actor);
  }

  @Get("bookings")
  @ApiOperation({ summary: "Bookings on this partner's vehicles" })
  bookings(
    @CurrentUser() actor: AuthUser,
    @Query() query: VendorBookingQueryDto,
  ) {
    return this.portal.bookings(actor, query);
  }

  @Get("earnings")
  @ApiOperation({ summary: "Monthly gross, commission split and payout history" })
  earnings(@CurrentUser() actor: AuthUser) {
    return this.portal.earnings(actor);
  }

  @Get("availability")
  @ApiOperation({ summary: "Availability calendar rows for this partner's fleet" })
  availability(
    @CurrentUser() actor: AuthUser,
    @Query() query: VendorAvailabilityQueryDto,
  ) {
    return this.portal.availability(actor, query);
  }

  @Get("reviews")
  @ApiOperation({ summary: "Published reviews left on this partner's own vehicles" })
  reviews(@CurrentUser() actor: AuthUser) {
    return this.portal.reviews(actor);
  }
}
