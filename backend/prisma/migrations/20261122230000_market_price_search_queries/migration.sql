-- AlterTable
ALTER TABLE "MarketPriceReference" ADD COLUMN "searchQueries" TEXT[] DEFAULT ARRAY[]::TEXT[];
