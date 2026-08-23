-- Tarification globale ou par zones
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "ticketPricingMode" TEXT NOT NULL DEFAULT 'global';

ALTER TABLE "TicketOrder" ADD COLUMN IF NOT EXISTS "unitPriceFc" INTEGER;
ALTER TABLE "TicketOrder" ADD COLUMN IF NOT EXISTS "pricingZoneId" TEXT;
