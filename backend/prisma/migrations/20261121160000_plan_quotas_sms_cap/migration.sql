-- Rentabilité des forfaits : moins d'événements et quotas d'invités calibrés pour
-- garder ~30 % de marge même si chaque invité reçoit 3 SMS (0,03 $ / SMS).

-- Plafond de 3 SMS par invité (invitation, relances, placement confondus).
ALTER TABLE "Guest" ADD COLUMN "smsSentCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "SubscriptionPlan" SET "maxEvents" = 2, "updatedAt" = NOW()
WHERE "id" IN ('PERSONAL_50', 'PERSONAL_100', 'PERSONAL_200');

UPDATE "SubscriptionPlan" SET "maxEvents" = 2, "maxGuests" = 450, "updatedAt" = NOW() WHERE "id" = 'PERSONAL_PLUS';
UPDATE "SubscriptionPlan" SET "maxEvents" = 4, "maxGuests" = 70, "updatedAt" = NOW() WHERE "id" = 'STANDARD';
UPDATE "SubscriptionPlan" SET "maxEvents" = 6, "maxGuests" = 140, "updatedAt" = NOW() WHERE "id" = 'PREMIUM_1';
UPDATE "SubscriptionPlan" SET "maxEvents" = 8, "maxGuests" = 220, "updatedAt" = NOW() WHERE "id" = 'PREMIUM_2';
UPDATE "SubscriptionPlan" SET "maxEvents" = 15, "maxGuests" = 950, "updatedAt" = NOW() WHERE "id" = 'ENTERPRISE_1';
UPDATE "SubscriptionPlan" SET "maxEvents" = 25, "maxGuests" = 1400, "updatedAt" = NOW() WHERE "id" = 'ENTERPRISE_2';
UPDATE "SubscriptionPlan" SET "maxEvents" = 40, "maxGuests" = 1900, "name" = 'Enterprise Max', "updatedAt" = NOW()
WHERE "id" = 'ENTERPRISE_3';

-- Descriptions : nombre d'événements et quotas mis à jour.
UPDATE "SubscriptionPlan" SET "description" = REPLACE("description", '3 événements', '2 événements')
WHERE "id" IN ('PERSONAL_50', 'PERSONAL_100', 'PERSONAL_200', 'PERSONAL_PLUS');
UPDATE "SubscriptionPlan" SET "description" = REPLACE("description", 'invités illimités', 'jusqu’à 450 invités par trimestre')
WHERE "id" = 'PERSONAL_PLUS';
UPDATE "SubscriptionPlan"
SET "description" = 'B2B — 40 événements et 1 900 invités par mois, salles publiables et prestations marketplace illimitées, multi-agences, SLA 24/7 et onboarding dédié.'
WHERE "id" = 'ENTERPRISE_3';
