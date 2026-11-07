export const MAX_LAYOUT_NAME_LENGTH = 80;
export const MAX_THUMBNAIL_URL_LENGTH = 600;
/** Garde-fou sur la taille d'un plan enregistré (octets de JSON). */
export const MAX_LAYOUT_BLUEPRINT_BYTES = 8 * 1024 * 1024;
export const MAIN_LAYOUT_ID = 'main';
export const MAIN_LAYOUT_NAME = 'Disposition principale';

export function parseLayoutName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name || name.length > MAX_LAYOUT_NAME_LENGTH) return null;
  return name;
}

/** Vérifie qu'une valeur ressemble à un plan de salle de l'éditeur (forme minimale, pas de contenu). */
export function isBlueprintShape(raw: unknown): raw is Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const bp = raw as { canvas?: { widthM?: unknown; heightM?: unknown }; furniture?: unknown };
  const widthM = bp.canvas?.widthM;
  const heightM = bp.canvas?.heightM;
  if (typeof widthM !== 'number' || typeof heightM !== 'number') return false;
  if (!Number.isFinite(widthM) || !Number.isFinite(heightM) || widthM <= 0 || heightM <= 0) return false;
  return Array.isArray(bp.furniture);
}

export function isBlueprintTooLarge(blueprint: unknown): boolean {
  try {
    return Buffer.byteLength(JSON.stringify(blueprint), 'utf8') > MAX_LAYOUT_BLUEPRINT_BYTES;
  } catch {
    return true;
  }
}

/** Seules les URL https sont acceptées pour la vignette (affichée dans une balise image). */
export function parseThumbnailUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value || value.length > MAX_THUMBNAIL_URL_LENGTH) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Ordre demandé par le client : identifiants uniques, filtrés sur ceux qui existent déjà. */
export function normalizeLayoutOrder(requested: unknown, existingIds: string[]): string[] | null {
  if (!Array.isArray(requested)) return null;
  const known = new Set(existingIds);
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const id of requested) {
    if (typeof id !== 'string' || !known.has(id) || seen.has(id)) return null;
    seen.add(id);
    ordered.push(id);
  }
  if (ordered.length !== existingIds.length) return null;
  return ordered;
}
