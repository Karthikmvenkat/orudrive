import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/auth.decorators";
import { ROLES } from "../common/constants/roles";
import { DocumentsService } from "./documents.service";
import {
  CreateVendorDocumentDto,
  DocumentQueryDto,
  VerifyDocumentDto,
} from "./vendors.dto";

@ApiTags("document verification")
@ApiBearerAuth()
@Controller("admin/documents")
@Roles(ROLES.ADMIN, ROLES.SUPPORT)
export class AdminDocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: "Partner KYC, RC and insurance queue" })
  list(@Query() query: DocumentQueryDto) {
    return this.documents.listForAdmin(query);
  }

  @Patch(":id")
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: "Approve, reject or expire a document" })
  verify(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: VerifyDocumentDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.documents.verify(id, dto, actor);
  }
}

@ApiTags("partner portal")
@ApiBearerAuth()
@Controller("vendor/documents")
@Roles(ROLES.VENDOR)
export class VendorDocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: "This partner's own documents" })
  list(@CurrentUser() actor: AuthUser) {
    return this.documents.listForVendor(actor);
  }

  @Post()
  @ApiOperation({ summary: "Submit a document for Master Admin verification" })
  create(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateVendorDocumentDto,
  ) {
    return this.documents.createForVendor(actor, dto);
  }
}

@ApiTags("document verification")
@ApiBearerAuth()
@Controller("documents")
@Roles(ROLES.ADMIN, ROLES.SUPPORT, ROLES.VENDOR)
export class DocumentFileController {
  constructor(private readonly documents: DocumentsService) {}

  @Get(":id/file")
  @Header("Cache-Control", "private, no-store")
  @ApiOperation({ summary: "The stored copy of one document" })
  async file(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const document = await this.documents.open(actor, id);
    response.setHeader("Content-Type", document.mediaType);
    // The name arrived from an applicant's browser, so anything that could
    // break out of the quoted header value is replaced.
    response.setHeader(
      "Content-Disposition",
      `inline; filename="${document.fileName.replace(/[^A-Za-z0-9._-]/g, "_")}"`,
    );
    return document.bytes;
  }
}
