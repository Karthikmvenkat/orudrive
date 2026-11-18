import { Module } from "@nestjs/common";
import { PartnerGateService } from "../common/services/partner-gate.service";
import { VehiclesController } from "./vehicles.controller";
import { VehiclesService } from "./vehicles.service";

@Module({
  controllers: [VehiclesController],
  providers: [VehiclesService, PartnerGateService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
