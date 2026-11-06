-- CreateTable
CREATE TABLE "MarketplaceReview" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "vendorTenantId" TEXT NOT NULL,
    "listingId" TEXT,
    "offeringId" TEXT,
    "authorUserId" TEXT,
    "authorName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "vendorReply" TEXT,
    "vendorRepliedAt" TIMESTAMP(3),
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingViewDay" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "listingId" TEXT,
    "offeringId" TEXT,
    "day" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ListingViewDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceReview_bookingId_key" ON "MarketplaceReview"("bookingId");

-- CreateIndex
CREATE INDEX "MarketplaceReview_vendorTenantId_createdAt_idx" ON "MarketplaceReview"("vendorTenantId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceReview_listingId_createdAt_idx" ON "MarketplaceReview"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceReview_offeringId_createdAt_idx" ON "MarketplaceReview"("offeringId", "createdAt");

-- CreateIndex
CREATE INDEX "ListingViewDay_tenantId_day_idx" ON "ListingViewDay"("tenantId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "ListingViewDay_listingId_day_key" ON "ListingViewDay"("listingId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "ListingViewDay_offeringId_day_key" ON "ListingViewDay"("offeringId", "day");

-- AddForeignKey
ALTER TABLE "MarketplaceReview" ADD CONSTRAINT "MarketplaceReview_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "MarketplaceBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceReview" ADD CONSTRAINT "MarketplaceReview_vendorTenantId_fkey" FOREIGN KEY ("vendorTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceReview" ADD CONSTRAINT "MarketplaceReview_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "VenueListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceReview" ADD CONSTRAINT "MarketplaceReview_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "ServiceOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceReview" ADD CONSTRAINT "MarketplaceReview_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingViewDay" ADD CONSTRAINT "ListingViewDay_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "VenueListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingViewDay" ADD CONSTRAINT "ListingViewDay_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "ServiceOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

