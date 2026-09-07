-- AlterEnum
ALTER TYPE "SubscriptionRequestStatus" ADD VALUE 'QUOTED';

-- AlterTable
ALTER TABLE "SubscriptionRequest" ADD COLUMN IF NOT EXISTS "requestKind" TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE "SubscriptionRequest" ADD COLUMN IF NOT EXISTS "discountRequestNote" TEXT;
ALTER TABLE "SubscriptionRequest" ADD COLUMN IF NOT EXISTS "requestedDiscountPercent" DOUBLE PRECISION;
ALTER TABLE "SubscriptionRequest" ADD COLUMN IF NOT EXISTS "requestedAmount" DOUBLE PRECISION;
ALTER TABLE "SubscriptionRequest" ADD COLUMN IF NOT EXISTS "quoteExpiresAt" TIMESTAMP(3);
ALTER TABLE "SubscriptionRequest" ADD COLUMN IF NOT EXISTS "quoteReviewedAt" TIMESTAMP(3);
ALTER TABLE "SubscriptionRequest" ADD COLUMN IF NOT EXISTS "quoteReviewedById" TEXT;
