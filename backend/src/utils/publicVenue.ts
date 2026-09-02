import { ServiceCategory, VenuePriceUnit } from '@prisma/client';

const PRICE_UNITS: VenuePriceUnit[] = ['EVENT', 'DAY', 'HOUR', 'MINUTE', 'PERSON', 'QUOTA'];

export function parsePriceUnit(value: unknown): VenuePriceUnit {
  if (typeof value === 'string') {
    const upper = value.trim().toUpperCase();
    if (PRICE_UNITS.includes(upper as VenuePriceUnit)) {
      return upper as VenuePriceUnit;
    }
  }
  return 'EVENT';
}

export function parsePriceUnitFilter(value: unknown): VenuePriceUnit | undefined {
  if (typeof value === 'string') {
    const upper = value.trim().toUpperCase();
    if (PRICE_UNITS.includes(upper as VenuePriceUnit)) {
      return upper as VenuePriceUnit;
    }
  }
  return undefined;
}

const SERVICE_CATEGORIES = [
  'CATERING', 'PHOTOGRAPHY', 'VIDEO', 'DJ', 'DECORATION',
  'SECURITY', 'FLORIST', 'TRANSPORT', 'MC', 'BEAUTY_HAIR',
  'EVENT_PLANNER', 'ENTERTAINMENT', 'OFFICIANT', 'CHILDCARE',
  'AV_TECHNICIAN', 'STATIONERY', 'OTHER',
  'RENTAL_CLOTHING_MEN', 'RENTAL_CLOTHING_WOMEN', 'RENTAL_CLOTHING_CHILD',
  'RENTAL_CAR', 'RENTAL_MOTO', 'RENTAL_EQUIPMENT', 'RENTAL_FURNITURE',
  'RENTAL_AV', 'RENTAL_TABLEWARE', 'RENTAL_DECOR', 'RENTAL_TENT',
] as ServiceCategory[];

const RENTAL_CATEGORIES = [
  'RENTAL_CLOTHING_MEN', 'RENTAL_CLOTHING_WOMEN', 'RENTAL_CLOTHING_CHILD',
  'RENTAL_CAR', 'RENTAL_MOTO', 'RENTAL_EQUIPMENT', 'RENTAL_FURNITURE',
  'RENTAL_AV', 'RENTAL_TABLEWARE', 'RENTAL_DECOR', 'RENTAL_TENT',
] as ServiceCategory[];

export function parseServiceCategory(value: unknown): ServiceCategory | undefined {
  if (typeof value === 'string') {
    const upper = value.trim().toUpperCase();
    if ((SERVICE_CATEGORIES as string[]).includes(upper)) {
      return upper as ServiceCategory;
    }
  }
  return undefined;
}

export function isServiceRentalCategory(category?: string | null): boolean {
  return Boolean(category && (RENTAL_CATEGORIES as string[]).includes(category.trim().toUpperCase() as ServiceCategory));
}

export function parseServiceGroup(value: unknown): 'trade' | 'rental' | null {
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    if (lower === 'trade' || lower === 'rental') return lower;
  }
  return null;
}

export function serviceGroupPrismaFilter(group: 'trade' | 'rental' | null) {
  if (group === 'rental') return { category: { in: RENTAL_CATEGORIES } };
  if (group === 'trade') return { category: { notIn: RENTAL_CATEGORIES } };
  return {};
}

export function serviceCategoryLabel(category: ServiceCategory): string {
  const labels: Record<string, string> = {
    CATERING: 'Traiteur',
    PHOTOGRAPHY: 'Photographie',
    VIDEO: 'Vidéo',
    DJ: 'DJ / sonorisation',
    DECORATION: 'Décoration',
    SECURITY: 'Sécurité',
    FLORIST: 'Fleuriste',
    TRANSPORT: 'Transport',
    MC: 'Maître de cérémonie',
    BEAUTY_HAIR: 'Coiffure & Maquillage',
    EVENT_PLANNER: 'Organisation & Wedding Planner',
    ENTERTAINMENT: 'Animation & Spectacle',
    OFFICIANT: 'Officiant de cérémonie',
    CHILDCARE: 'Garde d’enfants',
    AV_TECHNICIAN: 'Régie & Technique',
    STATIONERY: 'Papeterie & Faire-part',
    OTHER: 'Autre prestation',
    RENTAL_CLOTHING_MEN: 'Location habits homme',
    RENTAL_CLOTHING_WOMEN: 'Location habits femme',
    RENTAL_CLOTHING_CHILD: 'Location habits enfant',
    RENTAL_CAR: 'Location voiture',
    RENTAL_MOTO: 'Location moto',
    RENTAL_EQUIPMENT: 'Location matériel divers',
    RENTAL_FURNITURE: 'Location mobilier & chaises',
    RENTAL_AV: 'Location sonorisation & éclairage',
    RENTAL_TABLEWARE: 'Location vaisselle & linge',
    RENTAL_DECOR: 'Location matériel de décoration',
    RENTAL_TENT: 'Location tentes & chapiteaux',
  };
  return labels[category] || String(category);
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
    if (!url || url.length > 1200) continue;
    if (!/^https?:\/\//i.test(url)) continue;
    urls.push(url);
    if (urls.length >= 24) break;
  }
  return urls;
}

export function isVideoUrl(url: string): boolean {
  if (!url) return false;
  if (/\/video\/upload\//i.test(url)) return true;
  return /\.(mp4|webm|mov|m4v|qt)(\?|#|$)/i.test(url);
}

export function mediaPosterUrl(url: string): string {
  if (!isVideoUrl(url)) return url;
  if (/\/video\/upload\//i.test(url)) {
    const withTransform = /\/video\/upload\/[^/]*so_/i.test(url)
      ? url
      : url.replace('/video/upload/', '/video/upload/so_1,f_jpg/');
    return withTransform.replace(/\.(mp4|webm|mov|m4v|qt)(\?.*)?$/i, '.jpg$2');
  }
  return url;
}

export function coverFromMedia(urls: string[]): string | null {
  const image = urls.find((item) => !isVideoUrl(item));
  if (image) return image;
  return urls[0] ? mediaPosterUrl(urls[0]) : null;
}

export const MARKETPLACE_MAX_VIDEOS = 8;

export function priceUnitLabel(unit: VenuePriceUnit): string {
  if (unit === 'DAY') return 'par jour';
  if (unit === 'HOUR') return 'par heure';
  if (unit === 'MINUTE') return 'par minute';
  if (unit === 'PERSON') return 'par personne';
  if (unit === 'QUOTA') return 'par quota d’invités';
  return 'par événement';
}
