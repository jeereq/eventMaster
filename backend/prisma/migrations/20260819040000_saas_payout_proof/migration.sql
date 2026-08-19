-- Preuve et motif de versement hors plateforme (commissions SaaS commerciaux).
ALTER TABLE "CommercialCommission" ADD COLUMN "payoutProofUrl" TEXT;
ALTER TABLE "CommercialCommission" ADD COLUMN "payoutNote" TEXT;
