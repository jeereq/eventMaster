export type RsvpFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'yes_no'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'rating';

export interface RsvpField {
  id: string;
  type: RsvpFieldType;
  label: string;
  options?: string;
  required: boolean;
  analyticsKey?: string;
  placeholder?: string;
  helpText?: string;
}

export interface RsvpFormDataEntry {
  fieldId: string;
  analyticsKey: string;
  label: string;
  type: RsvpFieldType;
  value: string | number | boolean | null;
}

export interface GuestRsvpPreferences {
  allergies?: string;
  specialMeal?: string;
  notes?: string;
  customFields?: Record<string, string | number | boolean>;
  rsvpFormData?: RsvpFormDataEntry[];
}

export function slugifyAnalyticsKey(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'champ';
}

export function normalizeRsvpField(field: Partial<RsvpField> & { id: string; label: string }): RsvpField {
  const type = (field.type || 'text') as RsvpFieldType;
  return {
    id: field.id,
    type,
    label: field.label,
    options: field.options,
    required: Boolean(field.required),
    analyticsKey: field.analyticsKey || slugifyAnalyticsKey(field.label),
    placeholder: field.placeholder,
    helpText: field.helpText,
  };
}

const SPECIAL_MEAL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'none', label: 'Standard' },
  { value: 'vegetarian', label: 'Végétarien' },
  { value: 'vegan', label: 'Végétalien (vegan)' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Casher' },
];

function specialMealLabel(value?: string | null): string {
  return SPECIAL_MEAL_OPTIONS.find((o) => o.value === (value || 'none'))?.label || 'Standard';
}

function mealValueFromLabel(raw: string): string {
  const value = raw.trim();
  if (SPECIAL_MEAL_OPTIONS.some((o) => o.value === value)) return value;
  const n = value.toLowerCase();
  if (n.includes('vegan') || n.includes('végétalien') || n.includes('vegetalien')) return 'vegan';
  if (n.includes('végétarien') || n.includes('vegetarien') || n.includes('vegetarian')) return 'vegetarian';
  if (n.includes('halal')) return 'halal';
  if (n.includes('casher') || n.includes('kosher')) return 'kosher';
  if (n.includes('standard') || n === 'none' || n === 'aucun') return 'none';
  return 'none';
}

const MANDATORY_RSVP_KEY_ALIASES: Record<string, string[]> = {
  genre: ['genre', 'gender', 'sexe'],
  allergies: ['allergies', 'allergie', 'allergy'],
  boissons: ['boissons', 'boisson', 'drinks', 'drink'],
  type_menu: ['type_menu', 'type_de_menu', 'special_meal', 'regime'],
};

export const MANDATORY_RSVP_FIELD_PRESETS: Array<Omit<RsvpField, 'id'> & { id: string }> = [
  {
    id: 'mandatory_genre',
    type: 'radio',
    label: 'Genre',
    options: 'Femme, Homme, Autre',
    required: true,
    analyticsKey: 'genre',
  },
  {
    id: 'mandatory_allergies',
    type: 'text',
    label: 'Allergies',
    required: true,
    analyticsKey: 'allergies',
    placeholder: 'Aucune si pas d’allergie',
    helpText: 'Indiquez vos allergies alimentaires, ou « Aucune ».',
  },
  {
    id: 'mandatory_boissons',
    type: 'select',
    label: 'Boissons',
    options: 'Eau, Jus, Soft, Vin, Bière, Sans alcool',
    required: true,
    analyticsKey: 'boissons',
  },
  {
    id: 'mandatory_type_menu',
    type: 'select',
    label: 'Type de menu',
    options: 'Standard, Végétarien, Végétalien (vegan), Halal, Casher',
    required: true,
    analyticsKey: 'type_menu',
    helpText: 'Régime ou type de plat prévu pour vous.',
  },
];

function fieldMatchesMandatoryKey(field: RsvpField, canonicalKey: string): boolean {
  const aliases = MANDATORY_RSVP_KEY_ALIASES[canonicalKey] || [canonicalKey];
  const candidates = [field.analyticsKey, slugifyAnalyticsKey(field.label || ''), field.id]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  return candidates.some((value) => aliases.includes(value));
}

export function createMandatoryRsvpFields(): RsvpField[] {
  return MANDATORY_RSVP_FIELD_PRESETS.map((preset) => normalizeRsvpField({ ...preset, required: true }));
}

