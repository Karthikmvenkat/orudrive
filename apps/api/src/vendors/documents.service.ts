import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DocumentStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { paginated } from "../common/dto/pagination.dto";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { ROLES } from "../common/constants/roles";
import { VendorPortalService } from "./vendor-portal.service";
import {
  CreateVendorDocumentDto,
  DocumentQueryDto,
  VerifyDocumentDto,
} from "./vendors.dto";

const VEHICLE_KINDS = ["VEHICLE_RC", "INSURANCE", "PERMISSION"] as const;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly portal: VendorPortalService,
  ) {}

  async listForAdmin(query: DocumentQueryDto) {
    const where: Prisma.VendorDocumentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: "insensitive" } },
              { reference: { contains: query.q, mode: "insensitive" } },
              { vendor: { tradingName: { contains: query.q, mode: "insensitive" } } },
              { vehicle: { registrationNumber: { contains: query.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [rows, total, pending] = await this.prisma.$transaction([
      this.prisma.vendorDocument.findMany({
        where,
        // The queue lists paperwork; the bytes are only ever pulled one at a
        // time by whoever is allowed to open them.
        omit: { contentBytes: true },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        skip: query.skip,
        take: query.limit,
        include: includeRelations(),
      }),
      this.prisma.vendorDocument.count({ where }),
      this.prisma.vendorDocument.count({ where: { status: DocumentStatus.PENDING } }),
    ]);

    return {
      ...paginated(rows.map(shape), total, query.page, query.limit),
      pendingCount: pending,
    };
  }

  async verify(id: string, dto: VerifyDocumentDto, actor: AuthUser) {
    const existing = await this.prisma.vendorDocument.findUnique({
      where: { id },
      include: { vendor: { select: { userId: true, tradingName: true } } },
    });
    if (!existing) {
      throw new NotFoundException({
        message: "Document not found",
        code: "DOCUMENT_NOT_FOUND",
      });
    }

    const row = await this.prisma.vendorDocument.update({
      where: { id },
      data: {
        status: dto.status,
        reviewNote: dto.note ?? null,
        reviewedAt: new Date(),
        reviewedById: actor.id,
      },
      include: includeRelations(),
    });

    await this.prisma.notification.create({
      data: {
        userId: existing.vendor.userId,
        type: "SYSTEM",
        title: `${existing.title} ${dto.status.toLowerCase()}`,
        body:
          dto.note ??
          `Master Admin marked this document as ${dto.status.toLowerCase()}.`,
        status: "SENT",
        sentAt: new Date(),
      },
    });

    return shape(row);
  }

  async listForVendor(actor: AuthUser) {
    const vendorId = await this.portal.vendorIdFor(actor.id);
    const rows = await this.prisma.vendorDocument.findMany({
      where: { vendorId },
      omit: { contentBytes: true },
      orderBy: { createdAt: "desc" },
      include: includeRelations(),
    });
    return rows.map(shape);
  }

  /**
   * The stored copy of a document. Master Admin and Support see every copy;
   * a partner only ever gets one of their own.
   */
  async open(actor: AuthUser, id: string) {
    const row = await this.prisma.vendorDocument.findUnique({
      where: { id },
      select: {
        vendor: { select: { id: true } },
        contentBytes: true,
        contentFileName: true,
        contentMediaType: true,
      },
    });

    const isReviewer =
      actor.roles.includes(ROLES.ADMIN) || actor.roles.includes(ROLES.SUPPORT);
    if (!isReviewer) {
      const vendorId = await this.portal.vendorIdFor(actor.id);
      if (row?.vendor.id !== vendorId) {
        throw new ForbiddenException({
          message: "That document belongs to another partner",
          code: "DOCUMENT_FORBIDDEN",
        });
      }
    }

    if (!row?.contentBytes) {
      throw new NotFoundException({
        message: "No file is stored for this document",
        code: "DOCUMENT_FILE_MISSING",
      });
    }

    return {
      bytes: Buffer.from(row.contentBytes),
      fileName: row.contentFileName ?? `${row.vendor.id}-document`,
      mediaType: row.contentMediaType ?? "application/octet-stream",
    };
  }

  async createForVendor(actor: AuthUser, dto: CreateVendorDocumentDto) {
    const profile = await this.portal.profileOf(actor.id);

    if ((VEHICLE_KINDS as readonly string[]).includes(dto.kind) && !dto.vehicleId) {
      throw new BadRequestException({
        message: `${dto.kind} documents must be linked to one of your vehicles`,
        code: "DOCUMENT_VEHICLE_REQUIRED",
      });
    }

    if (dto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: dto.vehicleId, ownerId: profile.userId },
        select: { id: true },
      });
      if (!vehicle) {
        throw new ForbiddenException({
          message: "That vehicle is not part of your fleet",
          code: "DOCUMENT_VEHICLE_FORBIDDEN",
        });
      }
    }

    const row = await this.prisma.vendorDocument.create({
      data: {
        vendorId: profile.id,
        vehicleId: dto.vehicleId ?? null,
        kind: dto.kind,
        title: dto.title,
        reference: dto.reference ?? null,
        url: dto.url,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        status: DocumentStatus.PENDING,
      },
      include: includeRelations(),
    });

    return shape(row);
  }
}

function includeRelations() {
  return {
    vendor: {
      select: {
        id: true,
        partnerCode: true,
        tradingName: true,
        city: true,
        user: { select: { email: true } },
      },
    },
    vehicle: {
      select: { id: true, name: true, registrationNumber: true },
    },
    reviewedBy: { select: { email: true } },
  } satisfies Prisma.VendorDocumentInclude;
}

type DocumentRow = Omit<
  Prisma.VendorDocumentGetPayload<{
    include: ReturnType<typeof includeRelations>;
  }>,
  "contentBytes"
>;

function shape(row: DocumentRow) {
  // Approved paperwork that has since run out reads as EXPIRED without a sweep.
  const expired =
    row.status === DocumentStatus.APPROVED &&
    row.expiresAt !== null &&
    row.expiresAt < new Date();

  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    reference: row.reference,
    url: row.url,
    hasFile: row.contentSizeBytes !== null,
    fileName: row.contentFileName,
    fileMediaType: row.contentMediaType,
    fileSizeBytes: row.contentSizeBytes,
    status: expired ? DocumentStatus.EXPIRED : row.status,
    expiresAt: row.expiresAt,
    reviewNote: row.reviewNote,
    reviewedAt: row.reviewedAt,
    reviewedByEmail: row.reviewedBy?.email ?? null,
    createdAt: row.createdAt,
    vendorId: row.vendor.id,
    partnerCode: row.vendor.partnerCode,
    vendorName: row.vendor.tradingName,
    vendorCity: row.vendor.city,
    vendorEmail: row.vendor.user.email,
    vehicleId: row.vehicle?.id ?? null,
    vehicleName: row.vehicle?.name ?? null,
    registrationNumber: row.vehicle?.registrationNumber ?? null,
  };
}
