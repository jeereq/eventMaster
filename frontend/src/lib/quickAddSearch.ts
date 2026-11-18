/**
 * Recherche de la palette « Ajouter » de l’éditeur de salle (Ctrl+K) : insensible aux accents
 * et à la casse, chaque mot tapé doit se retrouver dans le libellé, le groupe ou les mots-clés.
 */

export type QuickAddEntry = {
  id: string;
  label: string;
  group: string;
  keywords?: string;
};

export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'`-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Entrées correspondant à la requête, les meilleures d’abord : libellé qui commence par la
 * requête, puis un mot du libellé qui commence par un mot tapé, puis le reste (ordre d’origine).
 */
export function filterQuickAdd<T extends QuickAddEntry>(entries: T[], query: string, limit = 60): T[] {
  const q = normalizeSearch(query);
  if (!q) return entries.slice(0, limit);
  const words = q.split(' ');
  const scored: Array<{ entry: T; score: number; index: number }> = [];
  entries.forEach((entry, index) => {
    const label = normalizeSearch(entry.label);
    const hay = `${label} ${normalizeSearch(entry.group)} ${normalizeSearch(entry.keywords ?? '')}`;
    if (!words.every((w) => hay.includes(w))) return;
    const labelWords = label.split(' ');
    let score = 0;
    if (label.startsWith(q)) score += 4;
    if (label.includes(q)) score += 2;
    score += words.filter((w) => labelWords.some((lw) => lw.startsWith(w))).length;
    scored.push({ entry, score, index });
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.slice(0, limit).map((s) => s.entry);
}
