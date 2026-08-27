-- Métadonnées callback / check FlexPay (API Paiement v1.5)
ALTER TABLE "TicketOrder" ADD COLUMN IF NOT EXISTS "flexPayChannel" TEXT;
ALTER TABLE "TicketOrder" ADD COLUMN IF NOT EXISTS "flexPayAmountCustomer" DOUBLE PRECISION;
ALTER TABLE "TicketOrder" ADD COLUMN IF NOT EXISTS "flexPayProviderReference" TEXT;

ALTER TABLE "SubscriptionRequest" ADD COLUMN IF NOT EXISTS "flexPayChannel" TEXT;
ALTER TABLE "SubscriptionRequest" ADD COLUMN IF NOT EXISTS "flexPayAmountCustomer" DOUBLE PRECISION;
ALTER TABLE "SubscriptionRequest" ADD COLUMN IF NOT EXISTS "flexPayProviderReference" TEXT;
