import { roomTypeLabels, type RoomType } from '@/lib/roomLayoutUtils';
import { formatFc } from '@/config/landingPricing';
import { findRdcCommune, isAllowedRdcCity, neighborhoodsFor, pointInRdcCity } from '@/lib/rdcCities';
import { eventPublicHref } from '@/lib/safeAppPath';

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
  | 'BEAUTY_HAIR'
  | 'EVENT_PLANNER'
  | 'ENTERTAINMENT'
  | 'OFFICIANT'
  | 'CHILDCARE'
  | 'AV_TECHNICIAN'
  | 'STATIONERY'
  | 'OTHER'
  | 'RENTAL_CLOTHING_MEN'
  | 'RENTAL_CLOTHING_WOMEN'
  | 'RENTAL_CLOTHING_CHILD'
  | 'RENTAL_CAR'
  | 'RENTAL_MOTO'
  | 'RENTAL_EQUIPMENT'
  | 'RENTAL_FURNITURE'
  | 'RENTAL_AV'
  | 'RENTAL_TABLEWARE'
  | 'RENTAL_DECOR'
  | 'RENTAL_TENT';

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
  orgSlug?: string | null;
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

export const ACCOUNT_KIND_FILTER_LABELS: Record<TenantAccountKind, string> = {
  ORGANIZER: 'Organisateur',
  VENDOR: 'Salle / presta',
  BOTH: 'Mixte',
  CLIENT: 'Client',
};

export const ACCOUNT_KIND_DESCRIPTIONS: Record<TenantAccountKind, string> = {
  ORGANIZER: 'Créer, inviter, accueillir. Modèles, plan de table, QR.',
  VENDOR: 'Publier une fiche, recevoir des devis, bloquer les dates.',
  BOTH: 'Organiser et publier, dans le même compte.',
  CLIENT: 'Chercher, composer un pack, demander un devis. Gratuit.',
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
  BEAUTY_HAIR: 'Beauté / Coiffure',
  EVENT_PLANNER: 'Organisateur / Wedding Planner',
  ENTERTAINMENT: 'Animation / Groupe de musique',
  OFFICIANT: 'Officiant de cérémonie',
  CHILDCARE: 'Garde d\'enfants',
  AV_TECHNICIAN: 'Technicien son et lumière',
  STATIONERY: 'Papeterie & Faire-part',
  OTHER: 'Autre prestation',
  RENTAL_CLOTHING_MEN: 'Location habits homme',
  RENTAL_CLOTHING_WOMEN: 'Location habits femme',
  RENTAL_CLOTHING_CHILD: 'Location habits enfant',
  RENTAL_CAR: 'Location voiture',
  RENTAL_MOTO: 'Location moto',
  RENTAL_EQUIPMENT: 'Location matériel divers',
  RENTAL_FURNITURE: 'Location mobilier & chaises',
  RENTAL_AV: 'Location matériel audiovisuel',
  RENTAL_TABLEWARE: 'Location vaisselle & linge de table',
  RENTAL_DECOR: 'Location matériel de décoration',
  RENTAL_TENT: 'Location tentes & chapiteaux',
};

export const SERVICE_TRADE_CATEGORIES: ServiceCategory[] = [
  'CATERING', 'PHOTOGRAPHY', 'VIDEO', 'DJ', 'DECORATION',
  'SECURITY', 'FLORIST', 'TRANSPORT', 'MC', 'BEAUTY_HAIR',
  'EVENT_PLANNER', 'ENTERTAINMENT', 'OFFICIANT', 'CHILDCARE',
  'AV_TECHNICIAN', 'STATIONERY', 'OTHER',
];

export const SERVICE_RENTAL_CATEGORIES: ServiceCategory[] = [
  'RENTAL_CLOTHING_MEN', 'RENTAL_CLOTHING_WOMEN', 'RENTAL_CLOTHING_CHILD',
  'RENTAL_CAR', 'RENTAL_MOTO', 'RENTAL_EQUIPMENT', 'RENTAL_FURNITURE',
  'RENTAL_AV', 'RENTAL_TABLEWARE', 'RENTAL_DECOR', 'RENTAL_TENT',
];

export const SERVICE_CATEGORIES = [...SERVICE_TRADE_CATEGORIES, ...SERVICE_RENTAL_CATEGORIES];

