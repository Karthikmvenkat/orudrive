import { ApiPropertyOptional } from "@nestjs/swagger";
import { UserStatus } from "@prisma/client";
import {
  IsArray,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { ROLES, type RoleName } from "../common/constants/roles";

const INDIAN_MOBILE = /^(\+91[\s-]?)?[6-9]\d{9}$/;

export class UpdateMeDto {
  @ApiPropertyOptional({ example: "9876543210" })
  @IsOptional()
  @Matches(INDIAN_MOBILE, { message: "phone must be a valid Indian mobile number" })
  phone?: string;
}

export class UsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Search email or phone" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ enum: Object.values(ROLES) })
  @IsOptional()
  @IsIn(Object.values(ROLES))
  role?: RoleName;
}

export class UpdateUserStatusDto {
  @ApiPropertyOptional({ enum: UserStatus })
  @IsEnum(UserStatus)
  status!: UserStatus;
}

export class AssignRolesDto {
  @ApiPropertyOptional({ enum: Object.values(ROLES), isArray: true })
  @IsArray()
  @IsIn(Object.values(ROLES), { each: true })
  roles!: RoleName[];
}
