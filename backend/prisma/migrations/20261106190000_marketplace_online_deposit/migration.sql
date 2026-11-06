-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "marketplaceOnlineDeposit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketplacePayoutHolder" TEXT,
ADD COLUMN     "marketplacePayoutPhone" TEXT;

-- CreateTable
CREATE TABLE "MarketplaceDepositPayment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "vendorTenantId" TEXT NOT NULL,
    "payerUserId" TEXT,
    "amountFc" INTEGER NOT NULL,
    "commissionFc" INTEGER NOT NULL DEFAULT 0,
    "payoutAmountFc" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'CDF',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT NOT NULL,
    "phone" TEXT,
    "flexPayOrderNumber" TEXT,
    "flexPayReference" TEXT,
    "flexPayChannel" TEXT,
    "flexPayAmountCustomer" DOUBLE PRECISION,
    "flexPayProviderReference" TEXT,
    "paidAt" TIMESTAMP(3),
    "payoutStatus" TEXT NOT NULL DEFAULT 'NONE',
    "payoutPhone" TEXT,
    "payoutReference" TEXT,
    "payoutOrderNumber" TEXT,
    "payoutProviderReference" TEXT,
    "payoutMessage" TEXT,
    "payoutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceDepositPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceDepositPayment_flexPayOrderNumber_key" ON "MarketplaceDepositPayment"("flexPayOrderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceDepositPayment_flexPayReference_key" ON "MarketplaceDepositPayment"("flexPayReference");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceDepositPayment_payoutReference_key" ON "MarketplaceDepositPayment"("payoutReference");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceDepositPayment_payoutOrderNumber_key" ON "MarketplaceDepositPayment"("payoutOrderNumber");

-- CreateIndex
CREATE INDEX "MarketplaceDepositPayment_bookingId_createdAt_idx" ON "MarketplaceDepositPayment"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceDepositPayment_vendorTenantId_status_idx" ON "MarketplaceDepositPayment"("vendorTenantId", "status");

-- CreateIndex
CREATE INDEX "MarketplaceDepositPayment_status_payoutStatus_idx" ON "MarketplaceDepositPayment"("status", "payoutStatus");

-- AddForeignKey
ALTER TABLE "MarketplaceDepositPayment" ADD CONSTRAINT "MarketplaceDepositPayment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "MarketplaceBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceDepositPayment" ADD CONSTRAINT "MarketplaceDepositPayment_vendorTenantId_fkey" FOREIGN KEY ("vendorTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

