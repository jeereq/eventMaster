-- Prestataires : travailler sur place uniquement, ou se déplacer.
ALTER TABLE "ServiceOffering" ADD COLUMN "travels" BOOLEAN NOT NULL DEFAULT true;

UPDATE "ServiceOffering"
SET "travels" = false
WHERE "coverageRadiusKm" IS NULL OR "coverageRadiusKm" <= 0;
