import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { DocumentKind, DocumentStatus, PartnerStatus } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import {
  IsBase64,
  IsDateString,
  IsDefined,
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmptyObject,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { PaginationQueryDto } from "../common/dto/pagination.dto";

const URL_PATTERN = /^(https?:\/\/|\/)/i;
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{3}$/;

// A GSTIN is only ever written in capitals, but an applicant who pastes a
// lowercase copy of theirs must not be rejected for it.
function uppercaseGstin({ value }: { value: unknown }) {
  return typeof value === "string" ? value.trim().toUpperCase() : value;
}

// ------------------------------------------------------------------ partners

// The commercial profile fields a partner can edit about themselves. Commission
// and status sit outside this class because only Master Admin may change them,
// and so does the GSTIN: it is proven by document, not self-declared.
export class PartnerProfileFieldsDto {
  @ApiProperty({ example: "Pondy Rides" })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  tradingName!: string;

  @ApiPropertyOptional({ example: "Pondy Rides Pvt Ltd" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  legalName?: string;

  @ApiPropertyOptional({ example: "+91 98400 12345" })
  @IsOptional()
  @Matches(/^\+?[0-9 \-]{8,20}$/, { message: "phone must be 8-20 digits" })
  phone?: string;

  @ApiPropertyOptional({ example: "Puducherry" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  city?: string;

  @ApiPropertyOptional({ example: "Puducherry" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine1?: string;

  @ApiPropertyOptional({ example: "/images/partners/pondy.jpg" })
  @IsOptional()
  @Matches(URL_PATTERN, { message: "logoUrl must be an absolute URL or site path" })
  @MaxLength(500)
  logoUrl?: string;
}

export class CreatePartnerDto extends PartnerProfileFieldsDto {
  @ApiProperty({ example: "owner@pondyrides.in" })
  @IsEmail()
  @MaxLength(160)
  email!: string;

  @ApiProperty({ example: "SavariGo@Partner2026", minLength: 10 })
  @IsString()
  @MinLength(10)
  @MaxLength(72)
  password!: string;

  @ApiProperty({ example: "33ABCDE1234F1Z5", description: "Mandatory: no partner exists without it" })
  @IsString()
  @Transform(uppercaseGstin)
  @Matches(GSTIN_PATTERN, {
    message: "gstin must match the 15-character GSTIN format",
  })
  gstin!: string;

  @ApiPropertyOptional({ example: 15, description: "Platform share, admin-controlled" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commissionPercent?: number;
}

export class UpdatePartnerDto extends PartialType(PartnerProfileFieldsDto) {
  @ApiPropertyOptional({ example: "33ABCDE1234F1Z5" })
  @IsOptional()
  @Transform(uppercaseGstin)
  @Matches(GSTIN_PATTERN, {
    message: "gstin must match the 15-character GSTIN format",
  })
  gstin?: string;
}

/**
 * What an applicant may say about themselves. Commission and status are absent
 * on purpose — they belong to Master Admin, and a public form must not be able
 * to hand them out.
 */
// A partner's paperwork travels with the application: Master Admin reviews the
// exact copy that was submitted, so an account can be decided without the
// applicant ever signing in. 2 MB decoded is a phone-camera scan of one page.
export const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
export const DOCUMENT_MEDIA_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;

export class ApplicationDocumentDto {
  @ApiProperty({ example: "gst-certificate.pdf" })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  fileName!: string;

  @ApiProperty({ enum: DOCUMENT_MEDIA_TYPES })
  @IsIn(DOCUMENT_MEDIA_TYPES)
  mediaType!: (typeof DOCUMENT_MEDIA_TYPES)[number];

  @ApiProperty({ description: "Base64 of the file, up to 2 MB once decoded" })
  @IsBase64()
  // Base64 grows by about a third, so the string cap keeps the decoded bytes
  // inside MAX_DOCUMENT_BYTES before anything is allocated.
  @MaxLength(Math.ceil((MAX_DOCUMENT_BYTES * 4) / 3) + 8)
  dataBase64!: string;
}

export class ApplyPartnerDto {
  @ApiProperty({ example: "Pondy Rides" })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  tradingName!: string;

  @ApiPropertyOptional({ example: "Pondy Rides Pvt Ltd" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  legalName?: string;

  @ApiProperty({ example: "owner@pondyrides.in" })
  @IsEmail()
  @MaxLength(160)
  email!: string;

  @ApiProperty({ example: "Pondy@Rides2026", minLength: 10 })
  @IsString()
  @MinLength(10)
  @MaxLength(72)
  password!: string;

  @ApiProperty({ example: "+919840012345" })
  @Matches(/^\+?[0-9 \-]{8,20}$/, { message: "phone must be 8-20 digits" })
  phone!: string;

  @ApiProperty({ example: "33ABCDE1234F1Z5" })
  @IsString()
  @Transform(uppercaseGstin)
  @Matches(GSTIN_PATTERN, {
    message: "gstin must match the 15-character GSTIN format",
  })
  gstin!: string;

  @ApiPropertyOptional({ example: "Puducherry" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  city?: string;

  @ApiPropertyOptional({ example: "Puducherry" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine1?: string;

  @ApiProperty({ type: ApplicationDocumentDto, description: "GST certificate copy" })
  @Type(() => ApplicationDocumentDto)
  @IsDefined({ message: "Attach the GST certificate" })
  @IsNotEmptyObject()
  @ValidateNested()
  gstDocument!: ApplicationDocumentDto;

  @ApiProperty({ type: ApplicationDocumentDto, description: "KYC proof copy" })
  @Type(() => ApplicationDocumentDto)
  @IsDefined({ message: "Attach the KYC proof" })
  @IsNotEmptyObject()
  @ValidateNested()
  kycDocument!: ApplicationDocumentDto;
}

export class SetPartnerStatusDto {
  @ApiProperty({ enum: PartnerStatus })
  @IsEnum(PartnerStatus)
  status!: PartnerStatus;

  @ApiPropertyOptional({ example: "KYC verified on call" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class SetCommissionDto {
  @ApiProperty({ example: 15 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  percent!: number;
}

export class PartnerQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PartnerStatus })
  @IsOptional()
  @IsEnum(PartnerStatus)
  status?: PartnerStatus;

  @ApiPropertyOptional({ example: "pondy" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @ApiPropertyOptional({ example: "Puducherry" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  city?: string;
}

// ------------------------------------------------------------- vendor portal

export class UpdateVendorProfileDto extends PartialType(PartnerProfileFieldsDto) {}

export class VendorBookingQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: "PENDING" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @ApiPropertyOptional({ example: "SVR" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @ApiPropertyOptional({ example: "2026-10-01T00:00:00.000Z" })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: "2026-11-30T23:59:59.000Z" })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: "Narrow the list to one of your vehicles" })
  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, {
    message: "vehicleId must be a uuid",
  })
  vehicleId?: string;
}

export class VendorAvailabilityQueryDto {
  @ApiPropertyOptional({ example: "2026-11-01T00:00:00.000Z" })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: "2026-12-01T00:00:00.000Z" })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, {
    message: "vehicleId must be a uuid",
  })
  vehicleId?: string;
}

// ------------------------------------------------------------------ documents

export class CreateVendorDocumentDto {
  @ApiProperty({ enum: DocumentKind })
  @IsEnum(DocumentKind)
  kind!: DocumentKind;

  @ApiProperty({ example: "RC book - TN10AB1234" })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @ApiProperty({ example: "/documents/rc-tn10ab1234.pdf" })
  @Matches(URL_PATTERN, { message: "url must be an absolute URL or site path" })
  @MaxLength(500)
  url!: string;

  @ApiPropertyOptional({ example: "TN10AB1234" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  reference?: string;

  @ApiPropertyOptional({ example: "2029-04-30" })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: "Required for VEHICLE_RC and INSURANCE" })
  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, {
    message: "vehicleId must be a uuid",
  })
  vehicleId?: string;
}

export class VerifyDocumentDto {
  @ApiProperty({ enum: DocumentStatus })
  @IsEnum(DocumentStatus)
  status!: DocumentStatus;

  @ApiPropertyOptional({ example: "Blurry RC copy" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class DocumentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: DocumentStatus })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional({ enum: DocumentKind })
  @IsOptional()
  @IsEnum(DocumentKind)
  kind?: DocumentKind;

  @ApiPropertyOptional({ example: "TN10" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;
}
