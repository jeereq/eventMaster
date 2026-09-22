CREATE TABLE "MarketplaceInquiryBeverageLine" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "beveragePriceId" TEXT,
    "brandName" TEXT NOT NULL,
    "unitLabel" TEXT NOT NULL,
    "packCount" INTEGER NOT NULL,
    "unitPriceFc" INTEGER NOT NULL,

    CONSTRAINT "MarketplaceInquiryBeverageLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketplaceBookingBeverageLine" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "beveragePriceId" TEXT,
    "brandName" TEXT NOT NULL,
    "unitLabel" TEXT NOT NULL,
    "packCount" INTEGER NOT NULL,
    "unitPriceFc" INTEGER NOT NULL,

    CONSTRAINT "MarketplaceBookingBeverageLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketplaceInquiryBeverageLine_inquiryId_idx" ON "MarketplaceInquiryBeverageLine"("inquiryId");
CREATE INDEX "MarketplaceInquiryBeverageLine_beveragePriceId_idx" ON "MarketplaceInquiryBeverageLine"("beveragePriceId");
CREATE INDEX "MarketplaceBookingBeverageLine_bookingId_idx" ON "MarketplaceBookingBeverageLine"("bookingId");
CREATE INDEX "MarketplaceBookingBeverageLine_beveragePriceId_idx" ON "MarketplaceBookingBeverageLine"("beveragePriceId");

ALTER TABLE "MarketplaceInquiryBeverageLine" ADD CONSTRAINT "MarketplaceInquiryBeverageLine_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "MarketplaceInquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceInquiryBeverageLine" ADD CONSTRAINT "MarketplaceInquiryBeverageLine_beveragePriceId_fkey" FOREIGN KEY ("beveragePriceId") REFERENCES "VendorBeveragePrice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceBookingBeverageLine" ADD CONSTRAINT "MarketplaceBookingBeverageLine_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "MarketplaceBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceBookingBeverageLine" ADD CONSTRAINT "MarketplaceBookingBeverageLine_beveragePriceId_fkey" FOREIGN KEY ("beveragePriceId") REFERENCES "VendorBeveragePrice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
