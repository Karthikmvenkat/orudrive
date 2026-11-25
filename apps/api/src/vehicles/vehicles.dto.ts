import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  FuelType,
  Transmission,
  VehicleStatus,
} from "@prisma/client";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { PaginationQueryDto } from "../common/dto/pagination.dto";

export const VEHICLE_SORTS = [
  "newest",
  "price_asc",
  "price_desc",
  "rating",
  "popular",
] as const;
export type VehicleSort = (typeof VEHICLE_SORTS)[number];

function toBoolean({ value }: { value: unknown }) {
  return value === true || value === "true";
}

export class VehicleImageInputDto {
  @ApiProperty({ example: "/images/vehicles/honda-activa-6g.jpg" })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  @Matches(/^(\/(?!\/)|https?:\/\/)/i, {
    message:
      "url must be a site-relative path or an http(s) URL; a javascript: or data: URL would be stored and then executed by whoever renders the gallery",
  })
  url!: string;

  @ApiProperty({ example: "Honda Activa 6G available for rent in Puducherry" })
  @IsString()
  @MaxLength(200)
  alt!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class PricingInputDto {
  @ApiPropertyOptional({ default: "Standard" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @ApiProperty({ example: 499 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  baseDayRate!: number;

  @ApiProperty({ example: 6 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  extraKmRate!: number;

  @ApiPropertyOptional({ example: 1500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  depositAmount?: number;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  mileageLimitKm?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minDays?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  weeklyDiscountPercent?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  monthlyDiscountPercent?: number;

  @ApiPropertyOptional({ example: "2026-01-01T00:00:00+05:30" })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ example: "2027-01-01T00:00:00+05:30" })
  @IsOptional()
  @IsDateString()
  validTo?: string;
}

export class CreateVehicleDto {
  @ApiPropertyOptional({ description: "Defaults to a slugified name" })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "slug must be kebab-case" })
  @MaxLength(80)
  slug?: string;

  @ApiProperty({ example: "Honda Activa 6G" })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: "Honda" })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  brand!: string;

  @ApiProperty({ description: "Vehicle category id" })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ description: "Pickup hub id" })
  @IsUUID()
  locationId!: string;

  @ApiProperty({ example: "PY01AB1234" })
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  registrationNumber!: string;

  @ApiProperty({ example: 2024 })
  @Type(() => Number)
  @IsInt()
  @Min(1990)
  @Max(2100)
  year!: number;

  @ApiProperty({ enum: Transmission })
  @IsEnum(Transmission)
  transmission!: Transmission;

  @ApiProperty({ enum: FuelType })
  @IsEnum(FuelType)
  fuelType!: FuelType;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  seats!: number;

  @ApiProperty({ example: "109.51 cc" })
  @IsString()
  @MaxLength(60)
  engine!: string;

  @ApiProperty({ example: "45 km/l" })
  @IsString()
  @MaxLength(60)
  mileage!: string;

  @ApiProperty({ example: "Comfortable automatic scooter for city rides." })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;

  @ApiPropertyOptional({ enum: VehicleStatus, default: VehicleStatus.DRAFT })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  popular?: boolean;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  mileageLimitKm?: number;

  @ApiPropertyOptional({
    example: 4,
    description: "Required when the category is van: bags the luggage bay holds",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  luggageCapacity?: number;

  @ApiPropertyOptional({
    example: true,
    description: "Required when the category is van: air conditioning fitted",
  })
  @IsOptional()
  @IsBoolean()
  ac?: boolean;

  @ApiProperty({ example: 1500 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  depositAmount!: number;

  @ApiPropertyOptional({ description: "Admin only: assign a different owner" })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ type: [VehicleImageInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => VehicleImageInputDto)
  images?: VehicleImageInputDto[];

  @ApiPropertyOptional({ type: PricingInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PricingInputDto)
  pricing?: PricingInputDto;
}

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {}

export class UpdateVehicleImageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  alt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class VehicleQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Search name, brand or description" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional({
    example: "scooter",
    description: "A category slug, or several separated by commas",
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @ApiPropertyOptional({ example: "Royal Enfield" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  brand?: string;

  @ApiPropertyOptional({ example: 4.5, description: "Minimum average rating" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({
    description: "Hide vehicles that are blocked or booked right now",
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  availableNow?: boolean;

  @ApiPropertyOptional({ example: "white-town" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  location?: string;

  @ApiPropertyOptional({ example: 300 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 1500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seats?: number;

  @ApiPropertyOptional({ enum: Transmission })
  @IsOptional()
  @IsEnum(Transmission)
  transmission?: Transmission;

  @ApiPropertyOptional({ enum: FuelType })
  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  popular?: boolean;

  @ApiPropertyOptional({ enum: VEHICLE_SORTS, default: "popular" })
  @IsOptional()
  @IsIn(VEHICLE_SORTS)
  sort?: VehicleSort;
}

export class ManageVehiclesQueryDto extends VehicleQueryDto {
  @ApiPropertyOptional({ enum: VehicleStatus })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @ApiPropertyOptional({ description: "Admin only: filter by owner id" })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({
    description: "Admin only: only vehicles with a booking overlapping this moment",
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  bookedNow?: boolean;
}
