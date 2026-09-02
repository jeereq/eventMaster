-- CreateTable
CREATE TABLE "PaymentTrace" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "amountFc" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CDF',
    "payerUserId" TEXT,
    "payerEmail" TEXT,
    "payerPhone" TEXT,
    "deviceId" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTrace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSimulationRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "deviceId" TEXT,
    "source" TEXT NOT NULL,
    "prompt" TEXT,
    "eventType" TEXT,
    "city" TEXT,
    "commune" TEXT,
    "guestCount" INTEGER,
    "budgetMaxFc" INTEGER,
    "eventDate" TEXT,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiSimulationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTrace_reference_key" ON "PaymentTrace"("reference");

-- CreateIndex
CREATE INDEX "PaymentTrace_kind_createdAt_idx" ON "PaymentTrace"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentTrace_payerUserId_idx" ON "PaymentTrace"("payerUserId");

-- CreateIndex
CREATE INDEX "AiSimulationRun_userId_createdAt_idx" ON "AiSimulationRun"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiSimulationRun_deviceId_createdAt_idx" ON "AiSimulationRun"("deviceId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiSimulationRun" ADD CONSTRAINT "AiSimulationRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
