import { Module } from "@nestjs/common";
import { PasswordService } from "../common/services/password.service";
import { DriversController } from "./drivers.controller";
import { DriversService } from "./drivers.service";

@Module({
  controllers: [DriversController],
  providers: [DriversService, PasswordService],
  exports: [DriversService],
})
export class DriversModule {}
