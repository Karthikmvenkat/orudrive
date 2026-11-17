import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  Prisma,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@prisma/client";
import { randomInt } from "node:crypto";
import { PrismaService } from "../common/prisma/prisma.service";
import { paginated } from "../common/dto/pagination.dto";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { ROLES } from "../common/constants/roles";
import {
  CreateTicketDto,
  ReplyTicketDto,
  TicketQueryDto,
  UpdateTicketDto,
} from "./support.dto";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TICKET_INCLUDE = {
  customer: {
    select: { email: true, customerProfile: { select: { fullName: true } } },
  },
  vendor: { select: { id: true, partnerCode: true, tradingName: true } },
  booking: { select: { id: true, code: true } },
  messages: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      isFromStaff: true,
      createdAt: true,
      author: { select: { email: true } },
    },
  },
} satisfies Prisma.SupportTicketInclude;

type TicketRow = Prisma.SupportTicketGetPayload<{
  include: typeof TICKET_INCLUDE;
}>;

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------- requesters

  async create(actor: AuthUser, dto: CreateTicketDto) {
    const scope = await this.scopeOf(actor);
    let bookingId: string | null = null;

    if (dto.bookingRef) {
      const booking = await this.prisma.booking.findFirst({
        where: {
          ...(UUID_PATTERN.test(dto.bookingRef)
            ? { id: dto.bookingRef }
            : { code: dto.bookingRef.trim().toUpperCase() }),
        },
        select: {
          id: true,
          customerId: true,
          vehicle: { select: { ownerId: true } },
        },
      });
      if (!booking) {
        throw new NotFoundException({
          message: "Booking not found",
          code: "BOOKING_NOT_FOUND",
        });
      }
      const related =
        scope.vendorId !== undefined
          ? booking.vehicle.ownerId === actor.id
          : booking.customerId === actor.id;
      if (!related) {
        throw new ForbiddenException({
          message: "That booking does not belong to you",
          code: "TICKET_BOOKING_FORBIDDEN",
        });
      }
      bookingId = booking.id;
    }

    const code = await this.nextCode();
    const ticket = await this.prisma.supportTicket.create({
      data: {
        code,
        customerId: scope.customerId ?? null,
        vendorId: scope.vendorId ?? null,
        bookingId,
        category: dto.category,
        priority: dto.priority ?? TicketPriority.NORMAL,
        subject: dto.subject,
        status: TicketStatus.OPEN,
        messages: {
          create: {
            authorId: actor.id,
            body: dto.message,
            isFromStaff: this.isStaff(actor.roles),
          },
        },
      },
      include: TICKET_INCLUDE,
    });

    return shape(ticket);
  }

  async listMine(actor: AuthUser, query: TicketQueryDto) {
    const scope = await this.scopeOf(actor);
    const where: Prisma.SupportTicketWhereInput = {
      ...(scope.vendorId
        ? { vendorId: scope.vendorId }
        : { customerId: actor.id }),
      ...this.filters(query),
    };
    return this.page(where, query);
  }

  async getMine(actor: AuthUser, id: string) {
    const scope = await this.scopeOf(actor);
    const ticket = await this.prisma.supportTicket.findFirst({
      where: {
        id,
        ...(scope.vendorId
          ? { vendorId: scope.vendorId }
          : { customerId: actor.id }),
      },
      include: TICKET_INCLUDE,
    });
    if (!ticket) throw this.notFound();
    return shape(ticket);
  }

  async replyMine(actor: AuthUser, id: string, dto: ReplyTicketDto) {
    const existing = await this.getMine(actor, id);
    await this.prisma.supportMessage.create({
      data: {
        ticketId: existing.id,
        authorId: actor.id,
        body: dto.body,
        isFromStaff: this.isStaff(actor.roles),
      },
    });
    // A requester reply re-opens anything staff had marked as resolved.
    if (
      existing.status === TicketStatus.RESOLVED ||
      existing.status === TicketStatus.CLOSED
    ) {
      await this.prisma.supportTicket.update({
        where: { id: existing.id },
        data: { status: TicketStatus.IN_PROGRESS, closedAt: null },
      });
    }
    return this.getMine(actor, id);
  }

  // ------------------------------------------------------------------ staff

  async listForStaff(query: TicketQueryDto) {
    return this.page(this.filters(query), query);
  }

  async getForStaff(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: TICKET_INCLUDE,
    });
    if (!ticket) throw this.notFound();
    return shape(ticket);
  }

  async replyByStaff(actor: AuthUser, id: string, dto: ReplyTicketDto) {
    await this.getForStaff(id);
    await this.prisma.supportMessage.create({
      data: { ticketId: id, authorId: actor.id, body: dto.body, isFromStaff: true },
    });
    await this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: TicketStatus.IN_PROGRESS,
        closedAt: null,
      },
    });
    return this.getForStaff(id);
  }

  async update(id: string, dto: UpdateTicketDto) {
    await this.getForStaff(id);
    const closing =
      dto.status === TicketStatus.RESOLVED || dto.status === TicketStatus.CLOSED;
    const row = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.priority ? { priority: dto.priority } : {}),
        closedAt: closing ? new Date() : dto.status ? null : undefined,
      },
      include: TICKET_INCLUDE,
    });
    return shape(row);
  }

  async counts() {
    const rows = await this.prisma.supportTicket.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    const byStatus = Object.fromEntries(
      rows.map((row) => [row.status, row._count._all]),
    ) as Record<TicketStatus, number>;
    return {
      total: rows.reduce((sum, row) => sum + row._count._all, 0),
      open: byStatus[TicketStatus.OPEN] ?? 0,
      inProgress: byStatus[TicketStatus.IN_PROGRESS] ?? 0,
      resolved: byStatus[TicketStatus.RESOLVED] ?? 0,
      closed: byStatus[TicketStatus.CLOSED] ?? 0,
      byStatus,
    };
  }

  // ---------------------------------------------------------------- helpers

  private filters(query: TicketQueryDto): Prisma.SupportTicketWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.q
        ? {
            OR: [
              { subject: { contains: query.q, mode: "insensitive" } },
              { code: { contains: query.q, mode: "insensitive" } },
              { messages: { some: { body: { contains: query.q, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };
  }

  private async page(where: Prisma.SupportTicketWhereInput, query: TicketQueryDto) {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
        skip: query.skip,
        take: query.limit,
        include: TICKET_INCLUDE,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return paginated(rows.map(shape), total, query.page, query.limit);
  }

  /** Partners raise tickets as the partner; everyone else as a customer. */
  private async scopeOf(actor: AuthUser) {
    if (!actor.roles.includes(ROLES.VENDOR)) return { customerId: actor.id };
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { userId: actor.id },
      select: { id: true },
    });
    return profile ? { vendorId: profile.id } : { customerId: actor.id };
  }

  private isStaff(roles: AuthUser["roles"]) {
    return roles.includes(ROLES.ADMIN) || roles.includes(ROLES.SUPPORT);
  }

  private async nextCode() {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const candidate = `TCK${randomInt(100_000, 1_000_000)}`;
      const clash = await this.prisma.supportTicket.findUnique({
        where: { code: candidate },
        select: { id: true },
      });
      if (!clash) return candidate;
    }
    return `TCK${Date.now().toString(36).toUpperCase()}`;
  }

  private notFound() {
    return new NotFoundException({
      message: "Support ticket not found",
      code: "TICKET_NOT_FOUND",
    });
  }
}

function shape(ticket: TicketRow) {
  const messages = ticket.messages.map((message) => ({
    id: message.id,
    body: message.body,
    isFromStaff: message.isFromStaff,
    authorEmail: message.author?.email ?? null,
    createdAt: message.createdAt,
  }));
  return {
    id: ticket.id,
    code: ticket.code,
    subject: ticket.subject,
    category: ticket.category as TicketCategory,
    priority: ticket.priority,
    status: ticket.status,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    closedAt: ticket.closedAt,
    customerName: ticket.customer?.customerProfile?.fullName ?? null,
    customerEmail: ticket.customer?.email ?? null,
    partnerCode: ticket.vendor?.partnerCode ?? null,
    partnerName: ticket.vendor?.tradingName ?? null,
    bookingId: ticket.booking?.id ?? null,
    bookingCode: ticket.booking?.code ?? null,
    messageCount: messages.length,
    lastMessage: messages.at(-1)?.body ?? "",
    messages,
  };
}
