import type { RoomType } from '@/lib/roomLayoutUtils';

export type VenuePriceUnit = 'EVENT' | 'DAY' | 'HOUR' | 'MINUTE' | 'PERSON' | 'QUOTA';
export type TenantAccountKind = 'ORGANIZER' | 'VENDOR' | 'BOTH' | 'CLIENT';
export type ServiceCategory =
  | 'CATERING'
  | 'PHOTOGRAPHY'
  | 'VIDEO'
  | 'DJ'
  | 'DECORATION'
  | 'SECURITY'
  | 'FLORIST'
  | 'TRANSPORT'
  | 'MC'
  | 'OTHER';

export interface PublicVenue {
  slug: string;
  name: string;
  headline: string;
  description: string | null;
  city: string | null;
  commune: string | null;
  neighborhood: string | null;
  address: string | null;
  floor: string | null;
  capacity: number | null;
  roomType: RoomType;
  latitude: number | null;
  longitude: number | null;
  priceFromFc: number | null;
  priceUnit: VenuePriceUnit;
  priceUnitLabel: string;
  quotaMin?: number | null;
  quotaMax?: number | null;
  photos: string[];
  coverUrl: string | null;
  publishedAt: string | null;
  orgName: string;
  orgCity: string | null;
  layoutPreview?: unknown | null;
  blockedDates?: string[];
  bookedDates?: string[];
  unavailableDates?: string[];
}

export interface VenueListingDraft {
  isPublic: boolean;
  headline: string;
  city: string;
  address: string;
  priceFromFc: string;
  priceUnit: VenuePriceUnit;
  photos: string[];
  latitude: string;
  longitude: string;
}

export const ACCOUNT_KIND_LABELS: Record<TenantAccountKind, string> = {
  ORGANIZER: 'Organisateur d’événements',
  VENDOR: 'Prestataire / salles',
  BOTH: 'Les deux',
  CLIENT: 'Je cherche une salle ou un prestataire',
};

export const ACCOUNT_KIND_DESCRIPTIONS: Record<TenantAccountKind, string> = {
  ORGANIZER: 'Créez des événements, invitations et plans de table.',
  VENDOR: 'Publiez vos salles ou prestations dans le catalogue.',
  BOTH: 'Organisez et proposez aussi vos offres.',
  CLIENT: 'Réservez sans espace événement. Vous pourrez upgrader plus tard.',
};

export function isClientAccount(kind?: TenantAccountKind | string | null) {
  return kind === 'CLIENT';
}

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
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

export const SERVICE_CATEGORIES = Object.keys(SERVICE_CATEGORY_LABELS) as ServiceCategory[];

export interface PublicService {
  slug: string;
  title: string;
  description: string | null;
  category: ServiceCategory;
  categoryLabel: string;
  city: string | null;
  commune?: string | null;
  neighborhood?: string | null;
  coverageRadiusKm: number | null;
  latitude?: number | null;
  longitude?: number | null;
  priceFromFc: number | null;
  priceUnit: VenuePriceUnit;
  priceUnitLabel: string;
  quotaMin?: number | null;
  quotaMax?: number | null;
  photos: string[];
  coverUrl: string | null;
  publishedAt: string | null;
  orgName: string;
  orgSlug: string;
  blockedDates?: string[];
  bookedDates?: string[];
  unavailableDates?: string[];
}

export interface MarketplaceInquiryItem {
  id: string;
  kind: 'venue' | 'service';
  title: string;
  fromName: string;
  fromEmail: string;
  fromPhone: string | null;
  eventDate: string | null;
  guestCount: number | null;
  message: string;
  status: 'NEW' | 'CONTACTED';
  createdAt: string;
  event: { id: string; title: string; date: string } | null;
  hasBooking?: boolean;
  bookingId?: string | null;
  bookingStatus?: MarketplaceBookingStatus | null;
}

export type MarketplaceBookingStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED';

export const MARKETPLACE_COMMISSION_RATE = 0.08;
export const MARKETPLACE_DEPOSIT_RATE = 0.3;
export const MARKETPLACE_MAX_PHOTOS = 24;
export const MARKETPLACE_MAX_VIDEOS = 8;
export const MARKETPLACE_MAX_VIDEO_BYTES = 80 * 1024 * 1024;

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

export const BOOKING_STATUS_LABELS: Record<MarketplaceBookingStatus, string> = {
  REQUESTED: 'Demande',
  ACCEPTED: 'Acceptée',
  CONFIRMED: 'Confirmée',
  CANCELLED: 'Annulée',
  COMPLETED: 'Terminée',
};

