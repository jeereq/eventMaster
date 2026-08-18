-- Catalogue vendu à part : les forfaits B2B organisateur n’ouvrent plus de prestations marketplace.
UPDATE "SubscriptionPlan"
SET "maxServices" = 0
WHERE id IN (
  'STANDARD',
  'PREMIUM_1',
  'PREMIUM_2',
  'ENTERPRISE_1',
  'ENTERPRISE_2',
  'ENTERPRISE_3',
  'VENUE'
);

-- Forfait Salle : plus de presta « bonus ».
UPDATE "SubscriptionPlan"
SET
  "monthlyPriceFc" = 14900,
  "price" = '14.900 FC',
  "description" = 'Gestionnaire de salles : publiez jusqu’à 5 lieux, éditeur 2D complet (banquet, tente, custom) et protocole QR sur place — sans prestations marketplace.'
WHERE id = 'VENUE';

-- Tarifs type Netflix : entrée Prestataire, palier Salle, pack Salle & presta.
UPDATE "SubscriptionPlan"
SET
  "monthlyPriceFc" = 9900,
  "price" = '9.900 FC'
WHERE id = 'SERVICE';

UPDATE "SubscriptionPlan"
SET
  "monthlyPriceFc" = 19900,
  "price" = '19.900 FC',
  "description" = 'Les deux : 5 salles (éditeur complet) et 5 prestations, pour les lieux qui proposent aussi un service.'
WHERE id = 'CATALOG';
