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

export type RsvpFieldCategory =
  | 'demographic'
  | 'logistics'
  | 'preference'
  | 'feedback'
  | 'custom';

export interface RsvpField {
  id: string;
  type: RsvpFieldType;
  label: string;
  options?: string;
  required: boolean;
  analyticsKey?: string;
  category?: RsvpFieldCategory;
  placeholder?: string;
  helpText?: string;
}

export interface RsvpFormDataEntry {
  fieldId: string;
  analyticsKey: string;
  label: string;
  type: RsvpFieldType;
  category?: RsvpFieldCategory;
  value: string | number | boolean | null;
}

export interface GuestRsvpPreferences {
  allergies?: string;
  specialMeal?: string;
  notes?: string;
  customFields?: Record<string, string | number | boolean>;
  rsvpFormData?: RsvpFormDataEntry[];
}

export type CanvasSizePreset = 'mobile' | 'standard' | 'desktop' | 'wide' | 'custom';

export const CANVAS_SIZE_PRESETS: Record<
  Exclude<CanvasSizePreset, 'custom'>,
  { width: number; height: number; label: string }
> = {
  mobile: { width: 375, height: 640, label: 'Mobile (375×640)' },
  standard: { width: 480, height: 720, label: 'Standard (480×720)' },
  desktop: { width: 600, height: 900, label: 'Grand format (600×900)' },
  wide: { width: 768, height: 576, label: 'Paysage (768×576)' },
};

export const RSVP_FIELD_CATEGORIES: { id: RsvpFieldCategory; label: string }[] = [
  { id: 'demographic', label: 'Profil invité' },
  { id: 'logistics', label: 'Logistique' },
  { id: 'preference', label: 'Préférences' },
  { id: 'feedback', label: 'Retour / avis' },
  { id: 'custom', label: 'Autre' },
];

export const RSVP_FIELD_TYPE_LABELS: Record<RsvpFieldType, string> = {
  text: 'Texte court',
  textarea: 'Texte long',
  select: 'Menu déroulant',
  radio: 'Choix unique (boutons)',
  checkbox: 'Case à cocher',
  yes_no: 'Oui / Non',
  number: 'Nombre',
  email: 'E-mail',
  phone: 'Téléphone',
  date: 'Date',
  rating: 'Note (1 à 5)',
};

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
    category: field.category || 'custom',
    placeholder: field.placeholder,
    helpText: field.helpText,
  };
}

export function createDefaultRsvpField(overrides?: Partial<RsvpField>): RsvpField {
  const label = overrides?.label || 'Nouveau champ';
  return normalizeRsvpField({
    id: Date.now().toString(),
    type: 'text',
    label,
    required: false,
    ...overrides,
  });
}

export function getCanvasDimensions(global?: {
  canvasSizePreset?: CanvasSizePreset;
  canvasWidth?: number;
  canvasHeight?: number;
}): { width: number; height: number; preset: CanvasSizePreset } {
  const preset = global?.canvasSizePreset || 'standard';
  if (preset !== 'custom' && CANVAS_SIZE_PRESETS[preset]) {
    return { ...CANVAS_SIZE_PRESETS[preset], preset };
  }
  return {
    width: global?.canvasWidth || CANVAS_SIZE_PRESETS.standard.width,
    height: global?.canvasHeight || CANVAS_SIZE_PRESETS.standard.height,
    preset: 'custom',
  };
}

export function getCanvasStyle(global?: {
  canvasSizePreset?: CanvasSizePreset;
  canvasWidth?: number;
  canvasHeight?: number;
}): { width: string; maxWidth: string; minHeight: string } {
  const { width, height } = getCanvasDimensions(global);
  return {
    width: '100%',
    maxWidth: `${width}px`,
    minHeight: `${height}px`,
  };
}

export function parseFieldOptions(options?: string): string[] {
  if (!options) return [];
  return options.split(',').map((o) => o.trim()).filter(Boolean);
}

