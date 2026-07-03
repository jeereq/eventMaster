-- OrgRole COMMERCIAL + commissions modifiables par organisation
ALTER TYPE "OrgRole" ADD VALUE IF NOT EXISTS 'COMMERCIAL';

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "commissionRate" DOUBLE PRECISION;

ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "referredByOrgUserId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "defaultOrgCommercialCommissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.20;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Tenant_referredByOrgUserId_fkey'
  ) THEN
    ALTER TABLE "Tenant"
      ADD CONSTRAINT "Tenant_referredByOrgUserId_fkey"
      FOREIGN KEY ("referredByOrgUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
