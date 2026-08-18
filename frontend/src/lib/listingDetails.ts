export type ListingAmenityId =
  | 'wifi'
  | 'parking'
  | 'ac'
  | 'generator'
  | 'sound'
  | 'kitchen'
  | 'stage'
  | 'cloakroom'
  | 'accessible'
  | 'garden'
  | 'security'
  | 'projector'
  | 'toilets'
  | 'lighting'
  | 'bar'
  | 'gear'
  | 'assistant'
  | 'urgent'
  | 'install'
  | 'trial'
  | 'makeup'
  | 'backup';

export type ListingEventTypeId =
  | 'wedding'
  | 'birthday'
  | 'corporate'
  | 'gala'
  | 'religious'
  | 'private'
  | 'shooting';

export type ListingDetails = {
  description: string;
  amenities: ListingAmenityId[];
  eventTypes: ListingEventTypeId[];
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

export const EMPTY_LISTING_DETAILS: ListingDetails = {
  description: '',
  amenities: [],
  eventTypes: [],
  contactPhone: '',
  contactWhatsapp: '',
  included: '',
  parking: false,
  languages: '',
  minNoticeHours: '',
  openingHours: '',
  closingHours: '',
  surfaceM2: '',
  teamSize: '',
  experienceYears: '',
  houseRules: '',
  cancellation: '',
  extraFees: '',
  depositPercent: '',
  accessNotes: '',
  instagram: '',
};

export const VENUE_AMENITIES: Array<{ id: ListingAmenityId; label: string }> = [
  { id: 'wifi', label: 'Wi-Fi' },
  { id: 'parking', label: 'Parking' },
  { id: 'ac', label: 'Climatisation' },
  { id: 'generator', label: 'Générateur' },
  { id: 'sound', label: 'Sono' },
  { id: 'kitchen', label: 'Cuisine' },
  { id: 'stage', label: 'Scène' },
  { id: 'cloakroom', label: 'Vestiaire' },
  { id: 'accessible', label: 'Accès PMR' },
  { id: 'garden', label: 'Jardin / ext.' },
  { id: 'security', label: 'Sécurité' },
  { id: 'projector', label: 'Projecteur' },
  { id: 'toilets', label: 'Sanitaires' },
  { id: 'lighting', label: 'Éclairage' },
  { id: 'bar', label: 'Bar' },
];

export const SERVICE_AMENITIES: Array<{ id: ListingAmenityId; label: string }> = [
  { id: 'gear', label: 'Matériel inclus' },
  { id: 'assistant', label: 'Assistant(e)' },
  { id: 'urgent', label: 'Dispo. urgente' },
  { id: 'install', label: 'Installation sur place' },
  { id: 'trial', label: 'Essai / démo' },
  { id: 'sound', label: 'Sono' },
  { id: 'security', label: 'Sécurité' },
  { id: 'lighting', label: 'Éclairage' },
  { id: 'makeup', label: 'Maquillage / loge' },
  { id: 'backup', label: 'Matériel de secours' },
];

export const LISTING_EVENT_TYPES: Array<{ id: ListingEventTypeId; label: string }> = [
  { id: 'wedding', label: 'Mariage' },
  { id: 'birthday', label: 'Anniversaire' },
  { id: 'corporate', label: 'Entreprise' },
  { id: 'gala', label: 'Gala' },
  { id: 'religious', label: 'Cérémonie' },
  { id: 'private', label: 'Réception privée' },
  { id: 'shooting', label: 'Shooting' },
];

const AMENITY_IDS = new Set([...VENUE_AMENITIES, ...SERVICE_AMENITIES].map((item) => item.id));
const EVENT_IDS = new Set(LISTING_EVENT_TYPES.map((item) => item.id));

export function parseListingDetails(input: unknown): ListingDetails {
  const raw = input && typeof input === 'object' && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {};
  const amenities = Array.isArray(raw.amenities)
    ? raw.amenities.filter((id): id is ListingAmenityId => typeof id === 'string' && AMENITY_IDS.has(id as ListingAmenityId))
    : [];
  const eventTypes = Array.isArray(raw.eventTypes)
    ? raw.eventTypes.filter((id): id is ListingEventTypeId => typeof id === 'string' && EVENT_IDS.has(id as ListingEventTypeId))
    : [];
  const text = (key: string) => (typeof raw[key] === 'string' ? raw[key] as string : '');
  return {
    description: text('description'),
    amenities,
    eventTypes,
    contactPhone: text('contactPhone'),
    contactWhatsapp: text('contactWhatsapp'),
    included: text('included'),
    parking: Boolean(raw.parking),
    languages: text('languages'),
    minNoticeHours: raw.minNoticeHours != null ? String(raw.minNoticeHours) : '',
    openingHours: text('openingHours'),
    closingHours: text('closingHours'),
    surfaceM2: raw.surfaceM2 != null ? String(raw.surfaceM2) : '',
    teamSize: raw.teamSize != null ? String(raw.teamSize) : '',
    experienceYears: raw.experienceYears != null ? String(raw.experienceYears) : '',
    houseRules: text('houseRules'),
    cancellation: text('cancellation'),
    extraFees: text('extraFees'),
    depositPercent: raw.depositPercent != null ? String(raw.depositPercent) : '',
    accessNotes: text('accessNotes'),
    instagram: text('instagram'),
  };
}

export function amenityLabel(id: string) {
  return [...VENUE_AMENITIES, ...SERVICE_AMENITIES].find((item) => item.id === id)?.label || id;
}

export function eventTypeLabel(id: string) {
  return LISTING_EVENT_TYPES.find((item) => item.id === id)?.label || id;
}
