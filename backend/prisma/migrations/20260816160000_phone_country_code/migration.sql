-- Indicatif pays dédié (saisi séparément du numéro national)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneCountryCode" TEXT;
ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "phoneCountryCode" TEXT;
