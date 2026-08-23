-- FlexPay fields on subscription requests (SaaS checkout)
ALTER TABLE "SubscriptionRequest" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT;
ALTER TABLE "SubscriptionRequest" ADD COLUMN IF NOT EXISTS "flexPayOrderNumber" TEXT;
ALTER TABLE "SubscriptionRequest" ADD COLUMN IF NOT EXISTS "flexPayReference" TEXT;
ALTER TABLE "SubscriptionRequest" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionRequest_flexPayOrderNumber_key" ON "SubscriptionRequest"("flexPayOrderNumber");
CREATE INDEX IF NOT EXISTS "SubscriptionRequest_flexPayReference_idx" ON "SubscriptionRequest"("flexPayReference");
