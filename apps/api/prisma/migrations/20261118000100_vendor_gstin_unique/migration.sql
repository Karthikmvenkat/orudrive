-- One GSTIN may belong to one partner only. NULL stays allowed so a legacy
-- profile can exist while Master Admin chases the number up.
CREATE UNIQUE INDEX "vendor_profiles_gstin_key" ON "vendor_profiles"("gstin");
