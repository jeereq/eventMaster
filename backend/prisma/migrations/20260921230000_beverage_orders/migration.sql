ALTER TABLE "MarketplaceInquiry" ADD COLUMN "beveragePriceId" TEXT;
ALTER TABLE "MarketplaceInquiry" ADD COLUMN "beveragePackCount" INTEGER;
ALTER TABLE "MarketplaceBooking" ADD COLUMN "beveragePriceId" TEXT;
ALTER TABLE "MarketplaceBooking" ADD COLUMN "beveragePackCount" INTEGER;

CREATE INDEX "MarketplaceInquiry_beveragePriceId_idx" ON "MarketplaceInquiry"("beveragePriceId");
CREATE INDEX "MarketplaceBooking_beveragePriceId_idx" ON "MarketplaceBooking"("beveragePriceId");

ALTER TABLE "MarketplaceInquiry" ADD CONSTRAINT "MarketplaceInquiry_beveragePriceId_fkey" FOREIGN KEY ("beveragePriceId") REFERENCES "VendorBeveragePrice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceBooking" ADD CONSTRAINT "MarketplaceBooking_beveragePriceId_fkey" FOREIGN KEY ("beveragePriceId") REFERENCES "VendorBeveragePrice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
