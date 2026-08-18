const AMENITY_IDS = new Set([
  'wifi', 'parking', 'ac', 'generator', 'sound', 'kitchen', 'stage', 'cloakroom',
  'accessible', 'garden', 'security', 'projector', 'toilets', 'lighting', 'bar',
  'gear', 'assistant', 'urgent', 'install', 'trial', 'makeup', 'backup',
  'sizes', 'fitting', 'delivery', 'driver', 'fuel', 'helmet', 'childSeat',
]);
const EVENT_IDS = new Set([
  'wedding', 'birthday', 'corporate', 'gala', 'religious', 'private', 'shooting',
]);

export type ListingDetails = {
  description: string;
  amenities: string[];
  eventTypes: string[];
  contactPhone: string;
  contactWhatsapp: string;
  included: string;
  parking: boolean;
  languages: string;
  minNoticeHours: string;
  openingHours: string;
  closingHours: string;
  surfaceM2: string;
  teamSize: string;
  experienceYears: string;
  houseRules: string;
  cancellation: string;
  extraFees: string;
  depositPercent: string;
  accessNotes: string;
  instagram: string;
};

function clip(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function clipNum(value: unknown, max = 8) {
  return value != null && value !== '' ? String(value).slice(0, max) : '';
}

export function parseListingDetails(input: unknown): ListingDetails {
  const raw = input && typeof input === 'object' && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {};
  const amenities = Array.isArray(raw.amenities)
    ? raw.amenities.filter((id): id is string => typeof id === 'string' && AMENITY_IDS.has(id))
    : [];
  const eventTypes = Array.isArray(raw.eventTypes)
    ? raw.eventTypes.filter((id): id is string => typeof id === 'string' && EVENT_IDS.has(id))
    : [];
  return {
    description: clip(raw.description, 4000),
    amenities,
    eventTypes,
    contactPhone: clip(raw.contactPhone, 40),
    contactWhatsapp: clip(raw.contactWhatsapp, 40),
    included: clip(raw.included, 2000),
    parking: Boolean(raw.parking),
    languages: clip(raw.languages, 120),
    minNoticeHours: clipNum(raw.minNoticeHours),
    openingHours: clip(raw.openingHours, 16),
    closingHours: clip(raw.closingHours, 16),
    surfaceM2: clipNum(raw.surfaceM2),
    teamSize: clipNum(raw.teamSize),
    experienceYears: clipNum(raw.experienceYears),
    houseRules: clip(raw.houseRules, 2000),
    cancellation: clip(raw.cancellation, 2000),
    extraFees: clip(raw.extraFees, 2000),
    depositPercent: clipNum(raw.depositPercent),
    accessNotes: clip(raw.accessNotes, 1000),
    instagram: clip(raw.instagram, 80),
  };
}
