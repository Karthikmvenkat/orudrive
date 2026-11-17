import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "./common/config/env.validation";
import { PrismaModule } from "./common/prisma/prisma.module";
import { SecurityModule } from "./common/security/security.module";
import { AuditModule } from "./common/audit/audit.module";
import { MailModule } from "./common/mail/mail.module";
import { OtpModule } from "./common/otp/otp.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { CustomersModule } from "./customers/customers.module";
import { DriversModule } from "./drivers/drivers.module";
import { VehiclesModule } from "./vehicles/vehicles.module";
import { CategoriesModule } from "./categories/categories.module";
import { LocationsModule } from "./locations/locations.module";
import { AvailabilityModule } from "./availability/availability.module";
import { PricingModule } from "./pricing/pricing.module";
import { CouponsModule } from "./coupons/coupons.module";
import { BookingsModule } from "./bookings/bookings.module";
import { PaymentsModule } from "./payments/payments.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { VendorsModule } from "./vendors/vendors.module";
import { SupportModule } from "./support/support.module";
import { ReportsModule } from "./reports/reports.module";
import { AdminModule } from "./admin/admin.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      validate: validateEnv,
    }),
    PrismaModule,
    SecurityModule,
    AuditModule,
    MailModule,
    OtpModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    DriversModule,
    VehiclesModule,
    CategoriesModule,
    LocationsModule,
    AvailabilityModule,
    PricingModule,
    CouponsModule,
    BookingsModule,
    PaymentsModule,
    NotificationsModule,
    ReviewsModule,
    VendorsModule,
    SupportModule,
    ReportsModule,
    AdminModule,
  ],
})
export class AppModule {}