export type ServiceCategoryMeta = {
  group: 'trade' | 'rental';
  hint: string;
  defaultUnit: VenuePriceUnit;
  units: VenuePriceUnit[];
};

export const SERVICE_CATEGORY_META: Record<ServiceCategory, ServiceCategoryMeta> = {
  CATERING: {
    group: 'trade',
    hint: 'Buffet, menu assis ou grillade. Le tarif se calcule souvent par personne.',
    defaultUnit: 'PERSON',
    units: ['PERSON', 'EVENT', 'QUOTA'],
  },
  PHOTOGRAPHY: {
    group: 'trade',
    hint: 'Reportage mariage, portraits ou couverture de gala.',
    defaultUnit: 'EVENT',
    units: ['EVENT', 'HOUR', 'DAY'],
  },
  VIDEO: {
    group: 'trade',
    hint: 'Film de cérémonie, aftermovie ou captation live.',
    defaultUnit: 'EVENT',
    units: ['EVENT', 'HOUR', 'DAY'],
  },
  DJ: {
    group: 'trade',
    hint: 'Animation, sono et éclairage. Possible à l’heure ou à la soirée.',
    defaultUnit: 'EVENT',
    units: ['EVENT', 'HOUR', 'DAY'],
  },
  DECORATION: {
    group: 'trade',
    hint: 'Scénographie, arche, backdrop — généralement au forfait événement.',
    defaultUnit: 'EVENT',
    units: ['EVENT', 'DAY'],
  },
  SECURITY: {
    group: 'trade',
    hint: 'Agents d’accueil, VIP ou parking. Souvent à la journée ou à l’événement.',
    defaultUnit: 'DAY',
    units: ['DAY', 'EVENT', 'HOUR'],
  },
  FLORIST: {
    group: 'trade',
    hint: 'Bouquets, centres de table et décor église.',
    defaultUnit: 'EVENT',
    units: ['EVENT', 'PERSON'],
  },
  TRANSPORT: {
    group: 'trade',
    hint: 'Navette invités, cortège ou transfert aéroport.',
    defaultUnit: 'DAY',
    units: ['DAY', 'EVENT', 'HOUR'],
  },
  MC: {
    group: 'trade',
    hint: 'Maître de cérémonie ou animation protocole.',
    defaultUnit: 'EVENT',
    units: ['EVENT', 'HOUR'],
  },
  BEAUTY_HAIR: {
    group: 'trade',
    hint: 'Maquillage, coiffure ou soins pour le jour J.',
    defaultUnit: 'EVENT',
    units: ['EVENT', 'PERSON', 'HOUR'],
  },
  EVENT_PLANNER: {
    group: 'trade',
    hint: 'Organisation complète, wedding planner ou coordination.',
    defaultUnit: 'EVENT',
    units: ['EVENT', 'DAY'],
  },
  ENTERTAINMENT: {
    group: 'trade',
    hint: 'Groupe de musique, chanteur, magicien ou danseurs.',
    defaultUnit: 'EVENT',
    units: ['EVENT', 'HOUR'],
  },
  OFFICIANT: {
    group: 'trade',
    hint: 'Célébrant pour cérémonie laïque ou religieuse.',
    defaultUnit: 'EVENT',
    units: ['EVENT', 'HOUR'],
  },
  CHILDCARE: {
    group: 'trade',
    hint: 'Garde d\'enfants, baby-sitters, animations enfants.',
    defaultUnit: 'HOUR',
    units: ['HOUR', 'EVENT', 'DAY'],
  },
  AV_TECHNICIAN: {
    group: 'trade',
    hint: 'Ingénieur du son, technicien lumière ou régisseur.',
    defaultUnit: 'DAY',
    units: ['DAY', 'EVENT', 'HOUR'],
  },
  STATIONERY: {
    group: 'trade',
    hint: 'Création et impression de faire-parts, menus, signalétique.',
    defaultUnit: 'QUOTA',
    units: ['QUOTA', 'EVENT'],
  },
  OTHER: {
    group: 'trade',
    hint: 'Coordination jour J, photobooth, générateur…',
    defaultUnit: 'EVENT',
    units: ['EVENT', 'DAY', 'HOUR', 'PERSON', 'QUOTA'],
  },
  RENTAL_CLOTHING_MEN: {
    group: 'rental',
    hint: 'Costume, smoking ou tenue traditionnelle — souvent pour l’événement.',
    defaultUnit: 'EVENT',
    units: ['EVENT', 'DAY'],
  },
  RENTAL_CLOTHING_WOMEN: {
    group: 'rental',
    hint: 'Robe de soirée, mariée ou cocktail.',
    defaultUnit: 'EVENT',
    units: ['EVENT', 'DAY'],
  },
  RENTAL_CLOTHING_CHILD: {
    group: 'rental',
    hint: 'Cortège, baptême ou cérémonie enfant.',
    defaultUnit: 'EVENT',
    units: ['EVENT', 'DAY'],
  },
  RENTAL_CAR: {
    group: 'rental',
    hint: 'Berline, 4x4 ou limousine, avec ou sans chauffeur.',
    defaultUnit: 'DAY',
    units: ['DAY', 'HOUR', 'EVENT'],
  },
  RENTAL_MOTO: {
    group: 'rental',
    hint: 'Moto ou scooter pour cortège ou staff.',
    defaultUnit: 'DAY',
    units: ['DAY', 'HOUR', 'EVENT'],
  },
  RENTAL_EQUIPMENT: {
    group: 'rental',
    hint: 'Générateur, climatisation, matériel divers.',
    defaultUnit: 'DAY',
    units: ['DAY', 'EVENT', 'HOUR'],
  },
  RENTAL_FURNITURE: {
    group: 'rental',
    hint: 'Chaises, tables, mange-debout, canapés.',
    defaultUnit: 'DAY',
    units: ['DAY', 'EVENT'],
  },
  RENTAL_AV: {
    group: 'rental',
    hint: 'Sonorisation, micros, écrans, projecteurs, jeux de lumière.',
    defaultUnit: 'DAY',
    units: ['DAY', 'EVENT'],
  },
  RENTAL_TABLEWARE: {
    group: 'rental',
    hint: 'Assiettes, verres, couverts, nappes, serviettes.',
    defaultUnit: 'DAY',
    units: ['DAY', 'EVENT', 'PERSON'],
  },
  RENTAL_DECOR: {
    group: 'rental',
    hint: 'Arches, vases, tapis, chandeliers, mobilier décoratif.',
    defaultUnit: 'DAY',
    units: ['DAY', 'EVENT'],
  },
  RENTAL_TENT: {
    group: 'rental',
    hint: 'Chapiteaux, tentes de réception, barnums.',
    defaultUnit: 'DAY',
    units: ['DAY', 'EVENT'],
  },
};

