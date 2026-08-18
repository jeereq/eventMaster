-- Taux de commission distincts : 1er paiement vs renouvellements.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "renewalCommissionRate" DOUBLE PRECISION;

ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "defaultOrgCommercialRenewalCommissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.20;
