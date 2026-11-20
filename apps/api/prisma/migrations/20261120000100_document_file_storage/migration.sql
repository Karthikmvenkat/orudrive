-- The application form now carries the paperwork itself, so the copy Master
-- Admin reviews is the one the partner submitted. Every column is nullable:
-- rows that only point at an outside URL keep working.
ALTER TABLE "vendor_documents"
  ADD COLUMN "contentBytes" BYTEA,
  ADD COLUMN "contentFileName" TEXT,
  ADD COLUMN "contentMediaType" TEXT,
  ADD COLUMN "contentSizeBytes" INTEGER;
