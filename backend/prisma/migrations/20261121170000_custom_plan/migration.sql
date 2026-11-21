-- Forfait Custom (sur mesure, à partir de 1 000 000 FC / mois).
-- La ligne SubscriptionPlan est créée au démarrage depuis plansConfig (seedDefaultSubscriptionPlans).
ALTER TYPE "PlanType" ADD VALUE 'CUSTOM';
