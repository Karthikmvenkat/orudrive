import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsDefined, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { PaginationQueryDto } from "../common/dto/pagination.dto";

export class AuditLogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @ApiPropertyOptional({ example: "bookings" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  entityType?: string;

  @ApiPropertyOptional({ example: "PATCH /api/v1/bookings/:id/status" })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  action?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class UpdateSettingDto {
  @ApiProperty({
    description: "Any JSON value",
    example: { taxPercent: 18, supportPhone: "+91 90000 00000" },
  })
  @IsDefined()
  value!: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;
}
