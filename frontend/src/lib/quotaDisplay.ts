export function isUnlimitedQuota(max: number, threshold = 9999): boolean {
  return max >= threshold;
}

export function getQuotaRemaining(used: number, max: number, unlimitedThreshold = 9999): number | null {
  if (isUnlimitedQuota(max, unlimitedThreshold)) return null;
  return Math.max(0, max - used);
}

export function formatQuotaMax(max: number, guests = false): string {
  const threshold = guests ? 99999 : 9999;
  if (isUnlimitedQuota(max, threshold)) return 'Illimité';
  return max.toLocaleString('fr-FR');
}

export function formatQuotaRemaining(used: number, max: number, guests = false): string {
  const remaining = getQuotaRemaining(used, max, guests ? 99999 : 9999);
  if (remaining === null) return 'Illimité';
  return `${remaining.toLocaleString('fr-FR')} restant${remaining !== 1 ? 's' : ''}`;
}

export function getQuotaPercentage(used: number, max: number, unlimitedThreshold = 9999): number {
  if (isUnlimitedQuota(max, unlimitedThreshold)) return 0;
  if (max === 0) return 0;
  return Math.min(Math.round((used / max) * 100), 100);
}

export interface QuotaSnapshot {
  usage: {
    events: number;
    guests: number;
    templates: number;
    rooms?: number;
    orgManagers?: number;
  };
  limits: {
    maxEvents: number;
    maxGuests: number;
    maxTemplates: number;
    maxRooms?: number;
    maxOrgManagers?: number;
  };
}

export const QUOTA_ITEMS: Array<{
  key: keyof QuotaSnapshot['usage'];
  limitKey: keyof QuotaSnapshot['limits'];
  label: string;
  guests?: boolean;
}> = [
  { key: 'events', limitKey: 'maxEvents', label: 'Événements' },
  { key: 'guests', limitKey: 'maxGuests', label: 'Invités', guests: true },
  { key: 'templates', limitKey: 'maxTemplates', label: 'Modèles' },
  { key: 'rooms', limitKey: 'maxRooms', label: 'Salles' },
  { key: 'orgManagers', limitKey: 'maxOrgManagers', label: 'Managers' },
];
