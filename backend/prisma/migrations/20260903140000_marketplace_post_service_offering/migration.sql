-- AlterTable
ALTER TABLE "MarketplacePost" ADD COLUMN "serviceOfferingId" TEXT;

-- CreateIndex
CREATE INDEX "MarketplacePost_serviceOfferingId_createdAt_idx" ON "MarketplacePost"("serviceOfferingId", "createdAt");

-- AddForeignKey
ALTER TABLE "MarketplacePost" ADD CONSTRAINT "MarketplacePost_serviceOfferingId_fkey" FOREIGN KEY ("serviceOfferingId") REFERENCES "ServiceOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
