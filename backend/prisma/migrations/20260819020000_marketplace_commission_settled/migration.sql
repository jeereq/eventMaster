-- Encaissement des commissions marketplace 8 % (hors plateforme).
ALTER TABLE "MarketplaceBooking" ADD COLUMN "commissionSettledAt" TIMESTAMP(3);
ALTER TABLE "MarketplaceBooking" ADD COLUMN "commissionSettledBy" TEXT;
