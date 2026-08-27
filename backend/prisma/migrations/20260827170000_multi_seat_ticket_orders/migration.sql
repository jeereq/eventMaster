-- AlterTable TicketOrder
ALTER TABLE "TicketOrder" ADD COLUMN IF NOT EXISTS "selectedSeats" JSONB;

-- DropIndex if exists
DROP INDEX IF EXISTS "SeatHold_orderId_key";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SeatHold_orderId_idx" ON "SeatHold"("orderId");