export function ensureMandatoryRsvpFields(fields: RsvpField[] | null | undefined): RsvpField[] {
  const normalized = (fields || []).map((f) => normalizeRsvpField(f));
  const missing: RsvpField[] = [];

  MANDATORY_RSVP_FIELD_PRESETS.forEach((preset) => {
    const existing = normalized.find((field) => fieldMatchesMandatoryKey(field, preset.analyticsKey || ''));
    if (existing) {
      existing.required = true;
      if (!existing.analyticsKey) existing.analyticsKey = preset.analyticsKey;
      return;
    }
    missing.push(normalizeRsvpField({ ...preset, id: preset.id, required: true }));
  });

  return [...missing, ...normalized];
}

export function parseFieldOptions(options?: string): string[] {
  if (!options) return [];
  return options.split(',').map((o) => o.trim()).filter(Boolean);
}

function coerceFieldValue(type: RsvpFieldType, rawValue: unknown): string | number | boolean {
  if (type === 'checkbox' || type === 'yes_no') return Boolean(rawValue);
  if (type === 'number' || type === 'rating') {
    const num = Number(rawValue);
    return Number.isFinite(num) ? num : 0;
  }
  return String(rawValue ?? '');
}

export function buildRsvpPreferencesPayload(params: {
  allergies: string;
  specialMeal: string;
  notes: string;
  rsvpFields: RsvpField[];
  fieldValues: Record<string, unknown>;
}): GuestRsvpPreferences {
  const customFields: Record<string, string | number | boolean> = {};
  const rsvpFormData: RsvpFormDataEntry[] = [];

  for (const raw of params.rsvpFields) {
    const field = normalizeRsvpField(raw);
    const rawValue = params.fieldValues[field.id];
    if (rawValue === undefined || rawValue === null || rawValue === '') continue;

    const value = coerceFieldValue(field.type, rawValue);
    const storageKey = field.analyticsKey || slugifyAnalyticsKey(field.label);
    customFields[storageKey] = value;
    rsvpFormData.push({
      fieldId: field.id,
      analyticsKey: storageKey,
      label: field.label,
      type: field.type,
      value,
    });
  }

  const allergiesFromField = customFields.allergies ?? customFields.allergie;
  const menuFromField = customFields.type_menu ?? customFields.special_meal ?? customFields.regime;

  return {
    allergies: String(allergiesFromField ?? params.allergies ?? '').trim(),
    specialMeal: mealValueFromLabel(String(menuFromField ?? params.specialMeal ?? 'none')),
    notes: params.notes,
    customFields,
    rsvpFormData,
  };
}

export function restoreFieldValuesFromPreferences(
  rsvpFields: RsvpField[],
  preferences: GuestRsvpPreferences | null | undefined,
): Record<string, string | number | boolean> {
  const values: Record<string, string | number | boolean> = {};
  if (!preferences) return values;

  const formData = preferences.rsvpFormData || [];
  const customFields = preferences.customFields || {};

  for (const field of rsvpFields.map(normalizeRsvpField)) {
    const entry = formData.find(
      (d) => d.fieldId === field.id || d.analyticsKey === field.analyticsKey,
    );
    if (entry?.value !== undefined && entry.value !== null) {
      values[field.id] = entry.value;
      continue;
    }

    const keys = [field.analyticsKey, field.label, field.id].filter(Boolean) as string[];
    for (const key of keys) {
      if (customFields[key] !== undefined) {
        values[field.id] = customFields[key];
        break;
      }
    }
  }

  for (const field of rsvpFields.map(normalizeRsvpField)) {
    if (values[field.id] !== undefined) continue;
    const key = (field.analyticsKey || '').toLowerCase();
    if ((key === 'allergies' || key === 'allergie') && preferences.allergies) {
      values[field.id] = preferences.allergies;
    }
    if ((key === 'type_menu' || key === 'special_meal' || key === 'regime') && preferences.specialMeal) {
      values[field.id] = specialMealLabel(preferences.specialMeal);
    }
  }

  return values;
}

export function extractRsvpFieldsFromTemplateContent(content: unknown): RsvpField[] {
  const fields: RsvpField[] = [];
  if (!content) return createMandatoryRsvpFields();

  let contentObj = content as { elements?: Array<{ type?: string; rsvpFields?: RsvpField[] }> };
  if (typeof content === 'string') {
    try {
      contentObj = JSON.parse(content);
    } catch {
      return createMandatoryRsvpFields();
    }
  }

  contentObj.elements?.forEach((el) => {
    if (el.type === 'rsvp-block') {
      ensureMandatoryRsvpFields(el.rsvpFields).forEach((f) => {
        if (!fields.some((existing) => existing.analyticsKey === f.analyticsKey)) {
          fields.push(f);
        }
      });
    }
  });

  return fields.length > 0 ? ensureMandatoryRsvpFields(fields) : createMandatoryRsvpFields();
}
