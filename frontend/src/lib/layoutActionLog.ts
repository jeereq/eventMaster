export const LAYOUT_ACTION_KINDS = [
  'add',
  'edit',
  'delete',
  'move',
  'template',
  'settings',
  'info',
] as const;

export type LayoutActionKind = (typeof LAYOUT_ACTION_KINDS)[number];

export const LAYOUT_ACTION_SOURCES = [
  'manual',
  'drag_drop',
  'ai_studio',
  'template',
  'ambience',
  'wall_editor',
  'story',
  'bulk_align',
  'shortcut',
  'clearance',
  'system',
] as const;

export type LayoutActionSource = (typeof LAYOUT_ACTION_SOURCES)[number];

export const LAYOUT_ACTION_CATEGORIES = [
  'furniture',
  'fixture',
  'wall',
  'story',
  'ambience',
  'canvas',
  'all',
] as const;

export type LayoutActionCategory = (typeof LAYOUT_ACTION_CATEGORIES)[number];

/**
 * Contexte d'action détaillé pour l'historique et la traçabilité des modifications de salle.
 */
export interface RoomActionContext {
  /** Source ou méthode par laquelle l'action a été effectuée */
  source?: LayoutActionSource;
  /** Catégorie de composant concernée */
  category?: LayoutActionCategory;
  /** Nom ou libellé de l'élément cible (ex: "Table 4", "Scène Principale", "Banquette 1") */
  targetLabel?: string;
  /** Identifiant technique de l'élément cible */
  targetId?: string;
  /** Nombre d'éléments affectés (ex: 8 chaises, 4 tables) */
  itemCount?: number;
  /** Étage actif lors de la modification */
  storyId?: string;
  /** Libellé lisible de l'étage (ex: "RDC", "Mezzanine", "Étage 1") */
  storyLabel?: string;
  /** Variation du nombre de places assises (ex: +8 ou -4) */
  seatsDelta?: number;
  /** Total de places assises après l'action */
  totalSeats?: number;
  /** Nom ou identifiant de l'auteur de l'action */
  authorName?: string;
  /** Rôle de l'auteur (ex: "ADMIN", "ORGANIZER", "SUPER_ADMIN") */
  authorRole?: string;
}

export const LAYOUT_ACTION_SOURCE_LABELS: Record<LayoutActionSource, string> = {
  manual: 'Manuel',
  drag_drop: 'Glisser-déposer',
  ai_studio: 'Studio IA',
  template: 'Modèle',
  ambience: 'Ambiance & Thème',
  wall_editor: 'Murs & Accès',
  story: 'Étages',
  bulk_align: 'Alignement groupé',
  shortcut: 'Raccourci clavier',
  clearance: 'Dégagements réels',
  system: 'Système',
};

export const LAYOUT_ACTION_CATEGORY_LABELS: Record<LayoutActionCategory, string> = {
  furniture: 'Mobilier & Sièges',
  fixture: 'Décors & Installations',
  wall: 'Murs & Portes',
  story: 'Structure & Étages',
  ambience: 'Éclairage & Sols',
  canvas: 'Dimensions salle',
  all: 'Plan complet',
};

export const LAYOUT_ACTION_LOG_MAX = 50;

export interface LayoutActionEntry {
  id: string;
  at: string;
  message: string;
  kind: LayoutActionKind;
  context?: RoomActionContext;
}

const KIND_SET = new Set<string>(LAYOUT_ACTION_KINDS);
const SOURCE_SET = new Set<string>(LAYOUT_ACTION_SOURCES);
const CATEGORY_SET = new Set<string>(LAYOUT_ACTION_CATEGORIES);

export function sanitizeActionContext(val: unknown): RoomActionContext | undefined {
  if (!val || typeof val !== 'object') return undefined;
  const raw = val as Record<string, unknown>;
  const ctx: RoomActionContext = {};

  if (typeof raw.source === 'string' && SOURCE_SET.has(raw.source)) {
    ctx.source = raw.source as LayoutActionSource;
  }
  if (typeof raw.category === 'string' && CATEGORY_SET.has(raw.category)) {
    ctx.category = raw.category as LayoutActionCategory;
  }
  if (typeof raw.targetLabel === 'string' && raw.targetLabel.trim()) {
    ctx.targetLabel = raw.targetLabel.trim().slice(0, 80);
  }
  if (typeof raw.targetId === 'string' && raw.targetId.trim()) {
    ctx.targetId = raw.targetId.trim().slice(0, 60);
  }
  if (typeof raw.itemCount === 'number' && Number.isFinite(raw.itemCount)) {
    ctx.itemCount = raw.itemCount;
  }
  if (typeof raw.storyId === 'string') {
    ctx.storyId = raw.storyId;
  }
  if (typeof raw.storyLabel === 'string' && raw.storyLabel.trim()) {
    ctx.storyLabel = raw.storyLabel.trim().slice(0, 50);
  }
  if (typeof raw.seatsDelta === 'number' && Number.isFinite(raw.seatsDelta)) {
    ctx.seatsDelta = raw.seatsDelta;
  }
  if (typeof raw.totalSeats === 'number' && Number.isFinite(raw.totalSeats)) {
    ctx.totalSeats = raw.totalSeats;
  }
  if (typeof raw.authorName === 'string' && raw.authorName.trim()) {
    ctx.authorName = raw.authorName.trim().slice(0, 60);
  }
  if (typeof raw.authorRole === 'string' && raw.authorRole.trim()) {
    ctx.authorRole = raw.authorRole.trim().slice(0, 30);
  }

  return Object.keys(ctx).length > 0 ? ctx : undefined;
}

export function sanitizeLayoutActions(value: unknown, max = LAYOUT_ACTION_LOG_MAX): LayoutActionEntry[] {
  if (!Array.isArray(value)) return [];
  const next: LayoutActionEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Partial<LayoutActionEntry>;
    if (typeof row.id !== 'string' || typeof row.at !== 'string' || typeof row.message !== 'string') continue;
    if (!KIND_SET.has(row.kind || '')) continue;
    next.push({
      id: row.id,
      at: row.at,
      message: row.message,
      kind: row.kind as LayoutActionKind,
      context: sanitizeActionContext(row.context),
    });
    if (next.length >= max) break;
  }
  return next;
}

export function createLayoutAction(
  message: string,
  kind: LayoutActionEntry['kind'] = 'info',
  context?: RoomActionContext,
): LayoutActionEntry {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    message,
    kind,
    context: sanitizeActionContext(context),
  };
}

export function prependLayoutAction(
  log: LayoutActionEntry[],
  message: string,
  kind: LayoutActionEntry['kind'] = 'info',
  max = LAYOUT_ACTION_LOG_MAX,
  context?: RoomActionContext,
): LayoutActionEntry[] {
  return [createLayoutAction(message, kind, context), ...log].slice(0, max);
}
