-- Paliers Particulier + prestations illimitées pour le forfait Prestataire payé.

UPDATE "Tenant" SET "plan" = 'PERSONAL_200' WHERE "plan" = 'PERSONAL';
UPDATE "SubscriptionRequest" SET "requestedPlan" = 'PERSONAL_200' WHERE "requestedPlan" = 'PERSONAL';
UPDATE "PlatformInvoice" SET "plan" = 'PERSONAL_200' WHERE "plan" = 'PERSONAL';
UPDATE "CommercialCommission" SET "plan" = 'PERSONAL_200' WHERE "plan" = 'PERSONAL';

INSERT INTO "SubscriptionPlan" (
  "id", "name", "price", "monthlyPriceFc", "promoActive", "description", "audience",
  "maxEvents", "maxGuests", "maxTemplates", "maxRooms", "maxServices", "maxOrgManagers",
  "customTemplates", "mockupOcr", "protocolQr", "seatNotifications", "roomThemesFixtures",
  "adminReports", "roomEditorLevel", "commercialNetwork", "supportLevel", "sortOrder", "isActive",
  "createdAt", "updatedAt"
)
VALUES
  ('PERSONAL_50', 'Particulier 50', '10.000 FC', 10000, false,
   'Fête privée jusqu’à 50 invités : organisation complète (QR, modèles, éditeur 2D), 3 événements, 2 salles de plan de table — sans catalogue.',
   'B2C', 3, 50, 9999, 2, 0, 1, true, true, true, true, true, true, 'complete', false, 'email', 1, true, NOW(), NOW()),
  ('PERSONAL_100', 'Particulier 100', '15.000 FC', 15000, false,
   'Fête privée jusqu’à 100 invités : organisation complète (QR, modèles, éditeur 2D), 3 événements, 2 salles de plan de table — sans catalogue.',
   'B2C', 3, 100, 9999, 2, 0, 1, true, true, true, true, true, true, 'complete', false, 'email', 2, true, NOW(), NOW()),
  ('PERSONAL_200', 'Particulier 200', '20.000 FC', 20000, false,
   'Fête privée jusqu’à 200 invités : organisation complète (QR, modèles, éditeur 2D), 3 événements, 2 salles de plan de table — sans catalogue.',
   'B2C', 3, 200, 9999, 2, 0, 1, true, true, true, true, true, true, 'complete', false, 'email', 3, true, NOW(), NOW()),
  ('PERSONAL_PLUS', 'Particulier +200', '30.000 FC', 30000, false,
   'Grande fête privée (plus de 200 invités) : organisation complète, invités illimités, 3 événements, 2 salles de plan de table — sans catalogue.',
   'B2C', 3, 99999, 9999, 2, 0, 1, true, true, true, true, true, true, 'complete', false, 'email', 4, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "price" = EXCLUDED."price",
  "monthlyPriceFc" = EXCLUDED."monthlyPriceFc",
  "description" = EXCLUDED."description",
  "audience" = EXCLUDED."audience",
  "maxEvents" = EXCLUDED."maxEvents",
  "maxGuests" = EXCLUDED."maxGuests",
  "maxTemplates" = EXCLUDED."maxTemplates",
  "maxRooms" = EXCLUDED."maxRooms",
  "maxServices" = EXCLUDED."maxServices",
  "maxOrgManagers" = EXCLUDED."maxOrgManagers",
  "customTemplates" = EXCLUDED."customTemplates",
  "mockupOcr" = EXCLUDED."mockupOcr",
  "protocolQr" = EXCLUDED."protocolQr",
  "seatNotifications" = EXCLUDED."seatNotifications",
  "roomThemesFixtures" = EXCLUDED."roomThemesFixtures",
  "adminReports" = EXCLUDED."adminReports",
  "roomEditorLevel" = EXCLUDED."roomEditorLevel",
  "commercialNetwork" = EXCLUDED."commercialNetwork",
  "supportLevel" = EXCLUDED."supportLevel",
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = true,
  "updatedAt" = NOW();

UPDATE "SubscriptionPlan"
SET
  "maxServices" = 9999,
  "description" = 'Prestataire : fiches illimitées (traiteur, photo, DJ…) avec photos, vidéos, rayon d’intervention et calendrier, dès l’abonnement payé.',
  "updatedAt" = NOW()
WHERE id = 'SERVICE';

UPDATE "SubscriptionPlan" SET "sortOrder" = 5 WHERE id = 'STANDARD';
UPDATE "SubscriptionPlan" SET "sortOrder" = 6 WHERE id = 'PREMIUM_1';
UPDATE "SubscriptionPlan" SET "sortOrder" = 7 WHERE id = 'PREMIUM_2';
UPDATE "SubscriptionPlan" SET "sortOrder" = 8 WHERE id = 'ENTERPRISE_1';
UPDATE "SubscriptionPlan" SET "sortOrder" = 9 WHERE id = 'ENTERPRISE_2';
UPDATE "SubscriptionPlan" SET "sortOrder" = 10 WHERE id = 'ENTERPRISE_3';
UPDATE "SubscriptionPlan" SET "sortOrder" = 11 WHERE id = 'VENUE';
UPDATE "SubscriptionPlan" SET "sortOrder" = 12 WHERE id = 'SERVICE';
UPDATE "SubscriptionPlan" SET "sortOrder" = 13 WHERE id = 'CATALOG';

DELETE FROM "SubscriptionPlan" WHERE id = 'PERSONAL';
