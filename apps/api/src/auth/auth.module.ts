import { Module } from "@nestjs/common";
import { PartnerGateService } from "../common/services/partner-gate.service";
import { PasswordService } from "../common/services/password.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  controllers: [AuthController],
  providers: [AuthService, PasswordService, PartnerGateService],
  exports: [AuthService, PasswordService],
})
export class AuthModule {}
