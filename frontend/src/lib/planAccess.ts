import type { PlanCapabilities, PlanQuotaInfo } from '@/context/AuthContext';

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
    protocolQr: 'Le protocole QR nécessite le forfait Business ou supérieur',
    seatNotifications: 'Les notifications PDF / GPS de placement nécessitent Premium 1 ou supérieur',
    customTemplates: 'Les modèles personnalisés nécessitent Premium 1 ou supérieur',
    mockupOcr: 'L’import OCR nécessite Premium 2 ou supérieur',
    roomThemesFixtures: 'Thèmes et fixtures de salle non inclus dans votre forfait',
    commercialNetwork: 'Le réseau commercial nécessite Enterprise 2 ou supérieur',
    adminReports: 'Les rapports avancés nécessitent Enterprise 1 ou supérieur',
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
  complete: 'Salle, Particulier ou Enterprise 1',
};

export function getRoomTypeLockMessage(roomType: string, planName?: string | null): string {
  const level = ROOM_TYPE_MIN_LEVEL[roomType] || 'standard';
  const needed = ROOM_LEVEL_HINT[level];
  const base = `Le type « ${roomType} » nécessite le forfait ${needed} ou supérieur`;
  return planName ? `${base} (actuel : ${planName}).` : `${base}.`;
}
