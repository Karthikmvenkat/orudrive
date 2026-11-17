import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/auth.decorators";
import { clientIp } from "../common/security/client-ip";
import { AuthService, type RequestMeta } from "./auth.service";
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  RequestPhoneCodeDto,
  ResendOtpDto,
  ResetPasswordDto,
  VerifyOtpDto,
  VerifyPhoneCodeDto,
} from "./auth.dto";

function metaFrom(request: Request): RequestMeta {
  return {
    ip: clientIp(request),
    userAgent: request.headers["user-agent"] ?? null,
  };
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("register")
  @ApiOperation({ summary: "Register a customer account and send an email OTP" })
  @ApiResponse({ status: 201, description: "Account created; OTP sent" })
  @ApiResponse({ status: 409, description: "Email or phone already registered" })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("login")
  @ApiOperation({ summary: "Sign in with email and password" })
  @ApiResponse({ status: 200, description: "Access and refresh tokens" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.auth.login(dto, metaFrom(request));
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("phone/request")
  @ApiOperation({ summary: "Send a login code to a mobile number" })
  @ApiResponse({ status: 200, description: "Code sent; unknown numbers create an account" })
  requestPhoneCode(@Body() dto: RequestPhoneCodeDto) {
    return this.auth.requestPhoneCode(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("phone/verify")
  @ApiOperation({ summary: "Exchange a phone code for a session" })
  @ApiResponse({ status: 200, description: "Access and refresh tokens" })
  @ApiResponse({ status: 400, description: "Invalid or expired code" })
  verifyPhoneCode(@Body() dto: VerifyPhoneCodeDto, @Req() request: Request) {
    return this.auth.verifyPhoneCode(dto, metaFrom(request));
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("refresh")
  @ApiOperation({ summary: "Rotate a refresh token and issue a new token pair" })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("logout")
  @ApiOperation({ summary: "Revoke the supplied refresh token" })
  logout(@Body() dto: RefreshTokenDto) {
    return this.auth.logout(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("forgot-password")
  @ApiOperation({ summary: "Send a password reset code" })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("reset-password")
  @ApiOperation({ summary: "Reset a password with a 6-digit code" })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("verify-otp")
  @ApiOperation({ summary: "Verify an email or phone code" })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 600_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("resend-otp")
  @ApiOperation({ summary: "Send a fresh verification code" })
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.auth.resendOtp(dto);
  }

  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post("change-password")
  @ApiOperation({ summary: "Change the current user's password" })
  changePassword(
    @CurrentUser("id") userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(userId, dto);
  }
}
