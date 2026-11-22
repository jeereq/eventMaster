-- CreateTable
CREATE TABLE "MarketPriceReference" (
    "id" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT '',
    "unit" TEXT NOT NULL DEFAULT 'EVENT',
    "lowFc" INTEGER NOT NULL,
    "typicalFc" INTEGER NOT NULL,
    "highFc" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "source" TEXT NOT NULL DEFAULT 'ai_web',
    "sources" JSONB,
    "rationale" TEXT,
    "model" TEXT,
    "proposedById" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketPriceReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketPriceReference_status_slot_city_idx" ON "MarketPriceReference"("status", "slot", "city");
