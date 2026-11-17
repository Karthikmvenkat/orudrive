import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AvailabilityStatus } from "@prisma/client";
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateAvailabilityDto {
  @ApiProperty({ example: "2026-12-01T09:00:00+05:30" })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ example: "2026-12-03T09:00:00+05:30" })
  @IsDateString()
  endsAt!: string;

  @ApiPropertyOptional({
    enum: [AvailabilityStatus.BLOCKED, AvailabilityStatus.MAINTENANCE],
    default: AvailabilityStatus.BLOCKED,
  })
  @IsOptional()
  @IsIn([AvailabilityStatus.BLOCKED, AvailabilityStatus.MAINTENANCE])
  status?: AvailabilityStatus;

  @ApiPropertyOptional({ example: "Scheduled service" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class AvailabilityQueryDto {
  @ApiPropertyOptional({ description: "Defaults to now" })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: "Defaults to 30 days from now" })
  @IsOptional()
  @IsDateString()
  to?: string;
}
