import type { ListingAmenityId, ListingEventTypeId } from '@/lib/listingDetails';
import { EVENT_PLAN_SLOTS } from '@/lib/eventPlan';
import type { ServiceCategory } from '@/lib/marketplace';

export const AI_AMBIANCES = [
  { id: 'elegant', label: 'Élégant' },
  { id: 'festive', label: 'Festif' },
  { id: 'sober', label: 'Sobre' },
  { id: 'luxury', label: 'Luxe' },
  { id: 'traditional', label: 'Traditionnel' },
  { id: 'nature', label: 'Nature / jardin' },
] as const;

export const AI_MOMENTS = [
  { id: 'day', label: 'Journée' },
  { id: 'evening', label: 'Soirée' },
  { id: 'night', label: 'Nuit' },
] as const;

export const AI_SETTINGS = [
  { id: 'indoor', label: 'Intérieur' },
  { id: 'outdoor', label: 'Extérieur' },
] as const;

export type AiAmbianceId = (typeof AI_AMBIANCES)[number]['id'];
export type AiMomentId = (typeof AI_MOMENTS)[number]['id'];
export type AiSettingId = (typeof AI_SETTINGS)[number]['id'];

export type AiSimulationCriteria = {
  ambiance?: AiAmbianceId | '';
  moment?: AiMomentId | '';
  setting?: AiSettingId | '';
  neighborhood?: string;
  budgetMinFc?: number | null;
  wantedCategories?: ServiceCategory[];
  venueAmenities?: ListingAmenityId[];
};

export const EMPTY_AI_CRITERIA: AiSimulationCriteria = {
  ambiance: '',
  moment: '',
  setting: '',
  neighborhood: '',
  budgetMinFc: null,
  wantedCategories: [],
  venueAmenities: [],
};

export function suggestedCategoriesForEvent(eventType: ListingEventTypeId): ServiceCategory[] {
  const spec = EVENT_PLAN_SLOTS[eventType];
  return [...spec.required, ...spec.optional];
}

export function criteriaLabel(criteria: AiSimulationCriteria): string[] {
  const chips: string[] = [];
  const ambiance = AI_AMBIANCES.find((item) => item.id === criteria.ambiance);
  const moment = AI_MOMENTS.find((item) => item.id === criteria.moment);
  const setting = AI_SETTINGS.find((item) => item.id === criteria.setting);
  if (ambiance) chips.push(ambiance.label);
  if (moment) chips.push(moment.label);
  if (setting) chips.push(setting.label);
  if (criteria.neighborhood?.trim()) chips.push(criteria.neighborhood.trim());
  return chips;
}
