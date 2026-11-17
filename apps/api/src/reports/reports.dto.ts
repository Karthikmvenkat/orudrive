import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

export const REPORT_GROUPS = ["day", "week", "month"] as const;
export type ReportGroup = (typeof REPORT_GROUPS)[number];

export class ReportQueryDto {
  @ApiPropertyOptional({ example: 30, minimum: 1, maximum: 365, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days = 30;

  @ApiPropertyOptional({ enum: REPORT_GROUPS, default: "day" })
  @IsOptional()
  @IsIn(REPORT_GROUPS)
  group?: ReportGroup;
}