export function unitsForServiceCategory(category?: string | null): VenuePriceUnit[] {
  if (category && category in SERVICE_CATEGORY_META) {
    return SERVICE_CATEGORY_META[category as ServiceCategory].units;
  }
  return ['EVENT', 'DAY', 'HOUR', 'MINUTE', 'PERSON', 'QUOTA'];
}

export function defaultUnitForServiceCategory(category?: string | null): VenuePriceUnit {
  if (category && category in SERVICE_CATEGORY_META) {
    return SERVICE_CATEGORY_META[category as ServiceCategory].defaultUnit;
  }
  return 'EVENT';
}

export function isServiceRentalCategory(category?: string | null): boolean {
  return Boolean(category && (SERVICE_RENTAL_CATEGORIES as string[]).includes(category));
}

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
  kind: 'venue' | 'service' | 'rental';
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
  vendorName?: string | null;
  vendorSlug?: string | null;
  listingSlug?: string | null;
  offeringSlug?: string | null;
  offeringCategory?: string | null;
  viewerRole?: 'vendor' | 'organizer';
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

export function coverFromMedia(urls: string[]): string | null {
  const image = urls.find((item) => !isVideoUrl(item));
  if (image) return image;
  return urls[0] ? mediaPosterUrl(urls[0]) : null;
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
  offeringCategory?: string | null;
  vendorTenantId: string;
  organizerTenantId: string | null;
  vendorName: string;
  vendorSlug?: string | null;
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

export function bookingNextStep(
  item: MarketplaceBookingItem,
  depositPct = Math.round(MARKETPLACE_DEPOSIT_RATE * 100),
): { title: string; detail: string } {
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
      ? { title: 'Acompte à marquer', detail: `Quand les ${depositPct} % sont versés hors plateforme, marquez l’acompte reçu.` }
      : { title: 'Acompte à verser', detail: `Versez ${depositPct} % au professionnel hors EventMaster.` };
  }
  return isVendor
    ? { title: 'À confirmer', detail: 'Confirmez pour bloquer la date au calendrier.' }
    : { title: 'Confirmation en cours', detail: 'L’acompte est marqué. Le professionnel va bloquer la date.' };
}

