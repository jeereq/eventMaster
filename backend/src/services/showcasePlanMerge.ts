/**
 * Plans vitrine intégrés ajoutés après coup : une plateforme dont la vitrine a
 * déjà été personnalisée (liste enregistrée) ne les recevrait jamais, puisque
 * les plans par défaut ne servent que lorsque la liste est vide. On les ajoute
 * donc à la fin, sauf si un administrateur les a explicitement retirés.
 *
 * Module pur, sans dépendance, testé avec `node --test`.
 */

/** Plans intégrés publiés après la première version de la vitrine. */
export const SHOWCASE_PLANS_ADDED_LATER: readonly string[] = ['appartement-temoin-maquette'];

export function mergeLaterBuiltinShowcasePlans<T extends { id: string; order: number }>(
  plans: readonly T[],
  defaults: readonly T[],
  dismissedIds: readonly string[] = [],
  addedLaterIds: readonly string[] = SHOWCASE_PLANS_ADDED_LATER,
): T[] {
  const present = new Set(plans.map((p) => p.id));
  const dismissed = new Set(dismissedIds);
  const merged = [...plans];
  let nextOrder = plans.reduce((max, p) => Math.max(max, Number(p.order) || 0), 0);
  for (const id of addedLaterIds) {
    if (present.has(id) || dismissed.has(id)) continue;
    const builtin = defaults.find((p) => p.id === id);
    if (!builtin) continue;
    nextOrder += 1;
    merged.push({ ...builtin, order: nextOrder });
  }
  return merged;
}

export function sanitizeShowcaseDismissedIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((v): v is string => typeof v === 'string' && v.trim() !== '').map((v) => v.trim()))];
}
