/**
 * Affichage des forfaits à partir du catalogue en base (`GET /public/plans`).
 * Les textes marketing restent dans landingPricing.ts ; tout ce qui est prix, quota ou option
 * activée vient de la base dès qu'elle a répondu. Module pur, sans alias, pour être testable.
 */

export type DbPlanCatalogEntry = {
  name?: string;
  price?: string;
  monthlyPriceFc?: number;
  description?: string;
  audience?: string;
  maxEvents?: number;
  maxGuests?: number;
  maxTemplates?: number;
  maxRooms?: number;
  maxServices?: number;
  maxOrgManagers?: number;
  customTemplates?: boolean;
  customRsvpFields?: boolean;
  mockupOcr?: boolean;
  protocolQr?: boolean;
  seatNotifications?: boolean;
  adminReports?: boolean;
  roomThemesFixtures?: boolean;
  roomEditorLevel?: string;
  supportLevel?: string;
  promoActive?: boolean;
  promoPrice?: string;
  promoMonthlyPriceFc?: number;
  promoLabel?: string;
};

export type ComparisonValue = string | boolean;

const UNLIMITED_THRESHOLD = 9999;

function isB2cId(planId: string): boolean {
  return planId.startsWith('PERSONAL');
}

/** « Illimité » au-delà de 9999, « — » à zéro, sinon nombre formaté. */
export function formatQuota(value: number | undefined | null): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return '—';
  if (value >= UNLIMITED_THRESHOLD) return 'Illimité';
  return value.toLocaleString('fr-FR').replace(/ | /g, ' ');
}

export function guestQuotaLabel(planId: string, maxGuests: number | undefined | null): string {
  const base = formatQuota(maxGuests);
  if (base === '—' || base === 'Illimité') return base;
  if (planId === 'FREE') return `${base} (total essai)`;
  return `${base} / ${isB2cId(planId) ? 'trim.' : 'mois'}`;
}

export const EDITOR_LEVEL_LABELS: Record<string, string> = {
  basic: 'Basique',
  standard: 'Standard',
  advanced: 'Avancé',
  complete: 'Complet',
};

export const SUPPORT_LEVEL_LABELS: Record<string, string> = {
  community: 'Communauté',
  email: 'E-mail',
  priority: 'Prioritaire',
  dedicated: 'Dédié',
  sla247: 'SLA 24/7',
};

/** Ligne du comparatif → valeur issue de la base, ou null si la ligne reste éditoriale. */
const COMPARISON_RESOLVERS: Record<
  string,
  (planId: string, db: DbPlanCatalogEntry, fallback: ComparisonValue) => ComparisonValue | null
> = {
  'Événements actifs': (_id, db) => (db.maxEvents == null ? null : formatQuota(db.maxEvents)),
  'Invités inclus par période payée (quota org.)': (id, db) =>
    db.maxGuests == null ? null : guestQuotaLabel(id, db.maxGuests),
  "Modèles d'invitation": (_id, db) => (db.maxTemplates == null ? null : formatQuota(db.maxTemplates)),
  'Salles organisation': (_id, db) => (db.maxRooms == null ? null : formatQuota(db.maxRooms)),
  'Prestations marketplace': (_id, db) => (db.maxServices == null ? null : formatQuota(db.maxServices)),
  'Managers organisation': (_id, db) => (db.maxOrgManagers == null ? null : formatQuota(db.maxOrgManagers)),
  'Modèles personnalisés': (_id, db) => db.customTemplates ?? null,
  'OCR texte sur maquette': (_id, db) => db.mockupOcr ?? null,
  'Scan QR caméra (confirmation de présence)': (_id, db) => db.protocolQr ?? null,
  'Notification placement invité (WA / e-mail)': (_id, db) => db.seatNotifications ?? null,
  'Champs de réponse à l’invitation personnalisables (genre, allergies, boissons, menu)': (_id, db) =>
    db.customRsvpFields ?? null,
  'Export revenus & commissions (admin)': (_id, db) => db.adminReports ?? null,
  'Thèmes d’ambiance & éclairage (12 presets)': (_id, db) => db.roomThemesFixtures ?? null,
  'Éditeur de salle 2D / 3D': (_id, db) => {
    if (db.maxRooms != null && db.maxRooms <= 0) return '—';
    return db.roomEditorLevel ? EDITOR_LEVEL_LABELS[db.roomEditorLevel] ?? null : null;
  },
  'Support & SLA': (_id, db) => (db.supportLevel ? SUPPORT_LEVEL_LABELS[db.supportLevel] ?? null : null),
};

