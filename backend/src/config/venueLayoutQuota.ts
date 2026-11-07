/** Niveau de l'éditeur de salle, tel que défini dans les forfaits (`PlanDefinition.roomEditorLevel`). */
export type RoomEditorLevel = 'basic' | 'standard' | 'advanced' | 'complete';

/**
 * Nombre de dispositions nommées enregistrables par salle, en plus du plan principal.
 * Rattaché au niveau d'éditeur du forfait pour ne pas ajouter de colonne au catalogue des forfaits.
 */
export const MAX_SAVED_LAYOUTS_BY_EDITOR_LEVEL: Record<RoomEditorLevel, number> = {
  basic: 1,
  standard: 3,
  advanced: 6,
  complete: 20,
};

const FALLBACK_EDITOR_LEVEL: RoomEditorLevel = 'basic';

export function maxSavedLayoutsForLevel(level: string | null | undefined): number {
  if (level && level in MAX_SAVED_LAYOUTS_BY_EDITOR_LEVEL) {
    return MAX_SAVED_LAYOUTS_BY_EDITOR_LEVEL[level as RoomEditorLevel];
  }
  return MAX_SAVED_LAYOUTS_BY_EDITOR_LEVEL[FALLBACK_EDITOR_LEVEL];
}

export function isLayoutQuotaReached(level: string | null | undefined, savedCount: number): boolean {
  return savedCount >= maxSavedLayoutsForLevel(level);
}
