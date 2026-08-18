-- Forfaits Particulier (B2C) : palier d’entrée à 60.000 FC / trimestre.
-- Échelle conservée (×6) : 50 → 60k, 100 → 90k, 200 → 120k, +200 → 180k.

UPDATE "SubscriptionPlan"
SET
  "monthlyPriceFc" = 60000,
  "price" = '60.000 FC'
WHERE id = 'PERSONAL_50';

UPDATE "SubscriptionPlan"
SET
  "monthlyPriceFc" = 90000,
  "price" = '90.000 FC'
WHERE id = 'PERSONAL_100';

UPDATE "SubscriptionPlan"
SET
  "monthlyPriceFc" = 120000,
  "price" = '120.000 FC'
WHERE id = 'PERSONAL_200';

UPDATE "SubscriptionPlan"
SET
  "monthlyPriceFc" = 180000,
  "price" = '180.000 FC'
WHERE id = 'PERSONAL_PLUS';