export interface MarketplaceBookingItem {
  id: string;
  kind: 'venue' | 'service';
  title: string;
  listingSlug: string | null;
  offeringSlug: string | null;
  vendorTenantId: string;
  organizerTenantId: string | null;
  vendorName: string;
  organizerName: string | null;
  eventDate: string;
  guestCount: number | null;
  amountFc: number;
  depositFc: number;
  commissionRate: number;
  commissionFc: number;
  status: MarketplaceBookingStatus;
  depositMarkedAt: string | null;
  notes: string | null;
  createdAt: string;
  event: { id: string; title: string; date: string } | null;
  viewerRole?: 'vendor' | 'organizer';
}

export function parseBlockedDates(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const keys = new Set<string>();
  for (const item of input) {
    const match = String(item).match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) keys.add(match[1]);
  }
  return [...keys].sort();
}

export function eachDateKey(from: string, to: string): string[] {
  const start = from <= to ? from : to;
  const end = from <= to ? to : from;
  const match = start.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const endMatch = end.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match || !endMatch) return [];
  const keys: string[] = [];
  const cursor = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const last = new Date(Date.UTC(Number(endMatch[1]), Number(endMatch[2]) - 1, Number(endMatch[3])));
  while (cursor.getTime() <= last.getTime() && keys.length < 366) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

export function previewMarketplaceAmounts(amountFc: number) {
  const amount = Math.max(0, Math.round(amountFc));
  return {
    amountFc: amount,
    depositFc: Math.round(amount * MARKETPLACE_DEPOSIT_RATE),
    commissionFc: Math.round(amount * MARKETPLACE_COMMISSION_RATE),
  };
}

export const PRICE_UNIT_OPTIONS: Array<{ id: VenuePriceUnit; label: string }> = [
  { id: 'EVENT', label: 'Par événement' },
  { id: 'DAY', label: 'Par jour' },
  { id: 'HOUR', label: 'Par heure' },
  { id: 'MINUTE', label: 'Par minute' },
  { id: 'PERSON', label: 'Par personne / par tête' },
  { id: 'QUOTA', label: 'Par quota d’invités' },
];

export const RADIUS_KM_OPTIONS = [5, 10, 15, 25, 50] as const;

export function formatLocationLine(item: {
  city?: string | null;
  commune?: string | null;
  neighborhood?: string | null;
}): string {
  return [item.neighborhood, item.commune, item.city].filter(Boolean).join(' · ');
}

export function formatQuotaLabel(quotaMin?: number | null, quotaMax?: number | null): string | null {
  if (quotaMin && quotaMax) return `Quota ${quotaMin}–${quotaMax} invités`;
  if (quotaMin) return `Quota dès ${quotaMin} invités`;
  if (quotaMax) return `Quota jusqu’à ${quotaMax} invités`;
  return null;
}

export type CatalogueKind = 'venue' | 'service';
export type CatalogueViewMode = 'grid' | 'list' | 'map';

export interface CatalogueItem {
  kind: CatalogueKind;
  id: string;
  slug: string;
  href: string;
  title: string;
  orgName: string;
  categoryLabel: string;
  location: string;
  coverUrl: string | null;
  priceFromFc: number | null;
  priceUnitLabel: string;
  latitude: number | null;
  longitude: number | null;
}

export function venueToCatalogueItem(venue: PublicVenue): CatalogueItem {
  return {
    kind: 'venue',
    id: `venue:${venue.slug}`,
    slug: venue.slug,
    href: `/marketplace/salles/${venue.slug}`,
    title: venue.headline,
    orgName: venue.orgName,
    categoryLabel: 'Salle',
    location: formatLocationLine(venue),
    coverUrl: venue.coverUrl,
    priceFromFc: venue.priceFromFc,
    priceUnitLabel: venue.priceUnitLabel,
    latitude: venue.latitude,
    longitude: venue.longitude,
  };
}

export function serviceToCatalogueItem(service: PublicService): CatalogueItem {
  return {
    kind: 'service',
    id: `service:${service.slug}`,
    slug: service.slug,
    href: `/marketplace/prestataires/${service.slug}`,
    title: service.title,
    orgName: service.orgName,
    categoryLabel: service.categoryLabel,
    location: [
      formatLocationLine(service),
      service.coverageRadiusKm ? `rayon ${service.coverageRadiusKm} km` : null,
    ].filter(Boolean).join(' · '),
    coverUrl: service.coverUrl,
    priceFromFc: service.priceFromFc,
    priceUnitLabel: service.priceUnitLabel,
    latitude: service.latitude ?? null,
    longitude: service.longitude ?? null,
  };
}

export function filterCatalogueItems(items: CatalogueItem[], query: string): CatalogueItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) =>
    [item.title, item.orgName, item.categoryLabel, item.location].join(' ').toLowerCase().includes(q),
  );
}
