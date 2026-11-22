-- Acompte marketplace personnalisable par prestataire (null = taux par défaut de la plateforme).
ALTER TABLE "Tenant" ADD COLUMN "marketplaceDepositRate" DOUBLE PRECISION;
