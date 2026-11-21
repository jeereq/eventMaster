-- Quotas d'invités +20 % (les Particulier 50 / 100 / 200 gardent le nombre de leur nom).
-- Marge pire cas (3 SMS par invité, prix +20 %) maintenue à ~30 % ou plus.
UPDATE "SubscriptionPlan" SET "maxGuests" = 540,  "updatedAt" = NOW() WHERE "id" = 'PERSONAL_PLUS';
UPDATE "SubscriptionPlan" SET "maxGuests" = 84,   "updatedAt" = NOW() WHERE "id" = 'STANDARD';
UPDATE "SubscriptionPlan" SET "maxGuests" = 168,  "updatedAt" = NOW() WHERE "id" = 'PREMIUM_1';
UPDATE "SubscriptionPlan" SET "maxGuests" = 264,  "updatedAt" = NOW() WHERE "id" = 'PREMIUM_2';
UPDATE "SubscriptionPlan" SET "maxGuests" = 1140, "updatedAt" = NOW() WHERE "id" = 'ENTERPRISE_1';
UPDATE "SubscriptionPlan" SET "maxGuests" = 1680, "updatedAt" = NOW() WHERE "id" = 'ENTERPRISE_2';
UPDATE "SubscriptionPlan" SET "maxGuests" = 2280, "updatedAt" = NOW() WHERE "id" = 'ENTERPRISE_3';
UPDATE "SubscriptionPlan" SET "maxGuests" = 3240, "updatedAt" = NOW() WHERE "id" = 'CUSTOM';

UPDATE "SubscriptionPlan" SET "description" = REPLACE("description", 'jusqu’à 450 invités', 'jusqu’à 540 invités') WHERE "id" = 'PERSONAL_PLUS';
UPDATE "SubscriptionPlan" SET "description" = REPLACE("description", '1 900 invités', '2 280 invités') WHERE "id" = 'ENTERPRISE_3';
UPDATE "SubscriptionPlan" SET "description" = REPLACE("description", '2 700 invités', '3 240 invités') WHERE "id" = 'CUSTOM';
