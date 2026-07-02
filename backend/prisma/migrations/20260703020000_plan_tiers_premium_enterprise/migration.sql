-- Nouvelle grille tarifaire : Premium 1/2, Enterprise 1/2/3

CREATE TYPE "PlanType_new" AS ENUM (
  'FREE',
  'STANDARD',
  'PREMIUM_1',
  'PREMIUM_2',
  'ENTERPRISE_1',
  'ENTERPRISE_2',
  'ENTERPRISE_3'
);

ALTER TABLE "Tenant" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "Tenant" ALTER COLUMN "plan" TYPE "PlanType_new" USING (
  CASE "plan"::text
    WHEN 'PREMIUM' THEN 'PREMIUM_2'::"PlanType_new"
    WHEN 'ENTERPRISE' THEN 'ENTERPRISE_2'::"PlanType_new"
    ELSE "plan"::text::"PlanType_new"
  END
);
ALTER TABLE "Tenant" ALTER COLUMN "plan" SET DEFAULT 'FREE';

ALTER TABLE "CommercialCommission" ALTER COLUMN "plan" TYPE "PlanType_new" USING (
  CASE "plan"::text
    WHEN 'PREMIUM' THEN 'PREMIUM_2'::"PlanType_new"
    WHEN 'ENTERPRISE' THEN 'ENTERPRISE_2'::"PlanType_new"
    ELSE "plan"::text::"PlanType_new"
  END
);

ALTER TABLE "PlatformInvoice" ALTER COLUMN "plan" TYPE "PlanType_new" USING (
  CASE "plan"::text
    WHEN 'PREMIUM' THEN 'PREMIUM_2'::"PlanType_new"
    WHEN 'ENTERPRISE' THEN 'ENTERPRISE_2'::"PlanType_new"
    ELSE "plan"::text::"PlanType_new"
  END
);

ALTER TABLE "SubscriptionRequest" ALTER COLUMN "requestedPlan" TYPE "PlanType_new" USING (
  CASE "requestedPlan"::text
    WHEN 'PREMIUM' THEN 'PREMIUM_2'::"PlanType_new"
    WHEN 'ENTERPRISE' THEN 'ENTERPRISE_2'::"PlanType_new"
    ELSE "requestedPlan"::text::"PlanType_new"
  END
);

DROP TYPE "PlanType";
ALTER TYPE "PlanType_new" RENAME TO "PlanType";
