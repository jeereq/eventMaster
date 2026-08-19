-- Texte WhatsApp distinct de l’e-mail (optionnel : fallback = ton WhatsApp du body).
ALTER TABLE "Invitation" ADD COLUMN "whatsappBody" TEXT;