export function inquiryNextStep(item: MarketplaceInquiryItem): { title: string; detail: string } {
  const asOrganizer = item.viewerRole === 'organizer';
  if (item.hasBooking) {
    return asOrganizer
      ? { title: 'Réservation créée', detail: 'Suivez l’acompte et la confirmation dans l’onglet Réservations.' }
      : { title: 'Déjà convertie', detail: 'Une réservation existe déjà pour cette demande.' };
  }
  if (item.status === 'NEW') {
    return asOrganizer
      ? { title: 'Envoyée', detail: 'Le professionnel n’a pas encore répondu. Vous pouvez déjà réserver si un tarif est publié.' }
      : item.eventDate
        ? { title: 'Nouveau devis', detail: 'Contactez le client, puis convertissez en réservation si la date convient.' }
        : { title: 'Nouveau devis', detail: 'Contactez le client, puis marquez la demande comme contactée.' };
  }
  if (asOrganizer) {
    return { title: 'Prise en charge', detail: 'Le professionnel vous a contacté. Réservez depuis l’événement si un tarif est publié.' };
  }
  return item.eventDate
    ? { title: 'Prêt à réserver', detail: 'Convertissez cette demande en réservation pour suivre l’acompte et bloquer la date.' }
    : { title: 'Contacté', detail: 'Pas de date indiquée : convenez d’un jour avant de créer une réservation.' };
}

export type PrepListingPipeline = {
  stage: 'none' | 'inquiry' | 'booking';
  label: string;
  tone: 'slate' | 'amber' | 'sky' | 'emerald' | 'rose';
  inquiry: MarketplaceInquiryItem | null;
  booking: MarketplaceBookingItem | null;
};

export function listingMatchesPrepSlug(
  item: { listingSlug?: string | null; offeringSlug?: string | null },
  slug: string,
  kind: 'venue' | 'service',
): boolean {
  return kind === 'venue' ? item.listingSlug === slug : item.offeringSlug === slug;
}

export function matchPrepListingPipeline(
  slug: string,
  kind: 'venue' | 'service',
  inquiries: MarketplaceInquiryItem[],
  bookings: MarketplaceBookingItem[],
): PrepListingPipeline {
  const relatedBookings = bookings.filter((item) => listingMatchesPrepSlug(item, slug, kind));
  const booking =
    relatedBookings.find((item) => item.status !== 'CANCELLED')
    || relatedBookings[0]
    || null;
  const inquiry = inquiries.find((item) => listingMatchesPrepSlug(item, slug, kind)) || null;

  if (booking && booking.status !== 'CANCELLED') {
    if (booking.status === 'REQUESTED') {
      return { stage: 'booking', label: 'Réservation demandée', tone: 'amber', inquiry, booking };
    }
    if (booking.status === 'ACCEPTED' && !booking.depositMarkedAt) {
      return { stage: 'booking', label: 'Acompte à verser', tone: 'sky', inquiry, booking };
    }
    if (booking.status === 'ACCEPTED') {
      return { stage: 'booking', label: 'Acompte marqué', tone: 'sky', inquiry, booking };
    }
    if (booking.status === 'COMPLETED') {
      return { stage: 'booking', label: 'Terminée', tone: 'emerald', inquiry, booking };
    }
    return { stage: 'booking', label: 'Confirmée', tone: 'emerald', inquiry, booking };
  }

  if (inquiry) {
    return {
      stage: 'inquiry',
      label: inquiry.status === 'CONTACTED' ? 'Devis pris en charge' : 'Devis envoyé',
      tone: inquiry.status === 'CONTACTED' ? 'sky' : 'amber',
      inquiry,
      booking: null,
    };
  }

  return { stage: 'none', label: 'Pas de devis', tone: 'slate', inquiry: null, booking: null };
}

export function prepListingCanBook(priceFromFc?: number | null, pipeline?: PrepListingPipeline | null): boolean {
  if (priceFromFc == null || !Number.isFinite(priceFromFc) || priceFromFc < 0) return false;
  return pipeline?.stage !== 'booking';
}

