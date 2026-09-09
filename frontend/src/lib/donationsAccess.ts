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

export interface EventDonationsConfig {
  enabled: boolean;
  targetAmountFc: number | null;
  minAmountFc: number;
  cause: string | null;
  suggestedAmountsFc: number[];
  donorAttendancePass: boolean;
  collectedAmountFc?: number;
  donorsCount?: number;
  allowedByPlatform?: boolean;
}

export const DEFAULT_EVENT_DONATIONS_CONFIG: EventDonationsConfig = {
  enabled: false,
  targetAmountFc: null,
  minAmountFc: 1000,
  cause: null,
  suggestedAmountsFc: [2500, 5000, 10000, 25000, 50000, 100000],
  donorAttendancePass: true,
};

export function resolveDonationsAccess(
  tenantId: string | null | undefined,
  access?: DonationsAccess | null,
): { allowed: boolean; reason: string } {
  if (!access || !access.enabled) {
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

  if (tenantId && access.tenantIds && access.tenantIds.includes(tenantId)) {
    return {
      allowed: true,
      reason: '',
    };
  }

  return {
    allowed: false,
    reason: 'Les donations à montant libre ne sont pas autorisées pour votre organisation. Contactez l’administrateur pour activer cette option.',
  };
}
