-- Cycle de facturation mémorisé sur l’organisation (renouvellement auto).
CREATE TYPE "TenantBillingCycle" AS ENUM ('PERIOD', 'ANNUAL');

ALTER TABLE "Tenant" ADD COLUMN "billingCycle" "TenantBillingCycle" NOT NULL DEFAULT 'PERIOD';

UPDATE "Tenant" t
SET "billingCycle" = 'ANNUAL'
FROM (
  SELECT DISTINCT ON ("tenantId") "tenantId", "durationDays"
  FROM "PlatformInvoice"
  WHERE "durationDays" IS NOT NULL
  ORDER BY "tenantId", "createdAt" DESC
) last_inv
WHERE last_inv."tenantId" = t.id
  AND last_inv."durationDays" >= 365
  AND t."plan" <> 'FREE';