export function vendorMatchesPrepGroup(
  item: { vendorSlug?: string | null; vendorName?: string | null },
  group: { orgSlug?: string | null; orgName: string },
): boolean {
  if (group.orgSlug && item.vendorSlug) return item.vendorSlug === group.orgSlug;
  const name = (item.vendorName || '').trim().toLowerCase();
  return Boolean(name) && name === group.orgName.trim().toLowerCase();
}

export function extraPrepVendorItems(
  group: { orgSlug?: string | null; orgName: string },
  retainedSlugs: Set<string>,
  inquiries: MarketplaceInquiryItem[],
  bookings: MarketplaceBookingItem[],
): { inquiries: MarketplaceInquiryItem[]; bookings: MarketplaceBookingItem[] } {
  return {
    inquiries: inquiries.filter((item) => {
      const slug = item.listingSlug || item.offeringSlug;
      if (!slug || retainedSlugs.has(slug) || item.hasBooking) return false;
      return vendorMatchesPrepGroup(item, group);
    }),
    bookings: bookings.filter((item) => {
      const slug = item.listingSlug || item.offeringSlug;
      if (!slug || retainedSlugs.has(slug) || item.status === 'CANCELLED') return false;
      return vendorMatchesPrepGroup(item, group);
    }),
  };
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

export function previewMarketplaceAmounts(
  amountFc: number,
  dayCount = 1,
  priceUnit?: string | null,
  rates?: { commissionRate?: number; depositRate?: number },
) {
  const days = Math.max(1, dayCount);
  const amount = Math.max(0, Math.round(priceUnit === 'DAY' ? amountFc * days : amountFc));
  const depositRate = rates?.depositRate ?? MARKETPLACE_DEPOSIT_RATE;
  const commissionRate = rates?.commissionRate ?? MARKETPLACE_COMMISSION_RATE;
  return {
    amountFc: amount,
    depositFc: Math.round(amount * depositRate),
    commissionFc: Math.round(amount * commissionRate),
  };
}

export const PRICE_UNIT_OPTIONS: Array<{ id: VenuePriceUnit; label: string; hint: string }> = [
  { id: 'EVENT', label: 'Par événement', hint: 'Un forfait pour toute la prestation ou la location.' },
  { id: 'DAY', label: 'Par jour', hint: 'Journée civile (voiture, chapiteau, sécurité…).' },
  { id: 'HOUR', label: 'Par heure', hint: 'DJ, photo, moto, salle de conférence…' },
  { id: 'MINUTE', label: 'Par minute', hint: 'Rare : studio, captation courte.' },
  { id: 'PERSON', label: 'Par personne', hint: 'Traiteur, cocktail, bouquet par invité.' },
  { id: 'QUOTA', label: 'Par quota d’invités', hint: 'Forfait selon une fourchette de convives.' },
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
  if (filters.commune.trim()) params.set('commune', filters.commune.trim());
  if (filters.neighborhood.trim()) params.set('neighborhood', filters.neighborhood.trim());
  if (filters.street.trim()) params.set('street', filters.street.trim());
  if (filters.minPrice.trim()) params.set('minPrice', filters.minPrice.trim());
  if (filters.maxPrice.trim()) params.set('maxPrice', filters.maxPrice.trim());
  if (filters.minCapacity.trim()) params.set('minCapacity', filters.minCapacity.trim());
  if (filters.maxCapacity.trim()) params.set('maxCapacity', filters.maxCapacity.trim());
  if (filters.availableFrom.trim()) params.set('availableFrom', filters.availableFrom.trim());
  if (filters.availableTo.trim()) params.set('availableTo', filters.availableTo.trim());
  if (filters.proximity) {
    params.set('radiusKm', String(clampRadiusKm(filters.radiusKm)));
  }
  if (filters.proximity && filters.lat != null && filters.lng != null) {
    params.set('lat', String(filters.lat));
    params.set('lng', String(filters.lng));
  }
}

export function catalogueGeoChips(
  filters: CatalogueGeoState,
  extra: Array<{ id: string; label: string; value: string; tone?: 'venue' | 'service' | 'event' | 'neutral' }> = [],
): Array<{ id: string; label: string; value: string; tone?: 'venue' | 'service' | 'event' | 'neutral' }> {
  const next: Array<{ id: string; label: string; value: string }> = [];
  if (filters.city.trim()) next.push({ id: 'city', label: 'Ville', value: filters.city.trim() });
  if (filters.commune.trim()) next.push({ id: 'commune', label: 'Commune', value: filters.commune.trim() });
  if (filters.neighborhood.trim()) next.push({ id: 'neighborhood', label: 'Quartier', value: filters.neighborhood.trim() });
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
    next.push({ id: 'proximity', label: 'Rayon', value: `${filters.radiusKm} km` });
  }
  return [...next, ...extra];
}

