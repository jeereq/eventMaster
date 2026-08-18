-- Suivi des versements de commissions commerciales (hors plateforme).
ALTER TABLE "CommercialCommission" ADD COLUMN "paidAt" TIMESTAMP(3);
ALTER TABLE "CommercialCommission" ADD COLUMN "paidByUserId" TEXT;
