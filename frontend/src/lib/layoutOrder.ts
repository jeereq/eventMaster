/** Déplace l'élément `id` d'un cran (`-1` vers le haut, `+1` vers le bas) ; renvoie `null` si impossible. */
export function moveId(ids: string[], id: string, delta: -1 | 1): string[] | null {
  const from = ids.indexOf(id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= ids.length) return null;
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
