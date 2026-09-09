export type DonationAccessMode = 'all' | 'restricted';

export interface DonationsAccess {
  /** Fonctionnalité globale activée ou désactivée sur la plateforme. */
  enabled: boolean;
  /** 'all' = ouvert à tout le monde sans restrictions · 'restricted' = réservé aux organisations autorisées. */
  mode: DonationAccessMode;
  /** Liste des identifiants d'organisations (tenants) autorisées lorsque mode = 'restricted'. */
  tenantIds: string[];
  /** Montant minimum d'un don libre en Francs Congolais (FC). */
  minAmountFc: number;
  /** Montants suggérés rapides par défaut (FC). */
  defaultSuggestedAmountsFc: number[];
}

export const DEFAULT_DONATIONS_ACCESS: DonationsAccess = {
  enabled: true,
  mode: 'all',
  tenantIds: [],
  minAmountFc: 1000,
  defaultSuggestedAmountsFc: [2500, 5000, 10000, 25000, 50000, 100000],
};

export function sanitizeDonationsAccess(raw: unknown): DonationsAccess {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const enabled = src.enabled !== false;
  const mode: DonationAccessMode = src.mode === 'restricted' ? 'restricted' : 'all';

  const tenantIds = Array.isArray(src.tenantIds)
    ? [
        ...new Set(
          src.tenantIds
            .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
            .map((id) => id.trim()),
        ),
      ]
    : [];

  const rawMin = Number(src.minAmountFc);
  const minAmountFc = Number.isFinite(rawMin) && rawMin >= 100 ? Math.round(rawMin) : DEFAULT_DONATIONS_ACCESS.minAmountFc;

  const rawSuggested = Array.isArray(src.defaultSuggestedAmountsFc) ? src.defaultSuggestedAmountsFc : [];
  const validSuggested = [
    ...new Set(
      rawSuggested
        .map((n) => Math.round(Number(n)))
        .filter((n) => Number.isFinite(n) && n >= minAmountFc),
    ),
  ].sort((a, b) => a - b);

  const defaultSuggestedAmountsFc =
    validSuggested.length > 0 ? validSuggested : DEFAULT_DONATIONS_ACCESS.defaultSuggestedAmountsFc;

  return {
    enabled,
    mode,
    tenantIds,
    minAmountFc,
    defaultSuggestedAmountsFc,
  };
}

export function resolveDonationsAccess(
  tenantId: string | null | undefined,
  access: DonationsAccess,
): { allowed: boolean; reason: string } {
  if (!access.enabled) {
    return {
      allowed: false,
      reason: 'Les donations à montant libre sont actuellement désactivées sur la plateforme.',
    };
  }

  if (access.mode === 'all') {
    return {
      allowed: true,
      reason: '',
    };
  }

  // mode === 'restricted'
  if (tenantId && access.tenantIds.includes(tenantId)) {
    return {
      allowed: true,
      reason: '',
    };
  }

  return {
    allowed: false,
    reason: 'Les donations à montant libre ne sont pas autorisées pour cette organisation. Contactez le support pour activer cette option.',
  };
}

export interface EventDonationsConfig {
  enabled: boolean;
  targetAmountFc: number | null;
  minAmountFc: number;
  cause: string | null;
  suggestedAmountsFc: number[];
  donorAttendancePass: boolean;
}

export const DEFAULT_EVENT_DONATIONS_CONFIG: EventDonationsConfig = {
  enabled: false,
  targetAmountFc: null,
  minAmountFc: 1000,
  cause: null,
  suggestedAmountsFc: [2500, 5000, 10000, 25000, 50000, 100000],
  donorAttendancePass: true,
};

export function sanitizeEventDonationsConfig(
  raw: unknown,
  platformAccess: DonationsAccess,
): EventDonationsConfig {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const enabled = Boolean(src.enabled);

  const rawTarget = Number(src.targetAmountFc);
  const targetAmountFc = Number.isFinite(rawTarget) && rawTarget > 0 ? Math.round(rawTarget) : null;

  const platformMin = platformAccess.minAmountFc || 1000;
  const rawMin = Number(src.minAmountFc);
  const minAmountFc =
    Number.isFinite(rawMin) && rawMin >= 100 ? Math.max(platformMin, Math.round(rawMin)) : platformMin;

  const cause = typeof src.cause === 'string' && src.cause.trim().length > 0 ? src.cause.trim() : null;

  const rawSuggested = Array.isArray(src.suggestedAmountsFc) ? src.suggestedAmountsFc : [];
  const validSuggested = [
    ...new Set(
      rawSuggested
        .map((n) => Math.round(Number(n)))
        .filter((n) => Number.isFinite(n) && n >= minAmountFc),
    ),
  ].sort((a, b) => a - b);

  const suggestedAmountsFc =
    validSuggested.length > 0 ? validSuggested : platformAccess.defaultSuggestedAmountsFc;

  const donorAttendancePass = src.donorAttendancePass !== false;

  return {
    enabled,
    targetAmountFc,
    minAmountFc,
    cause,
    suggestedAmountsFc,
    donorAttendancePass,
  };
}

export function extractEventDonationsConfig(eventPrep: unknown): EventDonationsConfig | null {
  if (!eventPrep || typeof eventPrep !== 'object') return null;
  const prep = eventPrep as Record<string, unknown>;
  if (!prep.donations || typeof prep.donations !== 'object') return null;
  return sanitizeEventDonationsConfig(prep.donations, DEFAULT_DONATIONS_ACCESS);
}

