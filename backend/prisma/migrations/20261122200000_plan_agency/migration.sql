-- Nouveau forfait B2B « Agence » (220 000 FC / mois), entre Premium Plus et Enterprise.
-- La ligne SubscriptionPlan est créée au démarrage du serveur (seedDefaultSubscriptionPlans).
ALTER TYPE "PlanType" ADD VALUE IF NOT EXISTS 'AGENCY';

-- Décale l'ordre d'affichage des forfaits qui suivent Premium Plus pour y insérer Agence.
UPDATE "SubscriptionPlan" SET "sortOrder" = "sortOrder" + 1 WHERE "sortOrder" >= 8;
