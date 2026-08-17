-- CreateEnum
CREATE TYPE "MarketplaceBookingStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- AlterTable
ALTER TABLE "VenueListing" ADD COLUMN IF NOT EXISTS "blockedDates" JSONB;
ALTER TABLE "ServiceOffering" ADD COLUMN IF NOT EXISTS "blockedDates" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "MarketplaceBooking" (
    "id" TEXT NOT NULL,
    "listingId" TEXT,
    "offeringId" TEXT,
    "inquiryId" TEXT,
    "vendorTenantId" TEXT NOT NULL,
    "organizerTenantId" TEXT,
    "organizerUserId" TEXT,
    "eventId" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "guestCount" INTEGER,
    "amountFc" INTEGER NOT NULL,
    "depositFc" INTEGER NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.08,
    "commissionFc" INTEGER NOT NULL,
    "status" "MarketplaceBookingStatus" NOT NULL DEFAULT 'REQUESTED',
    "depositMarkedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceBooking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceBooking_inquiryId_key" ON "MarketplaceBooking"("inquiryId");
CREATE INDEX IF NOT EXISTS "MarketplaceBooking_vendorTenantId_status_idx" ON "MarketplaceBooking"("vendorTenantId", "status");
CREATE INDEX IF NOT EXISTS "MarketplaceBooking_organizerTenantId_status_idx" ON "MarketplaceBooking"("organizerTenantId", "status");
CREATE INDEX IF NOT EXISTS "MarketplaceBooking_eventDate_idx" ON "MarketplaceBooking"("eventDate");

ALTER TABLE "MarketplaceBooking" ADD CONSTRAINT "MarketplaceBooking_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "VenueListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceBooking" ADD CONSTRAINT "MarketplaceBooking_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "ServiceOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceBooking" ADD CONSTRAINT "MarketplaceBooking_vendorTenantId_fkey" FOREIGN KEY ("vendorTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceBooking" ADD CONSTRAINT "MarketplaceBooking_organizerTenantId_fkey" FOREIGN KEY ("organizerTenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceBooking" ADD CONSTRAINT "MarketplaceBooking_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
