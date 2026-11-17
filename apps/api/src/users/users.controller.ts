import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/auth.decorators";
import { ROLES } from "../common/constants/roles";
import {
  AssignRolesDto,
  UpdateMeDto,
  UpdateUserStatusDto,
  UsersQueryDto,
} from "./users.dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get("me")
  @ApiOperation({ summary: "Current user with profiles and addresses" })
  me(@CurrentUser("id") userId: string) {
    return this.users.me(userId);
  }

  @Patch("me")
  @ApiOperation({ summary: "Update the current user's contact details" })
  updateMe(@CurrentUser("id") userId: string, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(userId, dto);
  }

  @Get()
  @Roles(ROLES.ADMIN, ROLES.SUPPORT)
  @ApiOperation({ summary: "List users (admin/support)" })
  list(@Query() query: UsersQueryDto) {
    return this.users.list(query);
  }

  @Get(":id")
  @Roles(ROLES.ADMIN, ROLES.SUPPORT)
  @ApiOperation({ summary: "Get a user by id (admin/support)" })
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.users.getById(id);
  }

  @Patch(":id/status")
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: "Activate, suspend or delete a user (admin)" })
  updateStatus(
    @CurrentUser("id") actorId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.users.updateStatus(actorId, id, dto);
  }

  @Put(":id/roles")
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: "Replace a user's roles (admin)" })
  assignRoles(
    @CurrentUser("id") actorId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignRolesDto,
  ) {
    return this.users.assignRoles(actorId, id, dto);
  }

  @Delete(":id")
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: "Soft-delete a user and revoke sessions (admin)" })
  remove(
    @CurrentUser("id") actorId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.users.softDelete(actorId, id);
  }
}
