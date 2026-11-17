import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from "class-validator";
import { PaginationQueryDto } from "../common/dto/pagination.dto";

export class UpdateCustomerProfileDto {
  @ApiPropertyOptional({ example: "Karthik R" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  fullName?: string;

  @ApiPropertyOptional({ example: "1996-04-18" })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: "TN0120190012345" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  licenceNumber?: string;

  @ApiPropertyOptional({ example: "2031-04-18" })
  @IsOptional()
  @IsDateString()
  licenceExpiry?: string;

  @ApiPropertyOptional({ example: "https://cdn.savarigo.com/avatars/karthik.jpg" })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: "Puducherry" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional({ description: "Free-form rider preferences" })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, unknown>;
}

export class CustomersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Search name, email or phone" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;
}
