-- Agence passe à 300 000 FC / mois avec plus de volume. Ne modifie la ligne que si elle porte encore
-- le prix initial (220 000 FC) : un prix déjà changé depuis l'administration est conservé.
UPDATE "SubscriptionPlan"
SET "price" = '300.000 FC',
    "monthlyPriceFc" = 300000,
    "description" = 'B2B — agences : 800 invités par mois, 14 événements, 20 salles publiables, 400 SMS inclus, prestations marketplace illimitées, rapports et support prioritaire.',
    "maxEvents" = 14,
    "maxGuests" = 800,
    "maxTemplates" = 16,
    "maxRooms" = 20,
    "maxOrgManagers" = 15
WHERE "id" = 'AGENCY' AND "monthlyPriceFc" = 220000;
