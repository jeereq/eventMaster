/**
 * Utilitaires texte pour factures (e-mail HTML, PDF, texte brut).
 * - HTML : échappement des entités + UTF-8
 * - PDF Helvetica (WinAnsi) : espaces et symboles Unicode normalisés
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Espaces et symboles incompatibles PDF / texte ASCII. */
export function normalizeInvoiceText(value: string): string {
  return value
    .replace(/\u202f/g, ' ') // espace fine insécable (toLocaleString fr-FR)
    .replace(/\u00a0/g, ' ') // espace insécable
    .replace(/\u2212/g, '-') // signe moins Unicode
    .replace(/\u2013/g, '-') // tiret demi-cadratin
    .replace(/\u2014/g, '-') // tiret cadratin
    .replace(/\u2192/g, '->') // flèche
    .replace(/\u00ab/g, '"') // guillemet français ouvrant
    .replace(/\u00bb/g, '"'); // guillemet français fermant
}

export function formatAmountFc(amount: number): string {
  const formatted = amount
    .toLocaleString('fr-FR')
    .replace(/\u202f/g, ' ')
    .replace(/\u00a0/g, ' ');
  return `${formatted} FC`;
}

export function formatFrenchDate(date: Date): string {
  return normalizeInvoiceText(
    date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
  );
}

export function formatFrenchDateShort(date: Date): string {
  return normalizeInvoiceText(date.toLocaleDateString('fr-FR'));
}

export function formatFrenchDateRange(start: Date, end: Date): string {
  return `${formatFrenchDateShort(start)} -> ${formatFrenchDateShort(end)}`;
}
