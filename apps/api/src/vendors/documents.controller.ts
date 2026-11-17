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
