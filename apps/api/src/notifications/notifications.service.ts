import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { MailService } from "../common/mail/mail.service";
import { paginated } from "../common/dto/pagination.dto";
import { ROLES, RoleName } from "../common/constants/roles";
import {
  AdminNotificationsQueryDto,
  BroadcastNotificationDto,
  CreateNotificationDto,
  NotificationsQueryDto,
} from "./notifications.dto";

const MAX_BROADCAST_RECIPIENTS = 500;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  private serialize(row: {
    id: string;
    type: NotificationType;
    channel: NotificationChannel;
    title: string;
    body: string;
    status: NotificationStatus;
    readAt: Date | null;
    sentAt: Date | null;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
  }) {
    return {
      id: row.id,
      type: row.type,
      channel: row.channel,
      title: row.title,
      body: row.body,
      status: row.status,
      readAt: row.readAt,
      sentAt: row.sentAt,
      metadata: row.metadata,
      isRead: row.readAt !== null,
      createdAt: row.createdAt,
    };
  }

  /**
   * Writes an in-app notification. Email delivery is attempted when the
   * channel is EMAIL and SMTP is configured; failures are recorded honestly.
   */
  async create(input: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    channel?: NotificationChannel;
    metadata?: Record<string, unknown>;
  }) {
    const channel = input.channel ?? NotificationChannel.IN_APP;
    const now = new Date();

    if (channel === NotificationChannel.EMAIL) {
      const user = await this.prisma.user.findUnique({
        where: { id: input.userId },
        select: { email: true },
      });
      if (!user) {
        throw new NotFoundException({
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
      }
      const delivered = await this.mail.send({
        to: user.email,
        subject: input.title,
        text: input.body,
      });
      return this.prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          channel,
          title: input.title,
          body: input.body,
          status: delivered ? NotificationStatus.SENT : NotificationStatus.FAILED,
          sentAt: delivered ? now : null,
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
        },
      });
    }

    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        channel,
        title: input.title,
        body: input.body,
        status: NotificationStatus.SENT,
        sentAt: now,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  /** Best-effort notification used by other modules; never breaks the caller. */
  async notify(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.create({ userId, type, title, body, metadata });
    } catch {
      // Notification failures must not roll back the business transaction.
    }
  }

  async listMine(userId: string, query: NotificationsQueryDto) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(query.unread ? { readAt: null } : {}),
      ...(query.type ? { type: query.type } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return paginated(rows.map((row) => this.serialize(row)), total, query.page, query.limit);
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { unread: count };
  }

  async markRead(userId: string, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date(), status: NotificationStatus.READ },
    });
    if (result.count === 0) {
      throw new NotFoundException({
        message: "Notification not found",
        code: "NOTIFICATION_NOT_FOUND",
      });
    }
    return { success: true };
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date(), status: NotificationStatus.READ },
    });
    return { success: true, updated: result.count };
  }

  async remove(userId: string, id: string) {
    const result = await this.prisma.notification.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0) {
      throw new NotFoundException({
        message: "Notification not found",
        code: "NOTIFICATION_NOT_FOUND",
      });
    }
    return { success: true };
  }

  private async resolveRecipients(dto: BroadcastNotificationDto) {
    if (dto.userIds?.length) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: dto.userIds } },
        select: { id: true },
      });
      return users.map((user) => user.id);
    }
    if (!dto.role) {
      throw new BadRequestException({
        message: "Provide userIds or a role to target",
        code: "NOTIFICATION_TARGET_REQUIRED",
      });
    }
    const roleName = dto.role.toUpperCase();
    if (!Object.values(ROLES).includes(roleName as RoleName)) {
      throw new BadRequestException({
        message: `Unknown role "${dto.role}"`,
        code: "ROLE_NOT_FOUND",
      });
    }
    const users = await this.prisma.user.findMany({
      where: { userRoles: { some: { role: { name: roleName } } } },
      select: { id: true },
      take: MAX_BROADCAST_RECIPIENTS,
    });
    return users.map((user) => user.id);
  }

  async broadcast(dto: BroadcastNotificationDto) {
    const recipients = [...new Set(await this.resolveRecipients(dto))];
    if (!recipients.length) {
      throw new BadRequestException({
        message: "No matching recipients were found",
        code: "NOTIFICATION_NO_RECIPIENTS",
      });
    }
    if (recipients.length > MAX_BROADCAST_RECIPIENTS) {
      throw new BadRequestException({
        message: `A single broadcast is limited to ${MAX_BROADCAST_RECIPIENTS} recipients`,
        code: "NOTIFICATION_TOO_MANY_RECIPIENTS",
      });
    }

    const type = dto.type ?? NotificationType.OFFER;
    const channel = dto.channel ?? NotificationChannel.IN_APP;

    if (channel === NotificationChannel.EMAIL) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: recipients } },
        select: { id: true, email: true },
      });
      const results = await Promise.all(
        users.map(async (user) => {
          const delivered = await this.mail.send({
            to: user.email,
            subject: dto.title,
            text: dto.body,
          });
          return this.prisma.notification.create({
            data: {
              userId: user.id,
              type,
              channel,
              title: dto.title,
              body: dto.body,
              status: delivered
                ? NotificationStatus.SENT
                : NotificationStatus.FAILED,
              sentAt: delivered ? new Date() : null,
              metadata: dto.metadata as Prisma.InputJsonValue | undefined,
            },
          });
        }),
      );
      return { recipients: results.length, channel, type, sent: true };
    }

    await this.prisma.notification.createMany({
      data: recipients.map((userId) => ({
        userId,
        type,
        channel,
        title: dto.title,
        body: dto.body,
        status: NotificationStatus.SENT,
        sentAt: new Date(),
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      })),
    });
    return { recipients: recipients.length, channel, type, sent: true };
  }

  async sendToUser(dto: CreateNotificationDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException({
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }
    const row = await this.create({
      userId: dto.userId,
      type: dto.type ?? NotificationType.SYSTEM,
      channel: dto.channel ?? NotificationChannel.IN_APP,
      title: dto.title,
      body: dto.body,
      metadata: dto.metadata,
    });
    return this.serialize(row);
  }

  async listAll(query: AdminNotificationsQueryDto) {
    const where: Prisma.NotificationWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.channel ? { channel: query.channel } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: query.skip,
        take: query.limit,
        include: { user: { select: { email: true } } },
      }),
      this.prisma.notification.count({ where }),
    ]);
    return paginated(
      rows.map((row) => ({ ...this.serialize(row), userEmail: row.user.email })),
      total,
      query.page,
      query.limit,
    );
  }
}
