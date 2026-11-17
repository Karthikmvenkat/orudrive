import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Public, Roles } from "../common/decorators/auth.decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ROLES } from "../common/constants/roles";
import {
  DriverAvailabilityDto,
  DriverBookingsQueryDto,
  DriverQueryDto,
  DriverRegisterDto,
  DriverVerificationDto,
  ManageDriversQueryDto,
  UpdateDriverProfileDto,
} from "./drivers.dto";
import { DriversService } from "./drivers.service";

@ApiTags("drivers")
@Controller("drivers")
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("register")
  @ApiOperation({ summary: "Apply as a driver and create an account" })
  register(@Body() dto: DriverRegisterDto) {
    return this.drivers.register(dto);
  }

  @ApiBearerAuth()
  @Get("me")
  @ApiOperation({ summary: "Current driver profile, including verification state" })
  me(@CurrentUser("id") userId: string) {
    return this.drivers.me(userId);
  }

  @ApiBearerAuth()
  @Patch("me")
  @ApiOperation({ summary: "Update the current driver profile" })
  updateMe(
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateDriverProfileDto,
  ) {
    return this.drivers.updateMe(userId, dto);
  }

  @ApiBearerAuth()
  @Patch("me/availability")
  @ApiOperation({ summary: "Toggle driver availability (verified drivers only)" })
  availability(
    @CurrentUser("id") userId: string,
    @Body() dto: DriverAvailabilityDto,
  ) {
    return this.drivers.setAvailability(userId, dto.isAvailable);
  }

  @ApiBearerAuth()
  @Get("me/bookings")
  @ApiOperation({ summary: "Booking requests assigned to the current driver" })
  bookings(
    @CurrentUser("id") userId: string,
    @Query() query: DriverBookingsQueryDto,
  ) {
    return this.drivers.bookingRequests(userId, query);
  }

  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post("me/bookings/:id/accept")
  @ApiOperation({ summary: "Accept an assigned booking request" })
  accept(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.drivers.acceptRequest(userId, id);
  }

  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post("me/bookings/:id/decline")
  @ApiOperation({ summary: "Decline an assigned booking request" })
  decline(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.drivers.declineRequest(userId, id);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: "List verified drivers" })
  list(@Query() query: DriverQueryDto) {
    return this.drivers.listPublic(query);
  }

  @ApiBearerAuth()
  @Get("manage")
  @Roles(ROLES.ADMIN, ROLES.SUPPORT)
  @ApiOperation({ summary: "List all driver applications (admin/support)" })
  manage(@Query() query: ManageDriversQueryDto) {
    return this.drivers.listForAdmins(query);
  }

  @ApiBearerAuth()
  @Patch(":id/verification")
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: "Approve, reject or suspend a driver (admin)" })
  verify(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DriverVerificationDto,
  ) {
    return this.drivers.verify(id, dto);
  }

  @Public()
  @Get(":id")
  @ApiOperation({ summary: "Public driver profile" })
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.drivers.getPublic(id);
  }
}
