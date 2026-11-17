import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { OtpPurpose } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

const INDIAN_MOBILE = /^(\+91[\s-]?)?[6-9]\d{9}$/;

export class RegisterDto {
  @ApiProperty({ example: "karthik@email.com" })
  @IsEmail()
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  email!: string;

  @ApiProperty({ example: "SavariGo@2026", minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/[A-Za-z]/, { message: "password must contain a letter" })
  @Matches(/\d/, { message: "password must contain a number" })
  password!: string;

  @ApiProperty({ example: "Karthik R" })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  fullName!: string;

  @ApiPropertyOptional({ example: "9876543210" })
  @IsOptional()
  @Matches(INDIAN_MOBILE, { message: "phone must be a valid Indian mobile number" })
  phone?: string;

  @ApiPropertyOptional({ example: "Puducherry" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;
}

export class LoginDto {
  @ApiProperty({ example: "karthik@email.com" })
  @IsEmail()
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  email!: string;

  @ApiProperty({ example: "SavariGo@2026" })
  @IsString()
  @MinLength(1)
  password!: string;
}

export class RequestPhoneCodeDto {
  @ApiProperty({ example: "+919876543210" })
  @Matches(INDIAN_MOBILE, { message: "phone must be a valid Indian mobile number" })
  phone!: string;
}

export class VerifyPhoneCodeDto {
  @ApiProperty({ example: "+919876543210" })
  @Matches(INDIAN_MOBILE, { message: "phone must be a valid Indian mobile number" })
  phone!: string;

  @ApiProperty({ example: "482913" })
  @Matches(/^\d{6}$/, { message: "code must be 6 digits" })
  code!: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: "Refresh token returned by login or refresh" })
  @IsString()
  @MinLength(20)
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: "karthik@email.com" })
  @IsEmail()
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: "karthik@email.com" })
  @IsEmail()
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  email!: string;

  @ApiProperty({ example: "482913" })
  @Matches(/^\d{6}$/, { message: "code must be 6 digits" })
  code!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/[A-Za-z]/, { message: "password must contain a letter" })
  @Matches(/\d/, { message: "password must contain a number" })
  newPassword!: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: "karthik@email.com" })
  @IsEmail()
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  email!: string;

  @ApiProperty({ enum: [OtpPurpose.EMAIL_VERIFICATION, OtpPurpose.PHONE_VERIFICATION] })
  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;

  @ApiProperty({ example: "482913" })
  @Matches(/^\d{6}$/, { message: "code must be 6 digits" })
  code!: string;
}

export class ResendOtpDto {
  @ApiProperty({ example: "karthik@email.com" })
  @IsEmail()
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  email!: string;

  @ApiProperty({ enum: OtpPurpose })
  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/[A-Za-z]/, { message: "password must contain a letter" })
  @Matches(/\d/, { message: "password must contain a number" })
  newPassword!: string;

  @ApiPropertyOptional({ default: false, description: "Revoke refresh tokens on other devices" })
  @IsOptional()
  @IsBoolean()
  revokeOtherSessions?: boolean;
}
