-- CreateEnum
CREATE TYPE "TenantAccountKind" AS ENUM ('ORGANIZER', 'VENDOR', 'BOTH');

-- CreateEnum
CREATE TYPE "VenuePriceUnit" AS ENUM ('EVENT', 'DAY', 'HOUR');

-- CreateEnum
CREATE TYPE "MarketplaceInquiryStatus" AS ENUM ('NEW', 'CONTACTED');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "accountKind" "TenantAccountKind" NOT NULL DEFAULT 'ORGANIZER';

-- CreateTable
CREATE TABLE IF NOT EXISTS "VendorProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "city" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "VenueListing" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "headline" TEXT,
    "city" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "priceFromFc" INTEGER,
    "priceUnit" "VenuePriceUnit" NOT NULL DEFAULT 'EVENT',
    "photos" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MarketplaceInquiry" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "fromPhone" TEXT,
    "eventDate" TIMESTAMP(3),
    "guestCount" INTEGER,
    "message" TEXT NOT NULL,
    "status" "MarketplaceInquiryStatus" NOT NULL DEFAULT 'NEW',
    "fromTenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceInquiry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VendorProfile_tenantId_key" ON "VendorProfile"("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "VendorProfile_slug_key" ON "VendorProfile"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "VenueListing_roomId_key" ON "VenueListing"("roomId");
CREATE UNIQUE INDEX IF NOT EXISTS "VenueListing_slug_key" ON "VenueListing"("slug");
CREATE INDEX IF NOT EXISTS "VenueListing_isPublic_city_idx" ON "VenueListing"("isPublic", "city");
CREATE INDEX IF NOT EXISTS "VenueListing_tenantId_idx" ON "VenueListing"("tenantId");
CREATE INDEX IF NOT EXISTS "MarketplaceInquiry_listingId_createdAt_idx" ON "MarketplaceInquiry"("listingId", "createdAt");
CREATE INDEX IF NOT EXISTS "MarketplaceInquiry_fromEmail_idx" ON "MarketplaceInquiry"("fromEmail");

ALTER TABLE "VendorProfile" ADD CONSTRAINT "VendorProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VenueListing" ADD CONSTRAINT "VenueListing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VenueListing" ADD CONSTRAINT "VenueListing_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "OrganizationRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceInquiry" ADD CONSTRAINT "MarketplaceInquiry_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "VenueListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceInquiry" ADD CONSTRAINT "MarketplaceInquiry_fromTenantId_fkey" FOREIGN KEY ("fromTenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
