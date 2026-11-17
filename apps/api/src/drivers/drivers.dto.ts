import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BookingStatus, DriverVerificationStatus } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { PaginationQueryDto } from "../common/dto/pagination.dto";

const INDIAN_MOBILE = /^(\+91[\s-]?)?[6-9]\d{9}$/;

export class DriverRegisterDto {
  @ApiProperty({ example: "suresh@drivers.savarigo.com" })
  @IsEmail()
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  email!: string;

  @ApiProperty({ example: "SavariGo@2026", minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/[A-Za-z]/)
  @Matches(/\d/)
  password!: string;

  @ApiProperty({ example: "Suresh Kumar" })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  fullName!: string;

  @ApiProperty({ example: "9876543210" })
  @Matches(INDIAN_MOBILE)
  phone!: string;

  @ApiProperty({ example: "TN0120190012345" })
  @IsString()
  @MinLength(5)
  @MaxLength(40)
  licenceNumber!: string;

  @ApiProperty({ example: "2031-04-18" })
  @IsDateString()
  licenceExpiry!: string;

  @ApiPropertyOptional({ default: 0, example: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  experienceYears?: number;

  @ApiPropertyOptional({ example: ["Tamil", "English"] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  languages?: string[];

  @ApiProperty({ example: 350 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  hourlyRate!: number;

  @ApiProperty({ example: 2200 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  dailyRate!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(600)
  bio?: string;

  @ApiPropertyOptional({ example: "Puducherry" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;
}

export class UpdateDriverProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(600)
  bio?: string;

  @ApiPropertyOptional({ example: ["Tamil", "English", "Hindi"] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  languages?: string[];

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  experienceYears?: number;

  @ApiPropertyOptional({ example: 400 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional({ example: 2500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  dailyRate?: number;

  @ApiPropertyOptional({ example: "TN0120190012345" })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(40)
  licenceNumber?: string;

  @ApiPropertyOptional({ example: "2032-04-18" })
  @IsOptional()
  @IsDateString()
  licenceExpiry?: string;
}

export class DriverAvailabilityDto {
  @ApiProperty()
  @IsBoolean()
  isAvailable!: boolean;
}

export class DriverQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Search name or bio" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional({ description: "Only drivers currently available" })
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  available?: boolean;

  @ApiPropertyOptional({ example: "Tamil" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  language?: string;
}

export class ManageDriversQueryDto extends DriverQueryDto {
  @ApiPropertyOptional({ enum: DriverVerificationStatus })
  @IsOptional()
  @IsEnum(DriverVerificationStatus)
  status?: DriverVerificationStatus;
}

export class DriverVerificationDto {
  @ApiProperty({ enum: DriverVerificationStatus })
  @IsEnum(DriverVerificationStatus)
  status!: DriverVerificationStatus;
}

export class DriverBookingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
