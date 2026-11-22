/**
 * Règles de la suppression groupée côté Super Admin (sans accès base, testable seule).
 *
 * Une requête porte sur un seul type de donnée et au plus `ADMIN_BULK_DELETE_MAX` éléments,
 * pour qu'une erreur de sélection ne vide pas la plateforme d'un clic.
 */

export const ADMIN_BULK_DELETE_TYPES = ['tenant', 'user', 'template', 'event', 'guest'] as const;
export type AdminBulkDeleteType = (typeof ADMIN_BULK_DELETE_TYPES)[number];

export const ADMIN_BULK_DELETE_MAX = 100;

export type BulkDeleteRequest =
  | { ok: true; type: AdminBulkDeleteType; ids: string[] }
  | { ok: false; error: string };

export function isAdminBulkDeleteType(value: unknown): value is AdminBulkDeleteType {
  return typeof value === 'string' && (ADMIN_BULK_DELETE_TYPES as readonly string[]).includes(value);
}

/** Valide le corps `{ type, ids }` : type connu, identifiants non vides, dédoublonnés, plafonnés. */
export function parseBulkDeleteRequest(body: unknown): BulkDeleteRequest {
  const raw = (body && typeof body === 'object' ? body : {}) as { type?: unknown; ids?: unknown };
  if (!isAdminBulkDeleteType(raw.type)) {
    return { ok: false, error: 'Type de donnée à supprimer inconnu.' };
  }
  if (!Array.isArray(raw.ids)) {
    return { ok: false, error: 'Liste des éléments à supprimer manquante.' };
  }
  const ids = [
    ...new Set(
      raw.ids
        .filter((id): id is string => typeof id === 'string')
        .map((id) => id.trim())
        .filter((id) => id.length > 0 && id.length <= 128),
    ),
  ];
  if (ids.length === 0) {
    return { ok: false, error: 'Sélectionnez au moins un élément à supprimer.' };
  }
  if (ids.length > ADMIN_BULK_DELETE_MAX) {
    return {
      ok: false,
      error: `Vous pouvez supprimer au plus ${ADMIN_BULK_DELETE_MAX} éléments à la fois.`,
    };
  }
  return { ok: true, type: raw.type, ids };
}

/**
 * Éléments qu'un admin ne peut pas supprimer lui-même : son propre compte et sa propre
 * organisation (il perdrait sa session au milieu de l'opération).
 */
export function protectedReason(
  type: AdminBulkDeleteType,
  id: string,
  actor: { id: string; tenantId?: string | null },
): string | null {
  if (type === 'user' && id === actor.id) return 'Vous ne pouvez pas supprimer votre propre compte.';
  if (type === 'tenant' && actor.tenantId && id === actor.tenantId) {
    return 'Vous ne pouvez pas supprimer votre propre organisation.';
  }
  return null;
}

/** Message lisible quand la base refuse une suppression (données encore liées). */
export function deleteFailureMessage(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  if (code === 'P2025') return 'Élément introuvable (déjà supprimé ?).';
  if (code === 'P2003' || code === 'P2014') {
    return 'Des données liées empêchent la suppression.';
  }
  return 'Suppression impossible.';
}