export function comparisonValueFromDb(
  label: string,
  planId: string,
  fallback: ComparisonValue,
  db?: DbPlanCatalogEntry | null,
): ComparisonValue {
  if (!db) return fallback;
  const resolver = COMPARISON_RESOLVERS[label];
  if (!resolver) return fallback;
  const value = resolver(planId, db, fallback);
  return value == null ? fallback : value;
}

/**
 * Puces de la carte : la première (événements · invités) et le nombre de salles viennent
 * de la base ; le reste est éditorial.
 */
export function highlightsFromDb(
  planId: string,
  highlights: string[],
  db?: { maxEvents?: unknown; maxGuests?: unknown; maxRooms?: unknown } | null,
): string[] {
  const maxEvents = typeof db?.maxEvents === 'number' ? db.maxEvents : undefined;
  const maxGuests = typeof db?.maxGuests === 'number' ? db.maxGuests : undefined;
  const maxRooms = typeof db?.maxRooms === 'number' ? db.maxRooms : undefined;
  if (!db) return highlights;
  return highlights.map((line, index) => {
    if (index === 0 && /événements/i.test(line) && maxEvents != null && maxGuests != null) {
      const events = formatQuota(maxEvents);
      const eventsPart = events === 'Illimité' ? 'Événements illimités' : `${events} événements`;
      const guests = formatQuota(maxGuests);
      let guestsPart: string;
      if (guests === 'Illimité') guestsPart = 'invités illimités';
      else if (guests === '—') guestsPart = 'sans invités';
      else if (planId === 'FREE') guestsPart = `${guests} invités (essai)`;
      else guestsPart = `${guests} invités / ${isB2cId(planId) ? 'trim.' : 'mois'}`;
      return `${eventsPart} · ${guestsPart}`;
    }
    if (maxRooms != null && /^\d+ salles?\b/.test(line)) {
      const rooms = formatQuota(maxRooms);
      if (rooms === 'Illimité') return line.replace(/^\d+ salles?/, 'Salles illimitées');
      if (rooms === '—') return line;
      return line.replace(/^\d+ salles?/, `${rooms} salle${maxRooms > 1 ? 's' : ''}`);
    }
    return line;
  });
}

/** Niveau d'éditeur affiché en badge, d'après la base. */
export function editorBadgeFromDb(db?: DbPlanCatalogEntry | null): 'editorComplete' | 'editorAdvanced' | 'editorStandard' | null {
  switch (db?.roomEditorLevel) {
    case 'complete':
      return 'editorComplete';
    case 'advanced':
      return 'editorAdvanced';
    case 'standard':
      return 'editorStandard';
    default:
      return null;
  }
}

/** Nom commercial du forfait : celui de la base, sinon le libellé de secours fourni. */
export function planDisplayName(
  planId: string | null | undefined,
  db?: { name?: string } | null,
  fallback?: string,
): string {
  const name = db?.name?.replace(/^Plan /, '').trim();
  if (name) return name;
  return fallback || planId || '';
}

/** Badge « N invités » d'une carte, d'après le quota en base. */
export function guestsBadgeFromDb(
  planId: string,
  db?: { maxGuests?: unknown } | null,
): string | null {
  const maxGuests = typeof db?.maxGuests === 'number' ? db.maxGuests : undefined;
  if (maxGuests == null) return null;
  const guests = formatQuota(maxGuests);
  if (guests === '—') return null;
  if (guests === 'Illimité') return 'Invités illimités';
  return `${guests} invités${isB2cId(planId) ? ' / trim.' : planId === 'FREE' ? '' : ' / mois'}`;
}

export function editorLevelLabel(level?: string | null): string | null {
  return level ? EDITOR_LEVEL_LABELS[level] ?? null : null;
}

export function supportLevelLabel(level?: string | null): string | null {
  return level ? SUPPORT_LEVEL_LABELS[level] ?? null : null;
}
