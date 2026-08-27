-- FlexPay Pay Out sessions for commercial commission payouts
CREATE TABLE IF NOT EXISTS "CommercialPayoutTransfer" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "commercialId" TEXT NOT NULL,
    "tenantId" TEXT,
    "billingPeriod" TEXT NOT NULL,
    "amountFc" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "flexPayOrderNumber" TEXT,
    "flexPayReference" TEXT NOT NULL,
    "flexPayChannel" TEXT,
    "flexPayProviderReference" TEXT,
    "initiatedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialPayoutTransfer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommercialPayoutTransfer_flexPayOrderNumber_key" ON "CommercialPayoutTransfer"("flexPayOrderNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "CommercialPayoutTransfer_flexPayReference_key" ON "CommercialPayoutTransfer"("flexPayReference");
CREATE INDEX IF NOT EXISTS "CommercialPayoutTransfer_commercialId_billingPeriod_kind_idx" ON "CommercialPayoutTransfer"("commercialId", "billingPeriod", "kind");
CREATE INDEX IF NOT EXISTS "CommercialPayoutTransfer_status_idx" ON "CommercialPayoutTransfer"("status");

DO $$ BEGIN
  ALTER TABLE "CommercialPayoutTransfer"
    ADD CONSTRAINT "CommercialPayoutTransfer_commercialId_fkey"
    FOREIGN KEY ("commercialId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
