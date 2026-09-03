-- CreateTable
CREATE TABLE "MarketplacePost" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "venueListingId" TEXT,
    "vendorProfileId" TEXT,
    "content" TEXT,
    "mediaUrls" JSONB,
    "likes" JSONB,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplacePost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplacePost_venueListingId_createdAt_idx" ON "MarketplacePost"("venueListingId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplacePost_vendorProfileId_createdAt_idx" ON "MarketplacePost"("vendorProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplacePost_tenantId_createdAt_idx" ON "MarketplacePost"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceComment_postId_createdAt_idx" ON "MarketplaceComment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceComment_userId_idx" ON "MarketplaceComment"("userId");

-- AddForeignKey
ALTER TABLE "MarketplacePost" ADD CONSTRAINT "MarketplacePost_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplacePost" ADD CONSTRAINT "MarketplacePost_venueListingId_fkey" FOREIGN KEY ("venueListingId") REFERENCES "VenueListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplacePost" ADD CONSTRAINT "MarketplacePost_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceComment" ADD CONSTRAINT "MarketplaceComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "MarketplacePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceComment" ADD CONSTRAINT "MarketplaceComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
