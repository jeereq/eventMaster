-- Notifications par événement (organisateur) et abonnement des invités aux nouvelles d'un événement.
ALTER TABLE "Event" ADD COLUMN "notificationSettings" JSONB;
ALTER TABLE "Guest" ADD COLUMN "notificationPrefs" JSONB;
