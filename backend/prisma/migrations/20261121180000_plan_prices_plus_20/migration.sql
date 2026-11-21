-- Hausse de 20 % de tous les forfaits payants, appliquée aux prix en base (qui font foi),
-- y compris ceux modifiés depuis l'admin. Arrondi au millier de FC ;
-- les forfaits marketplace gardent leur terminaison en « 900 » (ex. 14 900 → 17 900).
-- Les prix promotionnels ne sont pas modifiés.

UPDATE "SubscriptionPlan"
SET "monthlyPriceFc" = CASE
      WHEN "id" IN ('VENUE', 'SERVICE', 'CATALOG')
        THEN (ROUND("monthlyPriceFc" * 1.2 / 1000.0) * 1000 - 100)::INTEGER
      ELSE (ROUND("monthlyPriceFc" * 1.2 / 1000.0) * 1000)::INTEGER
    END,
    "updatedAt" = NOW()
WHERE "id" <> 'FREE' AND "monthlyPriceFc" > 0;

UPDATE "SubscriptionPlan"
SET "price" = REPLACE(TO_CHAR("monthlyPriceFc", 'FM999,999,999'), ',', '.') || ' FC'
WHERE "id" <> 'FREE' AND "monthlyPriceFc" > 0;

UPDATE "SubscriptionPlan"
SET "description" = REPLACE("description", 'à partir de 1 000 000 FC', 'à partir de 1 200 000 FC')
WHERE "id" = 'CUSTOM';
