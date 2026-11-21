-- Plafond de 3 SMS compté par numéro et par événement (et non plus par fiche invité),
-- pour qu'une suppression / recréation d'invité ne remette pas le compteur à zéro.
CREATE TABLE "GuestSmsUsage" (
    "eventId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GuestSmsUsage_pkey" PRIMARY KEY ("eventId", "phone")
);

ALTER TABLE "GuestSmsUsage" ADD CONSTRAINT "GuestSmsUsage_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Guest" DROP COLUMN "smsSentCount";

-- Essai gratuit : 1 événement (moins que les forfaits payants) et pas de SMS.
UPDATE "SubscriptionPlan" SET "maxEvents" = 1, "updatedAt" = NOW() WHERE "id" = 'FREE';