function coerceFieldValue(type: RsvpFieldType, rawValue: unknown): string | number | boolean {
  if (type === 'checkbox' || type === 'yes_no') {
    return Boolean(rawValue);
  }
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
      category: field.category,
      value,
    });
  }

  return {
    allergies: params.allergies,
    specialMeal: params.specialMeal,
    notes: params.notes,
    customFields,
    rsvpFormData,
  };
}

export function restoreFieldValuesFromPreferences(
  rsvpFields: RsvpField[],
  preferences: GuestRsvpPreferences | null | undefined
): Record<string, string | number | boolean> {
  const values: Record<string, string | number | boolean> = {};
  if (!preferences) return values;

  const formData = preferences.rsvpFormData || [];
  const customFields = preferences.customFields || {};

  for (const field of rsvpFields.map(normalizeRsvpField)) {
    const entry = formData.find(
      (d) => d.fieldId === field.id || d.analyticsKey === field.analyticsKey
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

  return values;
}

export function getCustomFieldValue(
  preferences: GuestRsvpPreferences | null | undefined,
  field: { id: string; label: string; analyticsKey?: string }
): string | number | boolean | undefined {
  if (!preferences) return undefined;

  if (preferences.rsvpFormData?.length) {
    const entry = preferences.rsvpFormData.find(
      (d) =>
        d.analyticsKey === field.analyticsKey ||
        d.fieldId === field.id ||
        d.label === field.label
    );
    if (entry?.value !== undefined && entry.value !== null) return entry.value;
  }

  const cf = preferences.customFields;
  if (!cf) return undefined;

  const keys = [field.analyticsKey, field.label, field.id].filter(Boolean) as string[];
  for (const key of keys) {
    if (cf[key] !== undefined) return cf[key];
  }
  return undefined;
}

export function formatCustomFieldValueForDisplay(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  return String(value);
}

export interface ExtractedRsvpField {
  id: string;
  label: string;
  type: RsvpFieldType;
  analyticsKey: string;
  category?: RsvpFieldCategory;
  options?: string[];
}

export function extractRsvpFieldsFromTemplateContent(content: unknown): ExtractedRsvpField[] {
  const fields: ExtractedRsvpField[] = [];
  if (!content || typeof content !== 'object') return fields;

  let contentObj = content as { elements?: Array<{ type?: string; rsvpFields?: RsvpField[] }> };
  if (typeof content === 'string') {
    try {
      contentObj = JSON.parse(content);
    } catch {
      return fields;
    }
  }

  contentObj.elements?.forEach((el) => {
    if (el.type === 'rsvp-block' && el.rsvpFields) {
      el.rsvpFields.forEach((raw) => {
        const f = normalizeRsvpField(raw);
        if (!fields.some((existing) => existing.analyticsKey === f.analyticsKey)) {
          fields.push({
            id: f.id,
            label: f.label,
            type: f.type,
            analyticsKey: f.analyticsKey!,
            category: f.category,
            options: parseFieldOptions(f.options),
          });
        }
      });
    }
  });

  return fields;
}

export function supplementFieldsFromGuestPreferences(
  fields: ExtractedRsvpField[],
  guests: Array<{ preferences?: GuestRsvpPreferences | null }>
): ExtractedRsvpField[] {
  const result = [...fields];

  guests.forEach((g) => {
    g.preferences?.rsvpFormData?.forEach((entry) => {
      if (!result.some((f) => f.analyticsKey === entry.analyticsKey)) {
        result.push({
          id: entry.fieldId,
          label: entry.label,
          type: entry.type,
          analyticsKey: entry.analyticsKey,
          category: entry.category,
        });
      }
    });

    if (g.preferences?.customFields) {
      Object.entries(g.preferences.customFields).forEach(([key, val]) => {
        if (!result.some((f) => f.analyticsKey === key || f.label === key)) {
          result.push({
            id: `dynamic-${key}`,
            label: key,
            type: typeof val === 'boolean' ? 'checkbox' : typeof val === 'number' ? 'number' : 'text',
            analyticsKey: key,
          });
        }
      });
    }
  });

  return result;
}

export function isBooleanFieldType(type: string): boolean {
  return type === 'checkbox' || type === 'yes_no';
}

export function isNumericFieldType(type: string): boolean {
  return type === 'number' || type === 'rating';
}
