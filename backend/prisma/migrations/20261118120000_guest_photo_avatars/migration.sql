-- Invités simulés personnalisés (photo de la personne sur son avatar 3D) : nouvelle option de forfait.
ALTER TABLE "SubscriptionPlan" ADD COLUMN "guestPhotoAvatars" BOOLEAN NOT NULL DEFAULT false;

-- Incluse dans les forfaits Particulier, Premium, Enterprise, Salle et Salle & presta.
UPDATE "SubscriptionPlan"
SET "guestPhotoAvatars" = true
WHERE "id" IN (
  'PERSONAL', 'PERSONAL_50', 'PERSONAL_100', 'PERSONAL_200', 'PERSONAL_PLUS',
  'PREMIUM_1', 'PREMIUM_2', 'ENTERPRISE_1', 'ENTERPRISE_2', 'ENTERPRISE_3',
  'VENUE', 'CATALOG'
);
