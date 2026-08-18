import { roomTypeLabels, type RoomType } from '@/lib/roomLayoutUtils';
import {
  PRICE_UNIT_OPTIONS,
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  SERVICE_MOBILITY_OPTIONS,
  type CatalogueGeoState,
  type CatalogueItem,
  type ServiceMobility,
} from '@/lib/marketplace';

export type CatalogueKind = 'all' | 'venue' | 'service' | 'event';
export type EventEntryFilter = '' | 'paid' | 'free';

export type CatalogueEntityExtras = {
  kind: CatalogueKind;
  roomType: string;
  category: string;
  mobility: ServiceMobility;
  priceUnit: string;
  entry: EventEntryFilter;
};

export const EMPTY_CATALOGUE_EXTRAS: CatalogueEntityExtras = {
  kind: 'all',
  roomType: '',
  category: '',
  mobility: '',
  priceUnit: '',
  entry: '',
};

export const HUB_FILTER_EXTRA_KEYS = ['kind', 'roomType', 'category', 'mobility', 'priceUnit', 'entry'] as const;

export const ROOM_TYPE_FILTER_OPTIONS: Array<{ id: RoomType; label: string }> = (
  Object.entries(roomTypeLabels) as Array<[RoomType, string]>
).map(([id, label]) => ({ id, label }));

export const EVENT_ENTRY_OPTIONS = [
  { id: 'paid', label: 'Payant' },
  { id: 'free', label: 'Entrée libre' },
];

export const KIND_FILTER_OPTIONS = [
  { id: 'all', label: 'Tous' },
  { id: 'venue', label: 'Salles' },
  { id: 'service', label: 'Prestataires' },
  { id: 'event', label: 'Événements' },
];

export function parseCatalogueKind(value: string | undefined): CatalogueKind {
  return value === 'venue' || value === 'service' || value === 'event' ? value : 'all';
}

export function parseEventEntry(value: string | undefined): EventEntryFilter {
  return value === 'paid' || value === 'free' ? value : '';
}

export function mergeCatalogueExtras(extra: Record<string, string>): CatalogueEntityExtras {
  return {
    kind: parseCatalogueKind(extra.kind),
    roomType: extra.roomType || '',
    category: extra.category || '',
    mobility: (extra.mobility as ServiceMobility) || '',
    priceUnit: extra.priceUnit || '',
    entry: parseEventEntry(extra.entry),
  };
}

export function splitCatalogueExtras(extras: CatalogueEntityExtras): Record<string, string> {
  return {
    kind: extras.kind,
    roomType: extras.roomType,
    category: extras.category,
    mobility: extras.mobility,
    priceUnit: extras.priceUnit,
    entry: extras.entry,
  };
}

export function catalogueEntityExtraChips(extras: CatalogueEntityExtras): Array<{ id: string; label: string; value: string; tone?: 'venue' | 'service' | 'event' | 'neutral' }> {
  const chips: Array<{ id: string; label: string; value: string; tone?: 'venue' | 'service' | 'event' | 'neutral' }> = [];
  if (extras.kind !== 'all') {
    chips.push({
      id: 'kind',
      label: 'Type',
      value: extras.kind === 'venue' ? 'Salles' : extras.kind === 'service' ? 'Prestataires' : 'Événements',
      tone: extras.kind,
    });
  }
  if (extras.roomType) {
    chips.push({
      id: 'roomType',
      label: 'Salle',
      value: ROOM_TYPE_FILTER_OPTIONS.find((opt) => opt.id === extras.roomType)?.label || extras.roomType,
      tone: 'venue',
    });
  }
  if (extras.category) {
    chips.push({
      id: 'category',
      label: 'Métier',
      value: SERVICE_CATEGORY_LABELS[extras.category as keyof typeof SERVICE_CATEGORY_LABELS] || extras.category,
      tone: 'service',
    });
  }
  if (extras.mobility) {
    chips.push({
      id: 'mobility',
      label: 'Intervention',
      value: extras.mobility === 'on_site' ? 'Sur place' : 'Se déplace',
      tone: 'service',
    });
  }
  if (extras.priceUnit) {
    chips.push({
      id: 'priceUnit',
      label: 'Tarif',
      value: PRICE_UNIT_OPTIONS.find((opt) => opt.id === extras.priceUnit)?.label || extras.priceUnit,
      tone: 'service',
    });
  }
  if (extras.entry === 'paid') chips.push({ id: 'entry', label: 'Entrée', value: 'Payant', tone: 'event' });
  if (extras.entry === 'free') chips.push({ id: 'entry', label: 'Entrée', value: 'Libre', tone: 'event' });
  return chips;
}

export function pickCatalogueExtras(
  value: Partial<CatalogueEntityExtras> | Record<string, unknown>,
): CatalogueEntityExtras {
  const mobility = value.mobility;
  return {
    kind: parseCatalogueKind(typeof value.kind === 'string' ? value.kind : ''),
    roomType: typeof value.roomType === 'string' ? value.roomType : '',
    category: typeof value.category === 'string' ? value.category : '',
    mobility: mobility === 'on_site' || mobility === 'travels' ? mobility : '',
    priceUnit: typeof value.priceUnit === 'string' ? value.priceUnit : '',
    entry: parseEventEntry(typeof value.entry === 'string' ? value.entry : ''),
  };
}

/** Fusionne lieu + extras sans écraser la ville / commune (le brouillon mélangeait les deux). */
export function mergeGeoAndExtras(
  geo: CatalogueGeoState,
  extras: Partial<CatalogueEntityExtras> | Record<string, unknown>,
): CatalogueGeoState & CatalogueEntityExtras {
  return { ...geo, ...pickCatalogueExtras(extras) };
}

export function clearCatalogueExtraChip<T extends object>(filters: T, id: string): T {
  if (id === 'kind') return { ...filters, kind: 'all' };
  if (id === 'roomType') return { ...filters, roomType: '' };
  if (id === 'category') return { ...filters, category: '' };
  if (id === 'mobility') return { ...filters, mobility: '' };
  if (id === 'priceUnit') return { ...filters, priceUnit: '' };
  if (id === 'entry') return { ...filters, entry: '' };
  return filters;
}

export function appendCatalogueEntityParams(
  params: URLSearchParams,
  extras: CatalogueEntityExtras,
  target: 'venue' | 'service' | 'event',
) {
  if (target === 'venue' && extras.roomType) params.set('roomType', extras.roomType);
  if (target === 'service') {
    if (extras.category) params.set('category', extras.category);
    if (extras.priceUnit) params.set('priceUnit', extras.priceUnit);
    if (extras.mobility) params.set('mobility', extras.mobility);
  }
  if (target === 'event' && extras.entry) params.set('entry', extras.entry);
}

export function catalogueItemMatchesExtras(item: CatalogueItem, extras: CatalogueEntityExtras): boolean {
  if (extras.kind !== 'all' && item.kind !== extras.kind) return false;
  if (item.kind === 'venue' && extras.roomType && item.roomType !== extras.roomType) return false;
  if (item.kind === 'service') {
    if (extras.category && item.category !== extras.category) return false;
    if (extras.priceUnit && item.priceUnit !== extras.priceUnit) return false;
    if (extras.mobility === 'on_site' && item.travels !== false) return false;
    if (extras.mobility === 'travels' && item.travels === false) return false;
  }
  if (item.kind === 'event') {
    if (extras.entry === 'paid' && item.priceFromFc == null) return false;
    if (extras.entry === 'free' && item.priceFromFc != null) return false;
  }
  return true;
}

export { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS, SERVICE_MOBILITY_OPTIONS, PRICE_UNIT_OPTIONS };
