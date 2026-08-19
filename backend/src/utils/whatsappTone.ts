/**
 * Ton WhatsApp à partir d’un texte e-mail : plus court, moins protocolaire.
 * Les variables {{…}} sont conservées.
 */
export function toWhatsAppTone(emailBody: string): string {
  let text = (emailBody || '').replace(/\r\n/g, '\n').trim();
  if (!text) return '';

  text = text
    .replace(/^Cher\(e\)\s+/im, 'Bonjour ')
    .replace(/^Chère\s+/im, 'Bonjour ')
    .replace(/^Cher\s+/im, 'Bonjour ')
    .replace(/^Madame,\s*Monsieur,?\s*/im, 'Bonjour,\n\n')
    .replace(/Nous avons l['’]immense joie de vous inviter/gi, 'On vous invite')
    .replace(/Nous avons l['’]honneur de vous (convier|inviter)/gi, 'On vous invite')
    .replace(/Nous vous prions de bien vouloir confirmer[^\n]*/gi, 'Confirmez ici :')
    .replace(/Veuillez confirmer votre (présence|venue|participation)[^\n]*/gi, 'Confirmez ici :')
    .replace(/En espérant vous compter parmi nos honorables invités\.?/gi, '')
    .replace(/Cordialement,?\s*\nL['’]équipe organisatrice\.?/gi, '')
    .replace(/Avec toute notre affection\.?/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

export function resolveWhatsAppInvitationBody(
  emailBody: string,
  whatsappBody?: string | null,
): string {
  const custom = whatsappBody?.trim();
  if (custom) return custom;
  return toWhatsAppTone(emailBody) || emailBody || '';
}
