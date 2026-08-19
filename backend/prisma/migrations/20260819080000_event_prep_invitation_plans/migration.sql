-- Préparation optionnelle (salle marketplace + prestataires) + flux invitations dès Essentials / Business.
ALTER TABLE "Event" ADD COLUMN "eventPrep" JSONB;

UPDATE "SubscriptionPlan"
SET
  "protocolQr" = true,
  "seatNotifications" = true,
  "description" = 'Découverte : tester EventMaster — flux invitations complet (RSVP, plan de table, QR, PDF/GPS) ou 1 salle / 1 prestation.'
WHERE "id" = 'FREE';

UPDATE "SubscriptionPlan"
SET
  "seatNotifications" = true,
  "description" = 'B2B — plusieurs réceptions par an : invitations, protocole QR, PDF/GPS dès RSVP.'
WHERE "id" = 'STANDARD';
