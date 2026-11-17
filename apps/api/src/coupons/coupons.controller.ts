import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Public, Roles } from "../common/decorators/auth.decorators";
import { ROLES } from "../common/constants/roles";
import {
  CouponsQueryDto,
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
} from "./coupons.dto";
import { CouponsService } from "./coupons.service";

@ApiTags("coupons")
@Controller("coupons")
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "List currently valid coupon codes" })
  list() {
    return this.coupons.listPublic();
  }

  @Public()
  @Post("validate")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: "Preview a coupon discount for a vehicle" })
  validate(@Body() dto: ValidateCouponDto) {
    return this.coupons.validate(dto);
  }

  @ApiBearerAuth()
  @Get("manage")
  @Roles(ROLES.ADMIN, ROLES.SUPPORT)
  @ApiOperation({ summary: "List every coupon (admin/support)" })
  manage(@Query() query: CouponsQueryDto) {
    return this.coupons.listForAdmins(query);
  }

  @ApiBearerAuth()
  @Post()
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: "Create a coupon (admin)" })
  create(@Body() dto: CreateCouponDto) {
    return this.coupons.create(dto);
  }

  @ApiBearerAuth()
  @Patch(":id")
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: "Update a coupon (admin)" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.coupons.update(id, dto);
  }

  @ApiBearerAuth()
  @Delete(":id")
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: "Deactivate a coupon (admin)" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.coupons.remove(id);
  }
}
