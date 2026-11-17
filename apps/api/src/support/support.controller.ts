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
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/auth.decorators";
import { ROLES } from "../common/constants/roles";
import {
  CreateTicketDto,
  ReplyTicketDto,
  TicketQueryDto,
  UpdateTicketDto,
} from "./support.dto";
import { SupportService } from "./support.service";

@ApiTags("support")
@ApiBearerAuth()
@Controller("support/tickets")
@Roles(ROLES.CUSTOMER, ROLES.VENDOR)
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get()
  @ApiOperation({ summary: "Tickets raised by the signed-in rider or partner" })
  list(@CurrentUser() actor: AuthUser, @Query() query: TicketQueryDto) {
    return this.support.listMine(actor, query);
  }

  @Post()
  @ApiOperation({ summary: "Raise a support ticket" })
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateTicketDto) {
    return this.support.create(actor, dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "One of your tickets with its message thread" })
  get(@CurrentUser() actor: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.support.getMine(actor, id);
  }

  @Post(":id/replies")
  @ApiOperation({ summary: "Reply to your ticket" })
  reply(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReplyTicketDto,
  ) {
    return this.support.replyMine(actor, id, dto);
  }
}

@ApiTags("support")
@ApiBearerAuth()
@Controller("admin/tickets")
@Roles(ROLES.ADMIN, ROLES.SUPPORT)
export class AdminSupportController {
  constructor(private readonly support: SupportService) {}

  @Get()
  @ApiOperation({ summary: "Every ticket, filterable by status and priority" })
  list(@Query() query: TicketQueryDto) {
    return this.support.listForStaff(query);
  }

  @Get("counts")
  @ApiOperation({ summary: "Ticket counts by status" })
  counts() {
    return this.support.counts();
  }

  @Get(":id")
  @ApiOperation({ summary: "Ticket with its message thread" })
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.support.getForStaff(id);
  }

  @Post(":id/replies")
  @ApiOperation({ summary: "Staff reply, moves the ticket to IN_PROGRESS" })
  reply(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReplyTicketDto,
  ) {
    return this.support.replyByStaff(actor, id, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Change ticket status or priority" })
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateTicketDto) {
    return this.support.update(id, dto);
  }
}
