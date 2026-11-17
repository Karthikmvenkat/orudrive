import { Module } from "@nestjs/common";
import { PricingController, VehiclePricingController } from "./pricing.controller";
import { PricingService } from "./pricing.service";

@Module({
  controllers: [VehiclePricingController, PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
