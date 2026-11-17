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
import { Roles } from "../common/decorators/auth.decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ROLES } from "../common/constants/roles";
import {
  AdminNotificationsQueryDto,
  BroadcastNotificationDto,
  CreateNotificationDto,
  NotificationsQueryDto,
} from "./notifications.dto";
import { NotificationsService } from "./notifications.service";

@ApiTags("notifications")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "List my notifications" })
  listMine(
    @CurrentUser("id") userId: string,
    @Query() query: NotificationsQueryDto,
  ) {
    return this.notifications.listMine(userId, query);
  }

  @Get("unread-count")
  @ApiOperation({ summary: "Unread notification counter" })
  unread(@CurrentUser("id") userId: string) {
    return this.notifications.unreadCount(userId);
  }

  @Patch("read-all")
  @ApiOperation({ summary: "Mark every notification as read" })
  markAllRead(@CurrentUser("id") userId: string) {
    return this.notifications.markAllRead(userId);
  }

  @Get("manage")
  @Roles(ROLES.ADMIN, ROLES.SUPPORT)
  @ApiOperation({ summary: "List notifications across all users" })
  listAll(@Query() query: AdminNotificationsQueryDto) {
    return this.notifications.listAll(query);
  }

  @Post()
  @Roles(ROLES.ADMIN, ROLES.SUPPORT)
  @ApiOperation({ summary: "Send a notification to one user" })
  send(@Body() dto: CreateNotificationDto) {
    return this.notifications.sendToUser(dto);
  }

  @Post("broadcast")
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: "Broadcast to a role or a list of users" })
  broadcast(@Body() dto: BroadcastNotificationDto) {
    return this.notifications.broadcast(dto);
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark a notification as read" })
  markRead(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.notifications.markRead(userId, id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete one of my notifications" })
  remove(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.notifications.remove(userId, id);
  }
}
