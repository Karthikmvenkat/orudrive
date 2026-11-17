import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public, Roles } from "../common/decorators/auth.decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ROLES } from "../common/constants/roles";
import { CreatePricingDto, UpdatePricingDto } from "./pricing.dto";
import { PricingService } from "./pricing.service";

@ApiTags("pricing")
@Controller("vehicles")
export class VehiclePricingController {
  constructor(private readonly pricing: PricingService) {}

  @Public()
  @Get(":vehicleId/pricing")
  @ApiOperation({ summary: "Active pricing plans for a vehicle" })
  list(@Param("vehicleId", ParseUUIDPipe) vehicleId: string) {
    return this.pricing.listPublic(vehicleId);
  }
}

@ApiTags("pricing")
@ApiBearerAuth()
@Controller("pricing")
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Get("vehicle/:vehicleId")
  @Roles(ROLES.VENDOR, ROLES.ADMIN, ROLES.SUPPORT)
  @ApiOperation({ summary: "All pricing plans, including inactive (vendor/admin)" })
  manage(
    @CurrentUser() actor: Parameters<PricingService["listForStaff"]>[0],
    @Param("vehicleId", ParseUUIDPipe) vehicleId: string,
  ) {
    return this.pricing.listForStaff(actor, vehicleId);
  }

  @Post()
  @Roles(ROLES.VENDOR, ROLES.ADMIN)
  @ApiOperation({ summary: "Create a pricing plan (vendor/admin)" })
  create(
    @CurrentUser() actor: Parameters<PricingService["create"]>[0],
    @Body() dto: CreatePricingDto,
  ) {
    return this.pricing.create(actor, dto);
  }

  @Patch(":id")
  @Roles(ROLES.VENDOR, ROLES.ADMIN)
  @ApiOperation({ summary: "Update a pricing plan (vendor/admin)" })
  update(
    @CurrentUser() actor: Parameters<PricingService["update"]>[0],
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdatePricingDto,
  ) {
    return this.pricing.update(actor, id, dto);
  }

  @Delete(":id")
  @Roles(ROLES.VENDOR, ROLES.ADMIN)
  @ApiOperation({ summary: "Deactivate a pricing plan (vendor/admin)" })
  remove(
    @CurrentUser() actor: Parameters<PricingService["remove"]>[0],
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.pricing.remove(actor, id);
  }
}
