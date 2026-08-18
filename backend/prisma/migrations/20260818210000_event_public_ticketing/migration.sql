-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN     "slug" TEXT;
ALTER TABLE "Event" ADD COLUMN     "publishedAt" TIMESTAMP(3);
ALTER TABLE "Event" ADD COLUMN     "ticketingEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN     "ticketPriceFc" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Event" ADD COLUMN     "ticketsTotal" INTEGER;
ALTER TABLE "Event" ADD COLUMN     "ticketsSold" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");
CREATE INDEX "Event_isPublic_date_idx" ON "Event"("isPublic", "date");

-- CreateTable
CREATE TABLE "TicketOrder" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "buyerPhone" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "amountFc" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketOrder_stripeCheckoutSessionId_key" ON "TicketOrder"("stripeCheckoutSessionId");
CREATE INDEX "TicketOrder_eventId_status_idx" ON "TicketOrder"("eventId", "status");
CREATE INDEX "TicketOrder_buyerEmail_idx" ON "TicketOrder"("buyerEmail");

-- AddForeignKey
ALTER TABLE "TicketOrder" ADD CONSTRAINT "TicketOrder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Guest" ADD COLUMN "ticketOrderId" TEXT;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_ticketOrderId_fkey" FOREIGN KEY ("ticketOrderId") REFERENCES "TicketOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
