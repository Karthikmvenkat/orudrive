import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  BookingItemKind,
  BookingStatus,
  PaymentStatus,
} from "@prisma/client";
import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { PaginationQueryDto } from "../common/dto/pagination.dto";

export class CreateBookingDto {
  @ApiProperty()
  @IsUUID()
  vehicleId!: string;

  @ApiProperty()
  @IsUUID()
  pickupLocationId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  dropLocationId?: string;

  @ApiProperty({ example: "2026-12-01T09:00:00+05:30" })
  @IsDateString()
  pickupAt!: string;

  @ApiProperty({ example: "2026-12-04T09:00:00+05:30" })
  @IsDateString()
  returnAt!: string;

  @ApiPropertyOptional({ example: "SAVARI100" })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  couponCode?: string;

  @ApiPropertyOptional({
    description: "Specific verified driver profile id",
  })
  @IsOptional()
  @IsUUID()
  driverId?: string;

  @ApiPropertyOptional({
    description: "Ask SavariGo to assign a driver",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requestDriver?: boolean;

  @ApiPropertyOptional({ enum: BookingItemKind, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsEnum(BookingItemKind, { each: true })
  addOns?: BookingItemKind[];

  @ApiPropertyOptional({ example: "Please deliver to White Town by 8am" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  specialRequests?: string;
}

export class MyBookingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}

export class ManageBookingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  driverId?: string;

  @ApiPropertyOptional({
    description: "Matches booking code, customer email or phone",
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  q?: string;

  @ApiPropertyOptional({ description: "Pickup on or after this date" })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: "Pickup on or before this date" })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class CancelBookingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class UpdateBookingStatusDto {
  @ApiProperty({
    enum: [
      BookingStatus.CONFIRMED,
      BookingStatus.ONGOING,
      BookingStatus.COMPLETED,
      BookingStatus.NO_SHOW,
    ],
  })
  @IsEnum(BookingStatus)
  @Transform(({ value }) =>
    typeof value === "string" ? value.toUpperCase() : value,
  )
  status!: BookingStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class AssignDriverDto {
  @ApiPropertyOptional({
    nullable: true,
    description: "Driver profile id; null unassigns the driver",
  })
  @IsOptional()
  @IsUUID()
  driverId?: string | null;
}
