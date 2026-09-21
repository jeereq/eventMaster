ALTER TYPE "ServiceCategory" ADD VALUE 'RENTAL_CHAIRS';

ALTER TABLE "BeverageBrand" ADD COLUMN "imageUrl" TEXT;

ALTER TABLE "ServiceOffering" ADD COLUMN "promoPriceFc" INTEGER;
ALTER TABLE "ServiceOffering" ADD COLUMN "promoLabel" TEXT;
ALTER TABLE "ServiceOffering" ADD COLUMN "promoEndsAt" TIMESTAMP(3);

ALTER TABLE "VendorBeveragePrice" ADD COLUMN "promoPriceFc" INTEGER;
ALTER TABLE "VendorBeveragePrice" ADD COLUMN "promoLabel" TEXT;
