import { Module } from "@nestjs/common";
import { PartnerGateService } from "../common/services/partner-gate.service";
import { PricingController, VehiclePricingController } from "./pricing.controller";
import { PricingService } from "./pricing.service";

@Module({
  controllers: [VehiclePricingController, PricingController],
  providers: [PricingService, PartnerGateService],
  exports: [PricingService],
})
export class PricingModule {}
