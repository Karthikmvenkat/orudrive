import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../common/decorators/auth.decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { ROLES } from "../common/constants/roles";
import { AuditLogQueryDto, UpdateSettingDto } from "./admin.dto";
import { AdminService } from "./admin.service";

@ApiTags("admin")
@ApiBearerAuth()
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("overview")
  @Roles(ROLES.ADMIN, ROLES.SUPPORT)
  @ApiOperation({ summary: "Dashboard counts, revenue and recent bookings" })
  overview() {
    return this.admin.overview();
  }

  @Get("audit-logs")
  @Roles(ROLES.ADMIN, ROLES.SUPPORT)
  @ApiOperation({ summary: "Filterable audit trail of authenticated mutations" })
  auditLogs(@Query() query: AuditLogQueryDto) {
    return this.admin.auditLogs(query);
  }

  @Get("settings")
  @Roles(ROLES.ADMIN, ROLES.SUPPORT)
  @ApiOperation({ summary: "Runtime settings" })
  settings() {
    return this.admin.settings();
  }

  @Put("settings/:key")
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: "Create or update a runtime setting" })
  updateSetting(
    @CurrentUser() actor: AuthUser,
    @Param("key") key: string,
    @Body() dto: UpdateSettingDto,
  ) {
    return this.admin.updateSetting(actor, key, dto);
  }

  @Get("roles")
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: "Roles with their permissions and user counts" })
  roles() {
    return this.admin.roles();
  }
}
