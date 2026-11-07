/** Disposition d'une salle telle que renvoyée par la fiche publique (sans le plan). */
export interface VenueLayoutSummary {
  id: string;
  name: string;
  capacityMax: number | null;
  areaM2: number | null;
  thumbnailUrl: string | null;
}

/** Identifiant de la disposition principale (le plan historique de la salle). */
export const MAIN_LAYOUT_ID = 'main';

export interface VenueLayoutFacts {
  capacityLabel: string | null;
  areaLabel: string | null;
}

export function formatLayoutFacts(layout: Pick<VenueLayoutSummary, 'capacityMax' | 'areaM2'>): VenueLayoutFacts {
  const capacity = layout.capacityMax;
  const area = layout.areaM2;
  return {
    capacityLabel: capacity != null && capacity > 0 ? `Max. ${capacity.toLocaleString('fr-FR')}` : null,
    areaLabel: area != null && area > 0 ? `${Math.round(area).toLocaleString('fr-FR')} m²` : null,
  };
}

/** Disposition à afficher au départ : celle demandée si elle existe, sinon la principale. */
export function resolveInitialLayoutId(layouts: VenueLayoutSummary[], requestedId?: string | null): string {
  if (requestedId && layouts.some((layout) => layout.id === requestedId)) return requestedId;
  if (layouts.some((layout) => layout.id === MAIN_LAYOUT_ID)) return MAIN_LAYOUT_ID;
  return layouts[0]?.id ?? MAIN_LAYOUT_ID;
}

/** Le sélecteur n'a de sens que s'il y a un choix à faire. */
export function hasLayoutChoice(layouts: VenueLayoutSummary[] | undefined | null): boolean {
  return (layouts?.length ?? 0) > 1;
}

/** Garde uniquement les dispositions bien formées renvoyées par l'API. */
export function normalizeLayouts(raw: unknown): VenueLayoutSummary[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry): VenueLayoutSummary[] => {
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as Record<string, unknown>;
    if (typeof row.id !== 'string' || !row.id || typeof row.name !== 'string' || !row.name) return [];
    return [{
      id: row.id,
      name: row.name,
      capacityMax: typeof row.capacityMax === 'number' ? row.capacityMax : null,
      areaM2: typeof row.areaM2 === 'number' ? row.areaM2 : null,
      thumbnailUrl: typeof row.thumbnailUrl === 'string' && row.thumbnailUrl ? row.thumbnailUrl : null,
    }];
  });
}
