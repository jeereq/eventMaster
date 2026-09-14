-- CreateTable
CREATE TABLE "MarketplaceInquiryMessage" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL,
    "authorUserId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceInquiryMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceInquiryMessage_inquiryId_createdAt_idx" ON "MarketplaceInquiryMessage"("inquiryId", "createdAt");

-- AddForeignKey
ALTER TABLE "MarketplaceInquiryMessage" ADD CONSTRAINT "MarketplaceInquiryMessage_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "MarketplaceInquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
