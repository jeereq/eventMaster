-- AlterEnum
ALTER TYPE "PlanType" ADD VALUE 'VENUE';
ALTER TYPE "PlanType" ADD VALUE 'SERVICE';
ALTER TYPE "PlanType" ADD VALUE 'CATALOG';

-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN "maxServices" INTEGER NOT NULL DEFAULT 9999;

-- Quotas catalogue pour les forfaits organisateur existants (essai : 1 prestation)
UPDATE "SubscriptionPlan" SET "maxServices" = 1 WHERE id = 'FREE';
UPDATE "SubscriptionPlan" SET "maxServices" = 2 WHERE id = 'PERSONAL';
UPDATE "SubscriptionPlan" SET "maxServices" = 3 WHERE id = 'STANDARD';
UPDATE "SubscriptionPlan" SET "maxServices" = 5 WHERE id = 'PREMIUM_1';
UPDATE "SubscriptionPlan" SET "maxServices" = 8 WHERE id = 'PREMIUM_2';
UPDATE "SubscriptionPlan" SET "maxServices" = 15 WHERE id = 'ENTERPRISE_1';
UPDATE "SubscriptionPlan" SET "maxServices" = 30 WHERE id = 'ENTERPRISE_2';
UPDATE "SubscriptionPlan" SET "maxServices" = 9999 WHERE id = 'ENTERPRISE_3';
