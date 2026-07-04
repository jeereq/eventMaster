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

  return values;
}

export function extractRsvpFieldsFromTemplateContent(content: unknown): RsvpField[] {
  const fields: RsvpField[] = [];
  if (!content) return fields;

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
          fields.push(f);
        }
      });
    }
  });

  return fields;
}
