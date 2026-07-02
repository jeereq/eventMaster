-- Referral & commercial tracking
ALTER TABLE "Tenant" ADD COLUMN "referredByCommercialId" TEXT;
ALTER TABLE "User" ADD COLUMN "referralCode" TEXT;
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_referredByCommercialId_fkey" FOREIGN KEY ("referredByCommercialId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Guest check-in / protocol
ALTER TABLE "Guest" ADD COLUMN "checkedInAt" TIMESTAMP(3);
ALTER TABLE "Guest" ADD COLUMN "checkedInByUserId" TEXT;
ALTER TABLE "Guest" ADD COLUMN "seatVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Guest" ADD COLUMN "seatVerifiedAt" TIMESTAMP(3);
ALTER TABLE "Guest" ADD COLUMN "seatVerifiedByUserId" TEXT;
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_checkedInByUserId_fkey" FOREIGN KEY ("checkedInByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_seatVerifiedByUserId_fkey" FOREIGN KEY ("seatVerifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "GuestProtocolNote" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GuestProtocolNote_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "GuestProtocolNote" ADD CONSTRAINT "GuestProtocolNote_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuestProtocolNote" ADD CONSTRAINT "GuestProtocolNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "GuestProtocolNote_guestId_idx" ON "GuestProtocolNote"("guestId");

CREATE TABLE "CommercialCommission" (
    "id" TEXT NOT NULL,
    "commercialId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plan" "PlanType" NOT NULL,
    "invoiceAmount" DOUBLE PRECISION NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "commissionAmount" DOUBLE PRECISION NOT NULL,
    "billingPeriod" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommercialCommission_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "CommercialCommission" ADD CONSTRAINT "CommercialCommission_commercialId_fkey" FOREIGN KEY ("commercialId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommercialCommission" ADD CONSTRAINT "CommercialCommission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "CommercialCommission_commercialId_tenantId_billingPeriod_key" ON "CommercialCommission"("commercialId", "tenantId", "billingPeriod");
CREATE INDEX "CommercialCommission_commercialId_idx" ON "CommercialCommission"("commercialId");
