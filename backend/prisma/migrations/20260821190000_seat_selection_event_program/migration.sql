-- AlterTable
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "seatSelectionEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "eventProgram" JSONB;

-- AlterTable
ALTER TABLE "TicketOrder" ADD COLUMN IF NOT EXISTS "tableId" TEXT;
ALTER TABLE "TicketOrder" ADD COLUMN IF NOT EXISTS "seatIndex" INTEGER;

-- CreateTable
CREATE TABLE IF NOT EXISTS "SeatHold" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "seatIndex" INTEGER NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeatHold_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SeatHold_orderId_key" ON "SeatHold"("orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "SeatHold_eventId_tableId_seatIndex_key" ON "SeatHold"("eventId", "tableId", "seatIndex");
CREATE INDEX IF NOT EXISTS "SeatHold_expiresAt_idx" ON "SeatHold"("expiresAt");
CREATE INDEX IF NOT EXISTS "SeatHold_eventId_idx" ON "SeatHold"("eventId");
CREATE INDEX IF NOT EXISTS "TicketOrder_eventId_tableId_seatIndex_idx" ON "TicketOrder"("eventId", "tableId", "seatIndex");

DO $$ BEGIN
  ALTER TABLE "SeatHold" ADD CONSTRAINT "SeatHold_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SeatHold" ADD CONSTRAINT "SeatHold_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "TicketOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
