import { Module } from "@nestjs/common";
import { PartnerGateService } from "../common/services/partner-gate.service";
import {
  AvailabilityController,
  VehicleAvailabilityController,
} from "./availability.controller";
import { AvailabilityService } from "./availability.service";

@Module({
  controllers: [VehicleAvailabilityController, AvailabilityController],
  providers: [AvailabilityService, PartnerGateService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
