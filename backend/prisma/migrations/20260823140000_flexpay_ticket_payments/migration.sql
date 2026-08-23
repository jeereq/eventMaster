-- FlexPay card provider fields on ticket orders
ALTER TABLE "TicketOrder" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT;
ALTER TABLE "TicketOrder" ADD COLUMN IF NOT EXISTS "flexPayOrderNumber" TEXT;
ALTER TABLE "TicketOrder" ADD COLUMN IF NOT EXISTS "flexPayReference" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "TicketOrder_flexPayOrderNumber_key" ON "TicketOrder"("flexPayOrderNumber");
CREATE INDEX IF NOT EXISTS "TicketOrder_flexPayReference_idx" ON "TicketOrder"("flexPayReference");
