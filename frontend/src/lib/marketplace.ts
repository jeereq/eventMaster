import type { RoomType } from '@/lib/roomLayoutUtils';
import { formatFc } from '@/config/landingPricing';

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
  VENDOR: 'Publiez vos salles ou prestations. Forfaits Salle, Prestataire ou Salle & presta.',
  BOTH: 'Organisez et publiez aussi vos offres (forfait Salle & presta recommandé).',
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

/** Communes fréquentes (sélection rapide dans les filtres catalogue). */
export const CATALOGUE_COMMUNE_SUGGESTIONS = [
  'Gombe',
  'Ngaliema',
  'Limete',
  'Lemba',
  'Kintambo',
  'Masina',
  'Ndjili',
  'Mont-Ngafula',
  'Kalamu',
  'Bandalungwa',
];

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

export type CatalogueProximity = '' | 'around' | 'near';

export type CatalogueGeoState = {
  city: string;
  commune: string;
  neighborhood: string;
  street: string;
  minPrice: string;
  maxPrice: string;
  proximity: CatalogueProximity;
  nearPlace: string;
  radiusKm: number;
  lat: number | null;
  lng: number | null;
};

export const EMPTY_CATALOGUE_GEO: CatalogueGeoState = {
  city: '',
  commune: '',
  neighborhood: '',
  street: '',
  minPrice: '',
  maxPrice: '',
  proximity: '',
  nearPlace: '',
  radiusKm: 10,
  lat: null,
  lng: null,
};

export function hasValidGps(latitude?: string | number | null, longitude?: string | number | null) {
  const lat = Number.parseFloat(String(latitude ?? ''));
  const lng = Number.parseFloat(String(longitude ?? ''));
  return Number.isFinite(lat) && Number.isFinite(lng);
}

export function missingPublishLocation(draft: {
  city?: string;
  commune?: string;
  neighborhood?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
}): 'city' | 'commune' | 'neighborhood' | 'map' | null {
  if (!String(draft.city || '').trim()) return 'city';
  if (!String(draft.commune || '').trim()) return 'commune';
  if (!String(draft.neighborhood || '').trim()) return 'neighborhood';
  if (!hasValidGps(draft.latitude, draft.longitude)) return 'map';
  return null;
}

export function appendCatalogueGeoParams(params: URLSearchParams, filters: CatalogueGeoState) {
  if (filters.city.trim()) params.set('city', filters.city.trim());
  if (filters.commune.trim()) params.set('commune', filters.commune.trim());
  if (filters.neighborhood.trim()) params.set('neighborhood', filters.neighborhood.trim());
  if (filters.street.trim()) params.set('street', filters.street.trim());
  if (filters.minPrice.trim()) params.set('minPrice', filters.minPrice.trim());
  if (filters.maxPrice.trim()) params.set('maxPrice', filters.maxPrice.trim());
  if (filters.proximity && filters.lat != null && filters.lng != null) {
    params.set('lat', String(filters.lat));
    params.set('lng', String(filters.lng));
    params.set('radiusKm', String(filters.radiusKm || 10));
  }
}

export function catalogueGeoChips(
  filters: CatalogueGeoState,
  extra: Array<{ id: string; label: string; value: string }> = [],
): Array<{ id: string; label: string; value: string }> {
  const next: Array<{ id: string; label: string; value: string }> = [];
  if (filters.city.trim()) next.push({ id: 'city', label: 'Ville', value: filters.city.trim() });
  if (filters.commune.trim()) next.push({ id: 'commune', label: 'Commune', value: filters.commune.trim() });
  if (filters.neighborhood.trim()) next.push({ id: 'neighborhood', label: 'Quartier', value: filters.neighborhood.trim() });
  if (filters.street.trim()) next.push({ id: 'street', label: 'Avenue', value: filters.street.trim() });
  if (filters.minPrice.trim()) next.push({ id: 'minPrice', label: 'Prix min', value: `${filters.minPrice.trim()} FC` });
  if (filters.maxPrice.trim()) next.push({ id: 'maxPrice', label: 'Prix max', value: `${filters.maxPrice.trim()} FC` });
  if (filters.proximity === 'around') {
    next.push({ id: 'proximity', label: 'Autour de moi', value: `${filters.radiusKm} km` });
  } else if (filters.proximity === 'near') {
    next.push({
      id: 'proximity',
      label: 'Près de',
      value: `${filters.nearPlace.trim() || filters.commune.trim() || 'un lieu'} · ${filters.radiusKm} km`,
    });
  }
  return [...next, ...extra];
}

export function clearCatalogueGeoChip(filters: CatalogueGeoState, id: string): CatalogueGeoState {
  if (id === 'proximity') {
    return { ...filters, proximity: '', nearPlace: '', lat: null, lng: null };
  }
  if (id === 'radiusKm') {
    return { ...filters, radiusKm: 10 };
  }
  if (id in filters) {
    return { ...filters, [id]: id === 'radiusKm' ? 10 : '' };
  }
  return filters;
}

export async function resolveCatalogueGeo(filters: CatalogueGeoState): Promise<CatalogueGeoState> {
  if (filters.proximity === 'around') {
    const pos = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        reject(new Error('La géolocalisation n’est pas disponible sur cet appareil.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => reject(new Error('Autorisez la localisation pour filtrer autour de vous.')),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
      );
    });
    return { ...filters, lat: pos.lat, lng: pos.lng };
  }
  if (filters.proximity === 'near') {
    const q = filters.nearPlace.trim() || filters.commune.trim();
    if (!q) {
      throw new Error('Indiquez une commune, un quartier ou une avenue pour chercher à proximité.');
    }
    const { geocodeLocation } = await import('@/lib/leafletLoader');
    const place = await geocodeLocation(`${q}, ${filters.city.trim() || 'Kinshasa'}, RD Congo`);
    if (!place) {
      throw new Error('Lieu introuvable. Précisez la commune ou l’avenue.');
    }
    return { ...filters, lat: place.lat, lng: place.lng };
  }
  return { ...filters, lat: null, lng: null };
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
export type CatalogueViewMode = 'grid' | 'list' | 'map' | 'focus';

export function isCatalogueMapView(mode: CatalogueViewMode): mode is 'map' | 'focus' {
  return mode === 'map' || mode === 'focus';
}

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
  coverageRadiusKm?: number | null;
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
    coverageRadiusKm: service.coverageRadiusKm,
  };
}

export function filterCatalogueItems(items: CatalogueItem[], query: string): CatalogueItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) =>
    [item.title, item.orgName, item.categoryLabel, item.location].join(' ').toLowerCase().includes(q),
  );
}

export function mapsDirectionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export function catalogueItemToMapMarker(item: CatalogueItem) {
  return {
    id: item.id,
    lat: item.latitude as number,
    lng: item.longitude as number,
    title: item.title,
    href: item.href,
    subtitle: [item.orgName, item.location].filter(Boolean).join(' · ') || undefined,
    kind: item.kind,
    coverUrl: item.coverUrl,
    priceLabel: item.priceFromFc != null ? `Dès ${formatFc(item.priceFromFc)}` : 'Sur devis',
    categoryLabel: item.kind === 'venue' ? 'Salle' : item.categoryLabel,
    orgName: item.orgName,
    location: item.location || undefined,
    coverageRadiusKm: item.coverageRadiusKm ?? null,
  };
}
