-- Lowest active day rate is denormalised onto vehicles for list sorting and
-- price-range filters; the pricing service keeps it in sync.
ALTER TABLE "vehicles" ADD COLUMN "fromPrice" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE INDEX "vehicles_status_fromPrice_idx" ON "vehicles"("status", "fromPrice");