const GEO_CHIP_IDS = new Set([
  'city',
  'commune',
  'neighborhood',
  'street',
  'minPrice',
  'maxPrice',
  'minCapacity',
  'maxCapacity',
  'availability',
  'proximity',
  'radiusKm',
  'nearPlace',
]);

export function clearCatalogueGeoChip<T extends CatalogueGeoState>(filters: T, id: string): T {
  if (id === 'proximity') {
    return { ...filters, proximity: '', nearPlace: '', lat: null, lng: null };
  }
  if (id === 'radiusKm') {
    return { ...filters, radiusKm: 10 };
  }
  if (id === 'availability') {
    return { ...filters, availableFrom: '', availableTo: '' };
  }
  if (GEO_CHIP_IDS.has(id) && id in filters) {
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

export type CatalogueKind = 'venue' | 'service' | 'event';
export type CatalogueDisplayKind = CatalogueKind | 'rental';
export type CatalogueViewMode = 'grid' | 'list' | 'map' | 'focus';

export function catalogueItemDisplayKind(item: Pick<CatalogueItem, 'kind' | 'category'>): CatalogueDisplayKind {
  if (item.kind === 'service' && isServiceRentalCategory(item.category)) return 'rental';
  return item.kind;
}

export function catalogueKindLabel(kind?: CatalogueDisplayKind | string | null): string {
  if (kind === 'rental') return 'Location';
  if (kind === 'service') return 'Métier';
  if (kind === 'event') return 'Événement';
  return 'Salle';
}

export function catalogueKindFilterLabel(kind?: CatalogueKind | 'all' | 'rental' | string | null): string {
  if (kind === 'venue') return 'Salles';
  if (kind === 'service') return 'Métiers';
  if (kind === 'rental') return 'Locations';
  if (kind === 'event') return 'Événements';
  return 'Tous';
}

/** Pastille courte sur un pin (jamais « Presta », trop ambigu avec les locations). */
export function catalogueKindChipLabel(kind?: CatalogueDisplayKind | string | null): string {
  if (kind === 'rental') return 'Location';
  if (kind === 'service') return 'Métier';
  if (kind === 'event') return 'Évén.';
  return 'Salle';
}

export function catalogueKindHint(kind?: CatalogueDisplayKind | string | null): string {
  if (kind === 'service') return 'La personne — DJ, photo, traiteur…';
  if (kind === 'rental') return 'Le bien — habits, véhicule, matériel…';
  if (kind === 'venue') return 'Le lieu de l’événement';
  if (kind === 'event') return 'Fête, concert, gala…';
  return '';
}

export function catalogueKindAccent(kind?: CatalogueDisplayKind | string | null): {
  iconBox: string;
  badge: string;
  cover: string;
  border: string;
  bar: string;
} {
  if (kind === 'service') {
    return {
      iconBox: 'bg-[color:var(--festive-accent)] text-white',
      badge: 'bg-[color:var(--festive-accent)] text-white',
      cover: 'bg-[color:var(--festive-accent)]/15 text-[color:var(--festive-accent)]',
      border: 'border-[color:var(--festive-accent)]/35 hover:border-[color:var(--festive-accent)]/70',
      bar: 'bg-[color:var(--festive-accent)]',
    };
  }
  if (kind === 'rental') {
    return {
      iconBox: 'bg-cyan-700 text-white',
      badge: 'bg-cyan-700 text-white',
      cover: 'bg-cyan-50 text-cyan-800',
      border: 'border-cyan-400/60 hover:border-cyan-600',
      bar: 'bg-cyan-700',
    };
  }
  if (kind === 'event') {
    return {
      iconBox: 'bg-emerald-600 text-white',
      badge: 'bg-emerald-600 text-white',
      cover: 'bg-emerald-50 text-emerald-700',
      border: 'border-emerald-400/60 hover:border-emerald-600',
      bar: 'bg-emerald-600',
    };
  }
  return {
    iconBox: 'bg-primary text-white',
    badge: 'bg-primary text-white',
    cover: 'bg-primary/12 text-primary',
    border: 'border-primary/30 hover:border-primary/60',
    bar: 'bg-primary',
  };
}

export const CATALOGUE_DISPLAY_KIND_ORDER: CatalogueDisplayKind[] = ['venue', 'service', 'rental', 'event'];

export function groupCatalogueItemsByDisplayKind<T extends Pick<CatalogueItem, 'kind' | 'category'>>(
  items: T[],
): Array<{ kind: CatalogueDisplayKind; items: T[] }> {
  return CATALOGUE_DISPLAY_KIND_ORDER
    .map((kind) => ({
      kind,
      items: items.filter((item) => catalogueItemDisplayKind(item) === kind),
    }))
    .filter((group) => group.items.length > 0);
}

/** Alterne salles / métiers / locations / événements pour qu’une page du hub ne montre pas un seul type. */
export function mixCatalogueByDisplayKind<T extends Pick<CatalogueItem, 'kind' | 'category'> & { distanceKm?: number | null }>(
  items: T[],
): T[] {
  const groups = groupCatalogueItemsByDisplayKind(items).map((group) => ({
    ...group,
    items: sortCatalogueByDistance(group.items),
  }));
  const max = Math.max(0, ...groups.map((group) => group.items.length));
  const mixed: T[] = [];
  for (let i = 0; i < max; i += 1) {
    for (const group of groups) {
      const item = group.items[i];
      if (item) mixed.push(item);
    }
  }
  return mixed;
}

export function cataloguePriceCaption(item: Pick<CatalogueItem, 'kind' | 'priceFromFc' | 'priceUnitLabel'>): string {
  if (item.kind === 'event') {
    if (item.priceFromFc != null && item.priceFromFc > 0) return formatFc(item.priceFromFc);
    return 'Entrée libre';
  }
  return item.priceFromFc != null ? `Dès ${formatFc(item.priceFromFc)}` : 'Sur devis';
}

export function isCatalogueMapView(mode: CatalogueViewMode): mode is 'map' | 'focus' {
  return mode === 'map' || mode === 'focus';
}

export interface PublicEventPost {
  id: string;
  content: string | null;
  media: Array<{ url: string; type: 'IMAGE' | 'VIDEO' }>;
  createdAt: string;
}

export interface PublicEventCard {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  date: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  orgName: string;
  ticketingEnabled: boolean;
  ticketPriceFc: number;
  paid: boolean;
  ticketsTotal: number | null;
  ticketsSold: number;
  ticketsRemaining: number | null;
  soldOut: boolean;
  seatSelectionEnabled?: boolean;
  eventProgram?: unknown;
  photos?: string[];
  coverUrl?: string | null;
  posts?: PublicEventPost[];
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
  eventDate?: string | null;
  roomType?: RoomType;
  category?: ServiceCategory;
  priceUnit?: VenuePriceUnit;
}

/** Agenda client : événements publics dans le marketplace du tableau de bord. */
export const CLIENT_AGENDA_HREF = '/dashboard/catalogue?kind=event';

export function dashboardVenueHref(slug: string) {
  return `/dashboard/catalogue/salles/${slug}`;
}

export function publicServiceHref(slug: string, category?: string | null): string {
  return isServiceRentalCategory(category)
    ? `/marketplace/locations/${slug}`
    : `/marketplace/prestataires/${slug}`;
}

export function dashboardServiceHref(slug: string, category?: string | null) {
  return isServiceRentalCategory(category)
    ? `/dashboard/catalogue/locations/${slug}`
    : `/dashboard/catalogue/prestataires/${slug}`;
}

export function dashboardEventHref(slug: string) {
  return `/dashboard/catalogue/evenements/${slug}`;
}

export function withDashboardListingHref(item: CatalogueItem): CatalogueItem {
  if (item.kind === 'event') {
    return { ...item, href: dashboardEventHref(item.slug) };
  }
  return {
    ...item,
    href: item.kind === 'venue' ? dashboardVenueHref(item.slug) : dashboardServiceHref(item.slug, item.category),
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
    roomType: venue.roomType,
  };
}

export function eventToCatalogueItem(event: PublicEventCard): CatalogueItem | null {
  if (!event.slug) return null;
  const paid = event.paid || (event.ticketingEnabled && event.ticketPriceFc > 0);
  const dateLabel = event.date
    ? new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    : 'Événement';
  return {
    kind: 'event',
    id: `event:${event.slug}`,
    slug: event.slug,
    href: eventPublicHref(event.slug),
    title: event.title,
    orgName: event.orgName,
    categoryLabel: dateLabel,
    location: event.location,
    coverUrl: event.coverUrl || coverFromMedia(event.photos || []),
    photos: event.photos || [],
    priceFromFc: paid ? event.ticketPriceFc : null,
    priceUnitLabel: paid ? '/ personne' : 'Entrée libre',
    latitude: event.latitude ?? null,
    longitude: event.longitude ?? null,
    capacity: event.ticketsTotal ?? event.ticketsRemaining ?? null,
    address: event.location,
    eventDate: event.date,
  };
}

export function withCatalogueDistance(
  item: CatalogueItem,
  lat: number | null | undefined,
  lng: number | null | undefined,
): CatalogueItem {
  if (lat == null || lng == null || item.latitude == null || item.longitude == null) return item;
  return { ...item, distanceKm: haversineKm(lat, lng, item.latitude, item.longitude) };
}

export function catalogueItemMatchesGeo(item: CatalogueItem, filters: CatalogueGeoState): boolean {
  const loc = `${item.location || ''} ${item.address || ''}`.toLowerCase();
  const city = filters.city.trim().toLowerCase();
  const commune = filters.commune.trim().toLowerCase();
  const neighborhood = filters.neighborhood.trim().toLowerCase();
  if (city) {
    const inCity = item.latitude != null && item.longitude != null
      ? pointInRdcCity(item.latitude, item.longitude, filters.city)
      : loc.includes(city);
    if (!inCity) return false;
  }
  if (filters.proximity !== 'near') {
    if (commune && !loc.includes(commune)) return false;
    if (neighborhood && !loc.includes(neighborhood)) return false;
  }
  const street = filters.street.trim().toLowerCase();
  if (street && !loc.includes(street)) return false;
  const minP = Number(filters.minPrice);
  const maxP = Number(filters.maxPrice);
  if (filters.minPrice.trim() && Number.isFinite(minP) && (item.priceFromFc == null || item.priceFromFc < minP)) return false;
  if (filters.maxPrice.trim() && Number.isFinite(maxP) && (item.priceFromFc == null || item.priceFromFc > maxP)) return false;
  const minC = Number(filters.minCapacity);
  const maxC = Number(filters.maxCapacity);
  if (item.kind === 'venue' || item.kind === 'event') {
    if (filters.minCapacity.trim() && Number.isFinite(minC) && (item.capacity == null || item.capacity < minC)) return false;
    if (filters.maxCapacity.trim() && Number.isFinite(maxC) && (item.capacity == null || item.capacity > maxC)) return false;
  }
  if (filters.proximity && filters.lat != null && filters.lng != null) {
    if (item.latitude == null || item.longitude == null) return false;
    if (haversineKm(filters.lat, filters.lng, item.latitude, item.longitude) > filters.radiusKm) return false;
  }
  if (filters.availableFrom && item.eventDate && new Date(item.eventDate) < new Date(filters.availableFrom)) return false;
  if (filters.availableTo && item.eventDate && new Date(item.eventDate) > new Date(`${filters.availableTo}T23:59:59`)) {
    return false;
  }
  return true;
}

export function serviceToCatalogueItem(service: PublicService): CatalogueItem {
  return {
    kind: 'service',
    id: `service:${service.slug}`,
    slug: service.slug,
    href: publicServiceHref(service.slug, service.category),
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
    category: service.category,
    priceUnit: service.priceUnit,
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
    kind: catalogueItemDisplayKind(item),
    coverUrl: item.coverUrl,
    photos: (item.photos || []).filter(Boolean),
    priceLabel: cataloguePriceCaption(item),
    priceUnitLabel: item.priceUnitLabel,
    categoryLabel: item.kind === 'venue' ? 'Salle' : item.kind === 'event' ? 'Événement' : item.categoryLabel,
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
