import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateLocationDto {
  @ApiProperty({ example: "White Town Hub" })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ example: "white-town" })
  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "slug must be kebab-case" })
  @MaxLength(60)
  slug?: string;

  @ApiProperty({ example: "12 Rue de la Marine" })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  addressLine1!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @ApiPropertyOptional({ default: "Puducherry" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional({ default: "Puducherry" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  state?: string;

  @ApiProperty({ example: "605001" })
  @IsString()
  @MinLength(4)
  @MaxLength(10)
  postalCode!: string;

  @ApiPropertyOptional({ example: 11.9338 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  latitude?: number;

  @ApiPropertyOptional({ example: 79.8297 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  longitude?: number;

  @ApiPropertyOptional({ example: "9876543210" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ default: "07:00" })
  @IsOptional()
  @Matches(TIME, { message: "opensAt must be HH:mm" })
  opensAt?: string;

  @ApiPropertyOptional({ default: "23:00" })
  @IsOptional()
  @Matches(TIME, { message: "closesAt must be HH:mm" })
  closesAt?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateLocationDto extends PartialType(CreateLocationDto) {}
