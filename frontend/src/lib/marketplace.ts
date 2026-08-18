import { roomTypeLabels, type RoomType } from '@/lib/roomLayoutUtils';
import { formatFc } from '@/config/landingPricing';
import { findRdcCommune, isAllowedRdcCity, neighborhoodsFor } from '@/lib/rdcCities';

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
  distanceKm?: number | null;
  details?: import('./listingDetails').ListingDetails | null;
  isPublic?: boolean;
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
  BOTH: 'Organisez et publiez : un seul forfait à la fois (Particulier, Business, ou Salle / Prestataire / mixte).',
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

export type ServiceMobility = '' | 'on_site' | 'travels';

export const SERVICE_MOBILITY_OPTIONS: Array<{ id: ServiceMobility; label: string }> = [
  { id: '', label: 'Tous' },
  { id: 'on_site', label: 'Sur place' },
  { id: 'travels', label: 'Se déplace' },
];

export function serviceMobilityLabel(travels: boolean, radiusKm?: number | null): string {
  if (!travels) return 'Sur place uniquement';
  return radiusKm && radiusKm > 0 ? `Se déplace · ${radiusKm} km` : 'Se déplace';
}

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
  travels?: boolean;
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
  distanceKm?: number | null;
  details?: import('./listingDetails').ListingDetails | null;
  isPublic?: boolean;
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

export const BOOKING_PIPELINE_STEPS = [
  { id: 'REQUESTED', label: 'Demande' },
  { id: 'ACCEPTED', label: 'Acceptée' },
  { id: 'DEPOSIT', label: 'Acompte' },
  { id: 'CONFIRMED', label: 'Confirmée' },
] as const;

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
  eventEndDate?: string | null;
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

export function bookingPipelineIndex(item: MarketplaceBookingItem): number {
  if (item.status === 'CANCELLED') return -1;
  if (item.status === 'CONFIRMED' || item.status === 'COMPLETED') return 3;
  if (item.status === 'ACCEPTED') return item.depositMarkedAt ? 2 : 1;
  return 0;
}

export function bookingNextStep(item: MarketplaceBookingItem): { title: string; detail: string } {
  const isVendor = item.viewerRole === 'vendor';
  if (item.status === 'CANCELLED') {
    return { title: 'Annulée', detail: 'Aucune action requise.' };
  }
  if (item.status === 'COMPLETED') {
    return { title: 'Terminée', detail: 'L’événement est passé.' };
  }
  if (item.status === 'CONFIRMED') {
    return { title: 'Date bloquée', detail: 'La réservation est confirmée au calendrier.' };
  }
  if (item.status === 'REQUESTED') {
    return isVendor
      ? { title: 'À traiter', detail: 'Vérifiez le montant, puis acceptez ou refusez.' }
      : { title: 'En attente', detail: 'Le professionnel n’a pas encore répondu.' };
  }
  if (item.status === 'ACCEPTED' && !item.depositMarkedAt) {
    return isVendor
      ? { title: 'Acompte à marquer', detail: 'Quand les 30 % sont versés hors plateforme, marquez l’acompte reçu.' }
      : { title: 'Acompte à verser', detail: `Versez ${Math.round(MARKETPLACE_DEPOSIT_RATE * 100)} % au professionnel hors EventMaster.` };
  }
  return isVendor
    ? { title: 'À confirmer', detail: 'Confirmez pour bloquer la date au calendrier.' }
    : { title: 'Confirmation en cours', detail: 'L’acompte est marqué. Le professionnel va bloquer la date.' };
}

