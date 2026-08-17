import type { RoomType } from '@/lib/roomLayoutUtils';

export type VenuePriceUnit = 'EVENT' | 'DAY' | 'HOUR';
export type TenantAccountKind = 'ORGANIZER' | 'VENDOR' | 'BOTH';
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
  address: string | null;
  floor: string | null;
  capacity: number | null;
  roomType: RoomType;
  latitude: number | null;
  longitude: number | null;
  priceFromFc: number | null;
  priceUnit: VenuePriceUnit;
  priceUnitLabel: string;
  photos: string[];
  coverUrl: string | null;
  publishedAt: string | null;
  orgName: string;
  orgCity: string | null;
  layoutPreview?: unknown | null;
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
};

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
  coverageRadiusKm: number | null;
  priceFromFc: number | null;
  priceUnit: VenuePriceUnit;
  priceUnitLabel: string;
  photos: string[];
  coverUrl: string | null;
  publishedAt: string | null;
  orgName: string;
  orgSlug: string;
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
}

export const PRICE_UNIT_OPTIONS: Array<{ id: VenuePriceUnit; label: string }> = [
  { id: 'EVENT', label: 'Par événement' },
  { id: 'DAY', label: 'Par jour' },
  { id: 'HOUR', label: 'Par heure' },
];
