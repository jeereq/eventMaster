-- AlterEnum
ALTER TYPE "VenuePriceUnit" ADD VALUE IF NOT EXISTS 'MINUTE';
ALTER TYPE "VenuePriceUnit" ADD VALUE IF NOT EXISTS 'PERSON';
ALTER TYPE "VenuePriceUnit" ADD VALUE IF NOT EXISTS 'QUOTA';

-- AlterTable VenueListing
ALTER TABLE "VenueListing" ADD COLUMN IF NOT EXISTS "commune" TEXT;
ALTER TABLE "VenueListing" ADD COLUMN IF NOT EXISTS "neighborhood" TEXT;
ALTER TABLE "VenueListing" ADD COLUMN IF NOT EXISTS "quotaMin" INTEGER;
ALTER TABLE "VenueListing" ADD COLUMN IF NOT EXISTS "quotaMax" INTEGER;

-- AlterTable ServiceOffering
ALTER TABLE "ServiceOffering" ADD COLUMN IF NOT EXISTS "commune" TEXT;
ALTER TABLE "ServiceOffering" ADD COLUMN IF NOT EXISTS "neighborhood" TEXT;
ALTER TABLE "ServiceOffering" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "ServiceOffering" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "ServiceOffering" ADD COLUMN IF NOT EXISTS "quotaMin" INTEGER;
ALTER TABLE "ServiceOffering" ADD COLUMN IF NOT EXISTS "quotaMax" INTEGER;

CREATE INDEX IF NOT EXISTS "VenueListing_isPublic_commune_idx" ON "VenueListing"("isPublic", "commune");
