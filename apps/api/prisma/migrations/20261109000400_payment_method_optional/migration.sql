-- Payment method is only known after the gateway confirms checkout, so an
-- order that is waiting for payment has no method yet.
ALTER TABLE "payments" ALTER COLUMN "method" DROP NOT NULL;
