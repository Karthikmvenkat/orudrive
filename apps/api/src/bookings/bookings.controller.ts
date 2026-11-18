import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/auth.decorators";
import { ROLES } from "../common/constants/roles";
import {
  AssignDriverDto,
  CancelBookingDto,
  CreateBookingDto,
  ManageBookingsQueryDto,
  MyBookingsQueryDto,
  UpdateBookingStatusDto,
} from "./bookings.dto";
import { BookingsService } from "./bookings.service";

@ApiTags("bookings")
@ApiBearerAuth()
@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post("quote")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: "Price a booking without reserving the vehicle" })
  quote(@Body() dto: CreateBookingDto) {
    return this.bookings.quote(dto);
  }

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: "Create a booking and reserve the vehicle" })
  create(
    @CurrentUser("id") userId: string,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookings.create(userId, dto);
  }

  @Get("me")
  @ApiOperation({ summary: "List my bookings" })
  listMine(
    @CurrentUser("id") userId: string,
    @Query() query: MyBookingsQueryDto,
  ) {
    return this.bookings.listMine(userId, query);
  }

  @Get("me/:idOrCode")
  @ApiOperation({ summary: "Get one of my bookings by id or code" })
  getMine(
    @CurrentUser("id") userId: string,
    @Param("idOrCode") idOrCode: string,
  ) {
    return this.bookings.getMine(userId, idOrCode);
  }

  @Get("manage")
  @Roles(ROLES.ADMIN, ROLES.SUPPORT)
  @ApiOperation({ summary: "List every booking (admin/support)" })
  listAll(@Query() query: ManageBookingsQueryDto) {
    return this.bookings.listForStaff(query);
  }

  @Get("manage/:id")
  @Roles(ROLES.ADMIN, ROLES.SUPPORT, ROLES.VENDOR)
  @ApiOperation({ summary: "Booking detail for staff or the vehicle owner" })
  getOne(@CurrentUser() actor: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.bookings.getManaged(actor, id);
  }

  @Patch(":id/status")
  @Roles(ROLES.ADMIN, ROLES.SUPPORT, ROLES.VENDOR)
  @ApiOperation({ summary: "Advance a booking through its lifecycle" })
  updateStatus(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookings.updateStatus(actor, id, dto);
  }

  @Patch(":id/driver")
  @Roles(ROLES.ADMIN, ROLES.SUPPORT)
  @ApiOperation({ summary: "Assign or unassign a driver" })
  assignDriver(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignDriverDto,
  ) {
    return this.bookings.assignDriver(actor, id, dto);
  }

  @Post(":id/cancel")
  @Roles(ROLES.CUSTOMER, ROLES.VENDOR, ROLES.ADMIN, ROLES.SUPPORT)
  @ApiOperation({ summary: "Cancel a booking and calculate the refund" })
  cancel(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookings.cancel(actor, id, dto);
  }
}
