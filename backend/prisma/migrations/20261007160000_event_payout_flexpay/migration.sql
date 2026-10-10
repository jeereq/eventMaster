-- CreateTable
CREATE TABLE "EventPayoutTransfer" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventTitle" TEXT NOT NULL,
    "amountFc" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "flexPayReference" TEXT NOT NULL,
    "flexPayOrderNumber" TEXT,
    "flexPayProviderReference" TEXT,
    "lastMessage" TEXT,
    "initiatedByUserId" TEXT NOT NULL,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventPayoutTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventPayoutTransfer_flexPayReference_key" ON "EventPayoutTransfer"("flexPayReference");

-- CreateIndex
CREATE UNIQUE INDEX "EventPayoutTransfer_flexPayOrderNumber_key" ON "EventPayoutTransfer"("flexPayOrderNumber");

-- CreateIndex
CREATE INDEX "EventPayoutTransfer_eventId_idx" ON "EventPayoutTransfer"("eventId");

-- CreateIndex
CREATE INDEX "EventPayoutTransfer_tenantId_idx" ON "EventPayoutTransfer"("tenantId");

-- CreateIndex
CREATE INDEX "EventPayoutTransfer_status_idx" ON "EventPayoutTransfer"("status");

-- Un seul versement en cours par événement (protège contre deux clics / deux onglets).
CREATE UNIQUE INDEX "EventPayoutTransfer_one_pending_per_event" ON "EventPayoutTransfer"("eventId") WHERE "status" = 'PENDING';

