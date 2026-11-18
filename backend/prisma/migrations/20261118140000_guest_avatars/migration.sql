-- Invités simulés (avatars dans la salle) : option de forfait réglable dans l'admin.
ALTER TABLE "SubscriptionPlan" ADD COLUMN "guestAvatars" BOOLEAN NOT NULL DEFAULT true;

-- Non incluse dans l'offre découverte ni dans le forfait Prestataire (sans salle).
UPDATE "SubscriptionPlan"
SET "guestAvatars" = false
WHERE "id" IN ('FREE', 'SERVICE');
