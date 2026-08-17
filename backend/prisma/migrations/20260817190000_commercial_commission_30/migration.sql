-- Taux commercial par défaut : 30 % (nouveaux enregistrements + taux encore à 20 %).
ALTER TABLE "Tenant" ALTER COLUMN "defaultOrgCommercialCommissionRate" SET DEFAULT 0.30;
ALTER TABLE "CommercialCommission" ALTER COLUMN "commissionRate" SET DEFAULT 0.30;

UPDATE "Tenant"
SET "defaultOrgCommercialCommissionRate" = 0.30
WHERE "defaultOrgCommercialCommissionRate" = 0.20;

UPDATE "User"
SET "commissionRate" = 0.30
WHERE "commissionRate" = 0.20;

UPDATE "SubscriptionPlan"
SET "description" = 'B2B — agences événementielles avec réseau commercial et commissions 30 %.'
WHERE id = 'ENTERPRISE_2' AND "description" LIKE '%20 %';
