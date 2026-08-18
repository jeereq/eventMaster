-- Galerie d’événement, rattachement des billets au compte, posts publiés sur la fiche publique.

ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "photos" JSONB;

ALTER TABLE "TicketOrder" ADD COLUMN IF NOT EXISTS "userId" TEXT;
CREATE INDEX IF NOT EXISTS "TicketOrder_userId_idx" ON "TicketOrder"("userId");
ALTER TABLE "TicketOrder" DROP CONSTRAINT IF EXISTS "TicketOrder_userId_fkey";
ALTER TABLE "TicketOrder"
  ADD CONSTRAINT "TicketOrder_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventPost" ADD COLUMN IF NOT EXISTS "publishedOnListing" BOOLEAN NOT NULL DEFAULT false;
