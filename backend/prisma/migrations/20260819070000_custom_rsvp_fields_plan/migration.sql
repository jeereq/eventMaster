-- Formulaire RSVP par événement + champ de forfait (tous les abonnements organisateurs).
ALTER TABLE "Event" ADD COLUMN "rsvpForm" JSONB;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "customRsvpFields" BOOLEAN NOT NULL DEFAULT true;
UPDATE "SubscriptionPlan" SET "customRsvpFields" = false WHERE "id" = 'SERVICE';
