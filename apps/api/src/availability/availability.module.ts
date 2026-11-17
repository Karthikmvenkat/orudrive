import { Module } from "@nestjs/common";
import {
  AvailabilityController,
  VehicleAvailabilityController,
} from "./availability.controller";
import { AvailabilityService } from "./availability.service";

@Module({
  controllers: [VehicleAvailabilityController, AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
