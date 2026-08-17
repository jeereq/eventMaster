-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('CATERING', 'PHOTOGRAPHY', 'VIDEO', 'DJ', 'DECORATION', 'SECURITY', 'FLORIST', 'TRANSPORT', 'MC', 'OTHER');

-- AlterTable
ALTER TABLE "MarketplaceInquiry" ALTER COLUMN "listingId" DROP NOT NULL;
ALTER TABLE "MarketplaceInquiry" ADD COLUMN IF NOT EXISTS "offeringId" TEXT;
ALTER TABLE "MarketplaceInquiry" ADD COLUMN IF NOT EXISTS "eventId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ServiceOffering" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vendorProfileId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "city" TEXT,
    "coverageRadiusKm" INTEGER,
    "priceFromFc" INTEGER,
    "priceUnit" "VenuePriceUnit" NOT NULL DEFAULT 'EVENT',
    "photos" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOffering_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ServiceOffering_slug_key" ON "ServiceOffering"("slug");
CREATE INDEX IF NOT EXISTS "ServiceOffering_isPublic_category_idx" ON "ServiceOffering"("isPublic", "category");
CREATE INDEX IF NOT EXISTS "ServiceOffering_tenantId_idx" ON "ServiceOffering"("tenantId");
CREATE INDEX IF NOT EXISTS "MarketplaceInquiry_offeringId_createdAt_idx" ON "MarketplaceInquiry"("offeringId", "createdAt");

ALTER TABLE "ServiceOffering" ADD CONSTRAINT "ServiceOffering_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceOffering" ADD CONSTRAINT "ServiceOffering_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceInquiry" ADD CONSTRAINT "MarketplaceInquiry_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "ServiceOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceInquiry" ADD CONSTRAINT "MarketplaceInquiry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
