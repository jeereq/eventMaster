-- Recaler le forfait Particulier : salles de plan de table, pas un catalogue.
UPDATE "SubscriptionPlan"
SET
  "maxRooms" = 2,
  "maxServices" = 0,
  "commercialNetwork" = false,
  "description" = 'Abonnement B2C : mariage, anniversaire ou fête privée. Organisation complète (QR, modèles, éditeur 2D), 3 événements, 200 invités, 2 salles de plan de table — sans publication catalogue.'
WHERE id = 'PERSONAL';
