-- Réduction spéciale à l'approbation d'une demande d'abonnement
ALTER TABLE "SubscriptionRequest" ADD COLUMN IF NOT EXISTS "specialDiscountPercent" DOUBLE PRECISION;
ALTER TABLE "SubscriptionRequest" ADD COLUMN IF NOT EXISTS "baseAmount" DOUBLE PRECISION;
ALTER TABLE "SubscriptionRequest" ADD COLUMN IF NOT EXISTS "approvedAmount" DOUBLE PRECISION;
