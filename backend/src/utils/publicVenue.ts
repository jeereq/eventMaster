import { ServiceCategory, VenuePriceUnit } from '@prisma/client';

const PRICE_UNITS: VenuePriceUnit[] = ['EVENT', 'DAY', 'HOUR'];

export function parsePriceUnit(value: unknown): VenuePriceUnit {
  if (typeof value === 'string' && PRICE_UNITS.includes(value as VenuePriceUnit)) {
    return value as VenuePriceUnit;
  }
  return 'EVENT';
}

const SERVICE_CATEGORIES: ServiceCategory[] = [
  'CATERING', 'PHOTOGRAPHY', 'VIDEO', 'DJ', 'DECORATION',
  'SECURITY', 'FLORIST', 'TRANSPORT', 'MC', 'OTHER',
];

export function parseServiceCategory(value: unknown): ServiceCategory | null {
  if (typeof value === 'string' && SERVICE_CATEGORIES.includes(value as ServiceCategory)) {
    return value as ServiceCategory;
  }
  return null;
}

export function serviceCategoryLabel(category: ServiceCategory): string {
  const labels: Record<ServiceCategory, string> = {
    CATERING: 'Traiteur',
    PHOTOGRAPHY: 'Photographie',
    VIDEO: 'Vidéo',
    DJ: 'DJ / sonorisation',
    DECORATION: 'Décoration',
    SECURITY: 'Sécurité',
    FLORIST: 'Fleuriste',
    TRANSPORT: 'Transport',
    MC: 'Maître de cérémonie',
    OTHER: 'Autre',
  };
  return labels[category];
}

export function sanitizeLayoutBlueprint(blueprint: unknown): unknown | null {
  if (!blueprint || typeof blueprint !== 'object') return null;
  let clone: unknown;
  try {
    clone = JSON.parse(JSON.stringify(blueprint));
  } catch {
    return null;
  }

  const strip = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const rec = node as Record<string, unknown>;
    delete rec.guestId;
    delete rec.guest;
    delete rec.email;
    delete rec.firstName;
    delete rec.lastName;
    delete rec.assignedGuestId;
    if (Array.isArray(rec.seats)) {
      rec.seats = rec.seats.map((seat) => {
        if (!seat || typeof seat !== 'object') return seat;
        const next = { ...(seat as Record<string, unknown>) };
        delete next.guestId;
        delete next.guest;
        delete next.email;
        delete next.firstName;
        delete next.lastName;
        next.occupied = false;
        return next;
      });
    }
    for (const value of Object.values(rec)) {
      if (Array.isArray(value)) value.forEach(strip);
      else if (value && typeof value === 'object') strip(value);
    }
  };

  strip(clone);
  return clone;
}

export function parsePhotoUrls(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const urls: string[] = [];
  for (const item of input) {
    const url = typeof item === 'string' ? item : item && typeof item === 'object' && 'url' in item
      ? String((item as { url?: unknown }).url || '')
      : '';
    if (!url || url.length > 600) continue;
    if (!/^https?:\/\//i.test(url)) continue;
    urls.push(url);
    if (urls.length >= 24) break;
  }
  return urls;
}

export function priceUnitLabel(unit: VenuePriceUnit): string {
  if (unit === 'DAY') return 'par jour';
  if (unit === 'HOUR') return 'par heure';
  return 'par événement';
}
