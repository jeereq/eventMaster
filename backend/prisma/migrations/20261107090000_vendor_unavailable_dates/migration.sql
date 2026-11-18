-- Jours d’indisponibilité du prestataire (toutes fiches confondues)
ALTER TABLE "Tenant" ADD COLUMN "marketplaceUnavailableDates" JSONB;
