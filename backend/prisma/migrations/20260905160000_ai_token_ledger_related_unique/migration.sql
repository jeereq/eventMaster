-- Idempotence des recharges (et d’une conso liée à une run) : un seul journal par (action, relatedId).
-- PostgreSQL autorise plusieurs NULL, donc les consos sans relatedId restent possibles.
CREATE UNIQUE INDEX "AiTokenLedger_action_relatedId_key" ON "AiTokenLedger"("action", "relatedId");
