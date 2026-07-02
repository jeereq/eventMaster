-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('SUBSCRIPTION_APPROVAL', 'RENEWAL', 'PAYMENT');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('SENT', 'PAID', 'PENDING');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "licenseExpiryWarningFor" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CommercialCommission" ADD COLUMN "platformInvoiceId" TEXT;

-- CreateTable
CREATE TABLE "PlatformInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plan" "PlanType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'FC',
    "type" "InvoiceType" NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'SENT',
    "durationDays" INTEGER,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "billingPeriod" TEXT NOT NULL,
    "subscriptionRequestId" TEXT,
    "recipientEmails" JSONB NOT NULL,
    "details" JSONB,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformInvoice_invoiceNumber_key" ON "PlatformInvoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformInvoice_subscriptionRequestId_key" ON "PlatformInvoice"("subscriptionRequestId");

-- CreateIndex
CREATE INDEX "PlatformInvoice_tenantId_idx" ON "PlatformInvoice"("tenantId");

-- CreateIndex
CREATE INDEX "PlatformInvoice_billingPeriod_idx" ON "PlatformInvoice"("billingPeriod");

-- CreateIndex
CREATE INDEX "PlatformInvoice_type_idx" ON "PlatformInvoice"("type");

-- CreateIndex
CREATE INDEX "PlatformInvoice_createdAt_idx" ON "PlatformInvoice"("createdAt");

-- CreateIndex
CREATE INDEX "CommercialCommission_platformInvoiceId_idx" ON "CommercialCommission"("platformInvoiceId");

-- AddForeignKey
ALTER TABLE "CommercialCommission" ADD CONSTRAINT "CommercialCommission_platformInvoiceId_fkey" FOREIGN KEY ("platformInvoiceId") REFERENCES "PlatformInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformInvoice" ADD CONSTRAINT "PlatformInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformInvoice" ADD CONSTRAINT "PlatformInvoice_subscriptionRequestId_fkey" FOREIGN KEY ("subscriptionRequestId") REFERENCES "SubscriptionRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
