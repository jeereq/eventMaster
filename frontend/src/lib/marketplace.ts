import type { RoomType } from '@/lib/roomLayoutUtils';

export type VenuePriceUnit = 'EVENT' | 'DAY' | 'HOUR';
export type TenantAccountKind = 'ORGANIZER' | 'VENDOR' | 'BOTH';

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
  VENDOR: 'Propriétaire de salles',
  BOTH: 'Les deux',
};

export const PRICE_UNIT_OPTIONS: Array<{ id: VenuePriceUnit; label: string }> = [
  { id: 'EVENT', label: 'Par événement' },
  { id: 'DAY', label: 'Par jour' },
  { id: 'HOUR', label: 'Par heure' },
];
