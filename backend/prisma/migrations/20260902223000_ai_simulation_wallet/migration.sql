-- CreateTable
CREATE TABLE "AiSimulationWallet" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "userId" TEXT,
    "freeTrialsUsed" INTEGER NOT NULL DEFAULT 0,
    "bonusTokens" INTEGER NOT NULL DEFAULT 0,
    "creditedOrderIds" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSimulationWallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiSimulationWallet_deviceId_key" ON "AiSimulationWallet"("deviceId");

-- CreateIndex
CREATE INDEX "AiSimulationWallet_userId_idx" ON "AiSimulationWallet"("userId");

-- AddForeignKey
ALTER TABLE "AiSimulationWallet" ADD CONSTRAINT "AiSimulationWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
