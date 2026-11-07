-- CreateTable
CREATE TABLE "MarketplaceCommissionPayment" (
    "id" TEXT NOT NULL,
    "vendorTenantId" TEXT NOT NULL,
    "payerUserId" TEXT,
    "amountFc" INTEGER NOT NULL,
    "bookingIds" JSONB NOT NULL,
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

    CONSTRAINT "MarketplaceCommissionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceCommissionPayment_flexPayOrderNumber_key" ON "MarketplaceCommissionPayment"("flexPayOrderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceCommissionPayment_flexPayReference_key" ON "MarketplaceCommissionPayment"("flexPayReference");

-- CreateIndex
CREATE INDEX "MarketplaceCommissionPayment_vendorTenantId_status_idx" ON "MarketplaceCommissionPayment"("vendorTenantId", "status");

-- CreateIndex
CREATE INDEX "MarketplaceCommissionPayment_status_createdAt_idx" ON "MarketplaceCommissionPayment"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "MarketplaceCommissionPayment" ADD CONSTRAINT "MarketplaceCommissionPayment_vendorTenantId_fkey" FOREIGN KEY ("vendorTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