export function inquiryNextStep(item: MarketplaceInquiryItem): { title: string; detail: string } {
  if (item.hasBooking) {
    return { title: 'Déjà convertie', detail: 'Une réservation existe déjà pour cette demande.' };
  }
  if (item.status === 'NEW') {
    return item.eventDate
      ? { title: 'Nouveau devis', detail: 'Contactez le client, puis convertissez en réservation si la date convient.' }
      : { title: 'Nouveau devis', detail: 'Contactez le client, puis marquez la demande comme contactée.' };
  }
  return item.eventDate
    ? { title: 'Prêt à réserver', detail: 'Convertissez cette demande en réservation pour suivre l’acompte et bloquer la date.' }
    : { title: 'Contacté', detail: 'Pas de date indiquée : convenez d’un jour avant de créer une réservation.' };
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

export function bookingDateKeys(booking: { eventDate: string; eventEndDate?: string | null }): string[] {
  const start = String(booking.eventDate || '').slice(0, 10);
  const end = String(booking.eventEndDate || booking.eventDate || '').slice(0, 10);
  if (!start) return [];
  return eachDateKey(start, end || start);
}

export function formatDateKeyFr(key: string) {
  const match = String(key).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return key;
  return new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00`).toLocaleDateString('fr-FR');
}

export function formatBookingPeriod(start?: string | null, end?: string | null) {
  const from = start ? String(start).slice(0, 10) : '';
  const to = end ? String(end).slice(0, 10) : from;
  if (!from) return '';
  if (!to || from === to) return formatDateKeyFr(from);
  return `du ${formatDateKeyFr(from)} au ${formatDateKeyFr(to)}`;
}

export function previewMarketplaceAmounts(amountFc: number, dayCount = 1, priceUnit?: string | null) {
  const days = Math.max(1, dayCount);
  const amount = Math.max(0, Math.round(priceUnit === 'DAY' ? amountFc * days : amountFc));
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

export const RADIUS_KM_OPTIONS = [2, 5, 10, 15, 25, 40] as const;

export function clampRadiusKm(value: number | string | null | undefined, fallback = 10) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(80, Math.max(0.5, n));
}

export function formatDistanceKm(km?: number | null): string | null {
  if (km == null || !Number.isFinite(km)) return null;
  if (km < 0.1) return 'À moins de 100 m';
  if (km < 1) return `À ${Math.round(km * 1000)} m`;
  if (km < 10) return `À ${km.toFixed(1).replace('.', ',')} km`;
  return `À ${Math.round(km)} km`;
}

export function sortCatalogueByDistance<T extends { distanceKm?: number | null }>(items: T[]): T[] {
  const hasDistance = items.some((item) => item.distanceKm != null);
  if (!hasDistance) return items;
  return [...items].sort((a, b) => {
    if (a.distanceKm == null && b.distanceKm == null) return 0;
    if (a.distanceKm == null) return 1;
    if (b.distanceKm == null) return -1;
    return a.distanceKm - b.distanceKm;
  });
}

export type CatalogueProximity = '' | 'around' | 'near';

export type CatalogueGeoState = {
  city: string;
  commune: string;
  neighborhood: string;
  street: string;
  minPrice: string;
  maxPrice: string;
  minCapacity: string;
  maxCapacity: string;
  availableFrom: string;
  availableTo: string;
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
  minCapacity: '',
  maxCapacity: '',
  availableFrom: '',
  availableTo: '',
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
  const city = String(draft.city || '').trim();
  if (!city || !isAllowedRdcCity(city)) return 'city';
  if (!findRdcCommune(city, draft.commune)) return 'commune';
  const quartier = String(draft.neighborhood || '').trim();
  if (!quartier || !neighborhoodsFor(city, draft.commune).includes(quartier)) return 'neighborhood';
  if (!hasValidGps(draft.latitude, draft.longitude)) return 'map';
  return null;
}

export function appendCatalogueGeoParams(params: URLSearchParams, filters: CatalogueGeoState) {
  if (filters.city.trim()) params.set('city', filters.city.trim());
  if (filters.proximity !== 'near') {
    if (filters.commune.trim()) params.set('commune', filters.commune.trim());
    if (filters.neighborhood.trim()) params.set('neighborhood', filters.neighborhood.trim());
  }
  if (filters.street.trim()) params.set('street', filters.street.trim());
  if (filters.minPrice.trim()) params.set('minPrice', filters.minPrice.trim());
  if (filters.maxPrice.trim()) params.set('maxPrice', filters.maxPrice.trim());
  if (filters.minCapacity.trim()) params.set('minCapacity', filters.minCapacity.trim());
  if (filters.maxCapacity.trim()) params.set('maxCapacity', filters.maxCapacity.trim());
  if (filters.availableFrom.trim()) params.set('availableFrom', filters.availableFrom.trim());
  if (filters.availableTo.trim()) params.set('availableTo', filters.availableTo.trim());
  if (filters.proximity && filters.lat != null && filters.lng != null) {
    params.set('lat', String(filters.lat));
    params.set('lng', String(filters.lng));
    params.set('radiusKm', String(clampRadiusKm(filters.radiusKm)));
  }
}

export function catalogueGeoChips(
  filters: CatalogueGeoState,
  extra: Array<{ id: string; label: string; value: string }> = [],
): Array<{ id: string; label: string; value: string }> {
  const next: Array<{ id: string; label: string; value: string }> = [];
  if (filters.city.trim()) next.push({ id: 'city', label: 'Ville', value: filters.city.trim() });
  if (filters.proximity !== 'near') {
    if (filters.commune.trim()) next.push({ id: 'commune', label: 'Commune', value: filters.commune.trim() });
    if (filters.neighborhood.trim()) next.push({ id: 'neighborhood', label: 'Quartier', value: filters.neighborhood.trim() });
  }
  if (filters.street.trim()) next.push({ id: 'street', label: 'Avenue', value: filters.street.trim() });
  if (filters.minPrice.trim()) next.push({ id: 'minPrice', label: 'Prix min', value: `${filters.minPrice.trim()} FC` });
  if (filters.maxPrice.trim()) next.push({ id: 'maxPrice', label: 'Prix max', value: `${filters.maxPrice.trim()} FC` });
  if (filters.minCapacity.trim()) next.push({ id: 'minCapacity', label: 'Places min', value: filters.minCapacity.trim() });
  if (filters.maxCapacity.trim()) next.push({ id: 'maxCapacity', label: 'Places max', value: filters.maxCapacity.trim() });
  if (filters.availableFrom.trim() || filters.availableTo.trim()) {
    const from = filters.availableFrom.trim();
    const to = filters.availableTo.trim() || from;
    const start = from || to;
    next.push({
      id: 'availability',
      label: 'Disponible',
      value: !to || start === to ? formatDateKeyFr(start) : `${formatDateKeyFr(start)} → ${formatDateKeyFr(to)}`,
    });
  }
  if (filters.proximity === 'around') {
    next.push({ id: 'proximity', label: 'Autour de moi', value: `${filters.radiusKm} km` });
  } else if (filters.proximity === 'near') {
    next.push({
      id: 'proximity',
      label: 'Près de',
      value: [filters.neighborhood.trim(), filters.commune.trim(), `${filters.radiusKm} km`].filter(Boolean).join(' · '),
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
  if (id === 'availability') {
    return { ...filters, availableFrom: '', availableTo: '' };
  }
  if (id in filters) {
    return { ...filters, [id]: id === 'radiusKm' ? 10 : '' };
  }
  return filters;
}

export async function resolveCatalogueGeo(filters: CatalogueGeoState): Promise<CatalogueGeoState> {
  const radiusKm = clampRadiusKm(filters.radiusKm);
  if (filters.proximity === 'around') {
    const pos = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        reject(new Error('La géolocalisation n’est pas disponible sur cet appareil.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        (err) => {
          if (err.code === 1) reject(new Error('Autorisez la localisation pour filtrer autour de vous.'));
          else if (err.code === 3) reject(new Error('Localisation trop lente. Réessayez ou cherchez près d’un lieu.'));
          else reject(new Error('Impossible de lire votre position GPS.'));
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
      );
    });
    const { cityForPoint, normalizeRdcCity } = await import('@/lib/rdcCities');
    const here = cityForPoint(pos.lat, pos.lng);
    if (!here) {
      throw new Error('Votre GPS est hors Kinshasa et Lubumbashi. Choisissez une ville, puis « Près d’un lieu ».');
    }
    const selected = normalizeRdcCity(filters.city);
    if (selected && selected !== here.name) {
      throw new Error(`Votre position est à ${here.name}. Changez la ville du filtre, ou cherchez près d’un lieu.`);
    }
    return { ...filters, city: selected || here.name, lat: pos.lat, lng: pos.lng, radiusKm };
  }
  if (filters.proximity === 'near') {
    const { findRdcCity, findRdcCommune, neighborhoodsFor } = await import('@/lib/rdcCities');
    const cityMeta = findRdcCity(filters.city);
    if (!cityMeta) {
      throw new Error('Choisissez Kinshasa ou Lubumbashi pour chercher près d’un lieu.');
    }
    const commune = findRdcCommune(cityMeta.name, filters.commune);
    if (!commune) {
      throw new Error('Choisissez une commune dans la liste.');
    }
    const quartier = String(filters.neighborhood || '').trim();
    if (quartier && !neighborhoodsFor(cityMeta.name, commune.name).includes(quartier)) {
      throw new Error('Choisissez un quartier dans la liste de cette commune.');
    }
    return {
      ...filters,
      nearPlace: '',
      lat: commune.center.lat,
      lng: commune.center.lng,
      radiusKm,
    };
  }
  return { ...filters, lat: null, lng: null, radiusKm };
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
  photos?: string[];
  priceFromFc: number | null;
  priceUnitLabel: string;
  latitude: number | null;
  longitude: number | null;
  coverageRadiusKm?: number | null;
  travels?: boolean;
  capacity?: number | null;
  quotaMin?: number | null;
  quotaMax?: number | null;
  address?: string | null;
  distanceKm?: number | null;
}

export function dashboardVenueHref(slug: string) {
  return `/dashboard/catalogue/salles/${slug}`;
}

export function dashboardServiceHref(slug: string) {
  return `/dashboard/catalogue/prestataires/${slug}`;
}

export function withDashboardListingHref(item: CatalogueItem): CatalogueItem {
  return {
    ...item,
    href: item.kind === 'venue' ? dashboardVenueHref(item.slug) : dashboardServiceHref(item.slug),
  };
}

export function venueToCatalogueItem(venue: PublicVenue): CatalogueItem {
  return {
    kind: 'venue',
    id: `venue:${venue.slug}`,
    slug: venue.slug,
    href: `/marketplace/salles/${venue.slug}`,
    title: venue.headline,
    orgName: venue.orgName,
    categoryLabel: roomTypeLabels[venue.roomType] || 'Salle',
    location: formatLocationLine(venue),
    coverUrl: venue.coverUrl,
    photos: venue.photos || [],
    priceFromFc: venue.priceFromFc,
    priceUnitLabel: venue.priceUnitLabel,
    latitude: venue.latitude,
    longitude: venue.longitude,
    capacity: venue.capacity,
    quotaMin: venue.quotaMin ?? null,
    quotaMax: venue.quotaMax ?? null,
    address: venue.address,
    distanceKm: venue.distanceKm ?? null,
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
    location: formatLocationLine(service),
    coverUrl: service.coverUrl,
    photos: service.photos || [],
    priceFromFc: service.priceFromFc,
    priceUnitLabel: service.priceUnitLabel,
    latitude: service.latitude ?? null,
    longitude: service.longitude ?? null,
    coverageRadiusKm: service.travels === false ? null : service.coverageRadiusKm,
    travels: service.travels ?? Boolean(service.coverageRadiusKm && service.coverageRadiusKm > 0),
    quotaMin: service.quotaMin ?? null,
    quotaMax: service.quotaMax ?? null,
    distanceKm: service.distanceKm ?? null,
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
    photos: (item.photos || []).filter(Boolean),
    priceLabel: item.priceFromFc != null ? `Dès ${formatFc(item.priceFromFc)}` : 'Sur devis',
    priceUnitLabel: item.priceUnitLabel,
    categoryLabel: item.kind === 'venue' ? 'Salle' : item.categoryLabel,
    orgName: item.orgName,
    location: item.location || undefined,
    address: item.address || undefined,
    coverageRadiusKm: item.coverageRadiusKm ?? null,
    travels: item.kind === 'service'
      ? (item.travels ?? Boolean(item.coverageRadiusKm && item.coverageRadiusKm > 0))
      : undefined,
    capacity: item.capacity ?? null,
    quotaLabel: formatQuotaLabel(item.quotaMin, item.quotaMax),
    distanceKm: item.distanceKm ?? null,
    roomTypeLabel: item.kind === 'venue' ? item.categoryLabel : null,
  };
}
