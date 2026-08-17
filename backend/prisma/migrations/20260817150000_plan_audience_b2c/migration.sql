-- AlterEnum
ALTER TYPE "PlanType" ADD VALUE 'PERSONAL';

-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN "audience" TEXT NOT NULL DEFAULT 'B2B';
