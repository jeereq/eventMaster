import type { PlanCapabilities, PlanQuotaInfo, OrgAccess } from '@/context/AuthContext';

/** Limite « illimitée » côté API (9999+). */
export function isUnlimitedQuota(limit: number | null | undefined): boolean {
  return limit == null || limit >= 9999;
}

export function isAtQuota(
  usage: number | null | undefined,
  limit: number | null | undefined,
): boolean {
  if (isUnlimitedQuota(limit)) return false;
  return (usage ?? 0) >= (limit as number);
}

/** Feature absente du forfait chargé (ne bloque pas tant que planFeatures est null). */
export function isPlanFeatureLocked(
  planFeatures: PlanCapabilities | null | undefined,
  feature: keyof PlanCapabilities,
): boolean {
  if (!planFeatures) return false;
  const value = planFeatures[feature];
  if (typeof value === 'boolean') return value === false;
  return false;
}

export function hasPlanFeature(
  planFeatures: PlanCapabilities | null | undefined,
  feature: keyof PlanCapabilities,
  opts?: { bypass?: boolean },
): boolean {
  if (opts?.bypass) return true;
  if (!planFeatures) return false;
  const value = planFeatures[feature];
  if (typeof value === 'boolean') return value === true;
  return Boolean(value);
}

export function getQuotaLockMessage(
  kind: 'events' | 'guests' | 'templates' | 'rooms' | 'services' | 'orgManagers',
  planQuota: PlanQuotaInfo | null | undefined,
): string | null {
  if (!planQuota) return null;
  const map = {
    events: { usage: planQuota.usage.events, limit: planQuota.limits.maxEvents, label: 'événements' },
    guests: { usage: planQuota.usage.guests, limit: planQuota.limits.maxGuests, label: 'invités' },
    templates: { usage: planQuota.usage.templates, limit: planQuota.limits.maxTemplates, label: 'modèles' },
    rooms: { usage: planQuota.usage.rooms, limit: planQuota.limits.maxRooms, label: 'salles' },
    services: { usage: planQuota.usage.services ?? 0, limit: planQuota.limits.maxServices ?? 0, label: 'prestations' },
    orgManagers: {
      usage: planQuota.usage.orgManagers,
      limit: planQuota.limits.maxOrgManagers,
      label: 'managers',
    },
  } as const;
  const row = map[kind];
  if (!isAtQuota(row.usage, row.limit)) return null;
  return `Quota ${row.label} atteint (${row.usage}/${row.limit}). Passez à un forfait supérieur.`;
}

export function getFeatureLockMessage(
  feature: keyof PlanCapabilities,
  planName?: string | null,
): string {
  const labels: Partial<Record<keyof PlanCapabilities, string>> = {
    protocolQr: 'Le protocole QR n’est pas inclus dans votre forfait',
    seatNotifications: 'Les notifications PDF / GPS de placement ne sont pas incluses dans votre forfait',
    customTemplates: 'Les modèles personnalisés ne sont pas inclus dans votre forfait',
    mockupOcr: 'L’import OCR n’est pas inclus dans votre forfait',
    roomThemesFixtures: 'Thèmes et fixtures de salle non inclus dans votre forfait',
    commercialNetwork: 'Le réseau commercial n’est pas inclus dans votre forfait',
    adminReports: 'Les rapports avancés ne sont pas inclus dans votre forfait',
  };
  const base = labels[feature] || 'Fonctionnalité non incluse dans votre forfait';
  return planName ? `${base} (actuel : ${planName}).` : `${base}.`;
}

export type RoomEditorLevel = 'basic' | 'standard' | 'advanced' | 'complete';

export const ROOM_TYPE_MIN_LEVEL: Record<string, RoomEditorLevel> = {
  SIMPLE: 'basic',
  BANQUET: 'standard',
  CONFERENCE: 'standard',
  AMPHITHEATER: 'advanced',
  TENT: 'advanced',
  CUSTOM: 'complete',
};

const ROOM_LEVEL_HINT: Record<RoomEditorLevel, string> = {
  basic: 'Essentials',
  standard: 'Business',
  advanced: 'Premium',
  complete: 'Salle, Particulier, Salle & presta ou Enterprise 1',
};

/** Publication d’une salle au catalogue public (interdit au forfait Particulier). */
export function canPublishVenueCatalog(
  planFeatures?: PlanCapabilities | null,
  planQuota?: PlanQuotaInfo | null,
  planId?: string | null,
): boolean {
  if (planId === 'PERSONAL' || planFeatures?.audience === 'B2C') return false;
  const maxRooms = planQuota?.limits.maxRooms;
  if (maxRooms != null && maxRooms <= 0) return false;
  return true;
}

export function getRoomTypeLockMessage(roomType: string, planName?: string | null): string {
  const level = ROOM_TYPE_MIN_LEVEL[roomType] || 'standard';
  const needed = ROOM_LEVEL_HINT[level];
  const base = `Le type « ${roomType} » nécessite le forfait ${needed} ou supérieur`;
  return planName ? `${base} (actuel : ${planName}).` : `${base}.`;
}

export interface WorkspaceModules {
  showEvents: boolean;
  showRooms: boolean;
  showMarketplace: boolean;
  showTemplates: boolean;
  showAnalytics: boolean;
  showProtocol: boolean;
  showTeam: boolean;
}

/** Menus workspace selon type de compte + quotas du forfait. */
export function getWorkspaceModules(opts: {
  accountKind?: string | null;
  access?: OrgAccess | null;
  planQuota?: PlanQuotaInfo | null;
  planFeatures?: PlanCapabilities | null;
}): WorkspaceModules {
  const kind = opts.accountKind || 'ORGANIZER';
  const vendorOnly = kind === 'VENDOR';
  const canRooms = Boolean(opts.access?.canManageRooms);
  const canTeam = Boolean(opts.access?.canManageTeam);
  const protocolOnly = Boolean(opts.access?.isProtocolOnly);

  if (vendorOnly && !opts.planQuota) {
    return {
      showEvents: false,
      showRooms: canRooms,
      showMarketplace: canRooms,
      showTemplates: false,
      showAnalytics: false,
      showProtocol: false,
      showTeam: canTeam,
    };
  }

  const maxEvents = opts.planQuota?.limits.maxEvents ?? 3;
  const maxRooms = opts.planQuota?.limits.maxRooms ?? 1;
  const maxTemplates = opts.planQuota?.limits.maxTemplates ?? 2;
  const maxServices = opts.planQuota?.limits.maxServices ?? 0;

  const showEvents = !vendorOnly || maxEvents > 0;
  const showRooms = canRooms && maxRooms > 0;
  const showMarketplace = canRooms && maxServices > 0;

  return {
    showEvents,
    showRooms,
    showMarketplace,
    showTemplates: showEvents && maxTemplates > 0 && !protocolOnly,
    showAnalytics: showEvents && !protocolOnly,
    showProtocol:
      showEvents &&
      Boolean(opts.access?.canProtocolAllEvents || opts.access?.level === 'staff') &&
      opts.planFeatures?.protocolQr !== false,
    showTeam: canTeam,
  };
}
