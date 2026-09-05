-- CreateTable
CREATE TABLE "AiTokenLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "deviceId" TEXT,
    "action" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'unknown',
    "tokensDelta" INTEGER NOT NULL,
    "tokensFromFree" INTEGER NOT NULL DEFAULT 0,
    "tokensFromBonus" INTEGER NOT NULL DEFAULT 0,
    "pool" TEXT NOT NULL,
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiTokenLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiTokenLedger_createdAt_idx" ON "AiTokenLedger"("createdAt");

-- CreateIndex
CREATE INDEX "AiTokenLedger_action_createdAt_idx" ON "AiTokenLedger"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AiTokenLedger_userId_createdAt_idx" ON "AiTokenLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiTokenLedger_deviceId_createdAt_idx" ON "AiTokenLedger"("deviceId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiTokenLedger" ADD CONSTRAINT "AiTokenLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
