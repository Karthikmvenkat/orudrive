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
import { Roles } from "../common/decorators/auth.decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { ROLES } from "../common/constants/roles";
import {
  CreatePartnerDto,
  PartnerQueryDto,
  SetCommissionDto,
  SetPartnerStatusDto,
  UpdatePartnerDto,
} from "./vendors.dto";
import { PartnersService } from "./partners.service";

@ApiTags("rental partners")
@ApiBearerAuth()
@Controller("admin/partners")
@Roles(ROLES.ADMIN, ROLES.SUPPORT)
export class PartnersController {
  constructor(private readonly partners: PartnersService) {}

  @Get()
  @ApiOperation({ summary: "Partner list with fleet, booking and revenue totals" })
  list(@Query() query: PartnerQueryDto) {
    return this.partners.list(query);
  }

  @Get("cities")
  @ApiOperation({ summary: "Partner counts grouped by city" })
  cities() {
    return this.partners.cities();
  }

  @Get(":id")
  @ApiOperation({ summary: "Partner detail with fleet, documents and tickets" })
  detail(@Param("id", ParseUUIDPipe) id: string) {
    return this.partners.detail(id);
  }

  @Post()
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: "Create a partner account (starts PENDING approval)" })
  create(@Body() dto: CreatePartnerDto) {
    return this.partners.create(dto);
  }

  @Patch(":id")
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: "Update partner profile fields" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdatePartnerDto,
  ) {
    return this.partners.update(id, dto);
  }

  @Patch(":id/status")
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: "Approve, reject or suspend a partner" })
  setStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SetPartnerStatusDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.partners.setStatus(id, dto, actor);
  }

  @Patch(":id/commission")
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: "Set the platform commission share for a partner" })
  setCommission(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SetCommissionDto,
  ) {
    return this.partners.setCommission(id, dto);
  }
}
