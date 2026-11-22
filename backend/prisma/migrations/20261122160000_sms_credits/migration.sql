-- CreateTable
CREATE TABLE "SmsCreditOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "payerUserId" TEXT,
    "packId" TEXT NOT NULL,
    "smsCount" INTEGER NOT NULL,
    "amountFc" INTEGER NOT NULL,
    "unitCostUsd" DOUBLE PRECISION NOT NULL,
    "fxRateCdf" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT NOT NULL,
    "phone" TEXT,
    "flexPayOrderNumber" TEXT,
    "flexPayReference" TEXT,
    "flexPayChannel" TEXT,
    "flexPayAmountCustomer" DOUBLE PRECISION,
    "flexPayProviderReference" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsCreditOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsCreditLot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "initialCount" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsCreditLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsUsagePeriod" (
    "tenantId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "notifiedLow" BOOLEAN NOT NULL DEFAULT false,
    "notifiedEmpty" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsUsagePeriod_pkey" PRIMARY KEY ("tenantId","period")
);

-- CreateIndex
CREATE UNIQUE INDEX "SmsCreditOrder_flexPayOrderNumber_key" ON "SmsCreditOrder"("flexPayOrderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SmsCreditOrder_flexPayReference_key" ON "SmsCreditOrder"("flexPayReference");

-- CreateIndex
CREATE INDEX "SmsCreditOrder_tenantId_status_idx" ON "SmsCreditOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SmsCreditOrder_status_createdAt_idx" ON "SmsCreditOrder"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SmsCreditLot_orderId_key" ON "SmsCreditLot"("orderId");

-- CreateIndex
CREATE INDEX "SmsCreditLot_tenantId_expiresAt_idx" ON "SmsCreditLot"("tenantId", "expiresAt");

-- AddForeignKey
ALTER TABLE "SmsCreditOrder" ADD CONSTRAINT "SmsCreditOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsCreditLot" ADD CONSTRAINT "SmsCreditLot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsCreditLot" ADD CONSTRAINT "SmsCreditLot_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SmsCreditOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

