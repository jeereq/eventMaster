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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Même wrapping que l’envoi réel (backend wrapBrandedWhatsApp). */
export function wrapBrandedWhatsApp(
  body: string,
  orgName: string,
  extras?: { guidelinesBlock?: string | null },
): string {
  const name = orgName.trim() || 'Organisation';
  let text = (body || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const guidelines = extras?.guidelinesBlock?.trim() || '';
  if (guidelines) {
    const alreadyPresent =
      text.includes(guidelines.slice(0, Math.min(28, guidelines.length))) ||
      /tenue\s*:/i.test(text);
    if (!alreadyPresent) {
      const signoff = `— ${name}`;
      if (text.endsWith(signoff)) {
        text = `${text.slice(0, -signoff.length).trim()}\n\n${guidelines}\n\n${signoff}`;
      } else {
        text = `${text}\n\n${guidelines}`;
      }
    }
  }

  const firstLine = text.split('\n')[0]?.trim() || '';
  const orgLine = new RegExp(`^\\*?${escapeRegExp(name)}\\*?$`, 'i');
  const alreadyHasHeader = orgLine.test(firstLine) || firstLine.startsWith(`✨ *${name}*`);
  if (!alreadyHasHeader) {
    text = `*${name}*\n━━━━━━━━━━\n\n${text}`;
  }

  return text.replace(/\n{3,}/g, '\n\n').trim();
}
