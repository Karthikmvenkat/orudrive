import { Module } from "@nestjs/common";
import { PasswordService } from "../common/services/password.service";
import { PartnersService } from "./partners.service";
import { PartnersController } from "./partners.controller";
import { PartnerApplicationController } from "./partner-application.controller";
import { VendorPortalService } from "./vendor-portal.service";
import { VendorController } from "./vendor.controller";
import { DocumentsService } from "./documents.service";
import {
  AdminDocumentsController,
  DocumentFileController,
  VendorDocumentsController,
} from "./documents.controller";

@Module({
  controllers: [
    PartnersController,
    PartnerApplicationController,
    VendorController,
    AdminDocumentsController,
    VendorDocumentsController,
    DocumentFileController,
  ],
  providers: [
    PartnersService,
    VendorPortalService,
    DocumentsService,
    PasswordService,
  ],
  exports: [VendorPortalService],
})
export class VendorsModule {}
