import { normalizeGuestGuidelines, type GuestGuidelines } from '@/lib/guestGuidelines';

export const EVENT_KIND_IDS = [
  'WEDDING',
  'BIRTHDAY',
  'BAPTISM',
  'CORPORATE',
  'CONFERENCE',
  'GALA',
  'OTHER',
] as const;

export type EventKindId = (typeof EVENT_KIND_IDS)[number];

export const EVENT_KIND_LABELS: Record<EventKindId, string> = {
  WEDDING: 'Mariage',
  BIRTHDAY: 'Anniversaire',
  BAPTISM: 'Baptême',
  CORPORATE: 'Corporate',
  CONFERENCE: 'Conférence',
  GALA: 'Gala',
  OTHER: 'Autre',
};

export const EVENT_KINDS_SIMPLE: EventKindId[] = ['WEDDING', 'BIRTHDAY', 'BAPTISM', 'OTHER'];
export const EVENT_KINDS_PRO: EventKindId[] = [...EVENT_KIND_IDS];

export type EventConfigTab = 'essentials' | 'place' | 'access' | 'welcome';

export const EVENT_CONFIG_TABS: Array<{ id: EventConfigTab; label: string }> = [
  { id: 'essentials', label: 'Essentiel' },
  { id: 'place', label: 'Lieu' },
  { id: 'access', label: 'Accès' },
  { id: 'welcome', label: 'Accueil' },
];

export type EventConfigMode = 'simple' | 'complete';

export type EventConfigSource = {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  endsAt?: string | null;
  location: string;
  reminderFrequency?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  roomId?: string | null;
  isPublic?: boolean;
  ticketingEnabled?: boolean;
  ticketPriceFc?: number | null;
  ticketsTotal?: number | null;
  photos?: string[] | null;
  guestGuidelines?: GuestGuidelines | null;
  eventKind?: string | null;
  clientName?: string | null;
  estimatedGuests?: number | null;
  dayOfContactName?: string | null;
  dayOfContactPhone?: string | null;
  room?: { id: string } | null;
  themeId?: string | null;
};

export type EventConfigPayload = {
  title: string;
  description: string;
  date: string;
  location: string;
  reminderFrequency: string;
  latitude: number | null;
  longitude: number | null;
  roomId: string | null;
  isPublic: boolean;
  ticketingEnabled: boolean;
  ticketPriceFc: number;
  ticketsTotal: number | null;
  photos: string[];
  guestGuidelines: GuestGuidelines;
  formTemplateId: string;
  openTablePlanAfterSave: boolean;
  importRoomLayout: boolean;
  eventKind: EventKindId | null;
  clientName: string | null;
  endsAt: string | null;
  estimatedGuests: number | null;
  dayOfContactName: string | null;
  dayOfContactPhone: string | null;
  themeId: string | null;
};

export function isEventKindId(value: string | null | undefined): value is EventKindId {
  return Boolean(value && (EVENT_KIND_IDS as readonly string[]).includes(value));
}

export function weddingTitle(first: string, second: string): string {
  const a = first.trim();
  const b = second.trim();
  if (a && b) return `Mariage de ${a} & ${b}`;
  if (a) return `Mariage de ${a}`;
  if (b) return `Mariage de ${b}`;
  return '';
}

export function parseWeddingNames(title: string): { first: string; second: string } | null {
  const match = title.trim().match(/^Mariage de\s+(.+?)\s*&\s*(.+)$/i);
  if (!match) return null;
  return { first: match[1].trim(), second: match[2].trim() };
}

export function toDateTimeLocalValue(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function nextEventConfigTab(tab: EventConfigTab): EventConfigTab | null {
  const index = EVENT_CONFIG_TABS.findIndex((item) => item.id === tab);
  return EVENT_CONFIG_TABS[index + 1]?.id ?? null;
}

export function firstInvalidEventConfigTab(input: {
  title: string;
  date: string;
  location: string;
}): EventConfigTab | null {
  if (!input.title.trim() || !input.date) return 'essentials';
  if (!input.location.trim()) return 'place';
  return null;
}

export function photosFromEvent(photos?: string[] | null): string[] {
  return Array.isArray(photos) ? photos.filter((url): url is string => typeof url === 'string' && url.length > 0) : [];
}

export function kindFromEvent(value?: string | null): EventKindId | '' {
  return isEventKindId(value) ? value : '';
}

export function guidelinesFromEvent(value?: GuestGuidelines | null): GuestGuidelines {
  return normalizeGuestGuidelines(value);
}
