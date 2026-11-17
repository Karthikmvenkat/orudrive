import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public, Roles } from "../common/decorators/auth.decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ROLES } from "../common/constants/roles";
import {
  AvailabilityQueryDto,
  CreateAvailabilityDto,
} from "./availability.dto";
import { AvailabilityService } from "./availability.service";

@ApiTags("availability")
@Controller("vehicles")
export class VehicleAvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Public()
  @Get(":vehicleId/availability")
  @ApiOperation({ summary: "Reserved and blocked ranges for a vehicle" })
  list(
    @Param("vehicleId", ParseUUIDPipe) vehicleId: string,
    @Query() query: AvailabilityQueryDto,
  ) {
    return this.availability.list(vehicleId, query);
  }

  @ApiBearerAuth()
  @Post(":vehicleId/availability")
  @Roles(ROLES.VENDOR, ROLES.ADMIN)
  @ApiOperation({ summary: "Block a vehicle for maintenance or owner use" })
  create(
    @CurrentUser() actor: Parameters<AvailabilityService["createBlock"]>[0],
    @Param("vehicleId", ParseUUIDPipe) vehicleId: string,
    @Body() dto: CreateAvailabilityDto,
  ) {
    return this.availability.createBlock(actor, vehicleId, dto);
  }
}

@ApiTags("availability")
@ApiBearerAuth()
@Controller("availability")
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Delete(":id")
  @Roles(ROLES.VENDOR, ROLES.ADMIN)
  @ApiOperation({ summary: "Remove a block; booked periods cannot be deleted" })
  remove(
    @CurrentUser() actor: Parameters<AvailabilityService["remove"]>[0],
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.availability.remove(actor, id);
  }
}
