import { Module } from "@nestjs/common";
import { PartnerGateService } from "../common/services/partner-gate.service";
import { CouponsModule } from "../coupons/coupons.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PaymentsModule } from "../payments/payments.module";
import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";

@Module({
  imports: [CouponsModule, NotificationsModule, PaymentsModule],
  controllers: [BookingsController],
  providers: [BookingsService, PartnerGateService],
  exports: [BookingsService],
})
export class BookingsModule {}
