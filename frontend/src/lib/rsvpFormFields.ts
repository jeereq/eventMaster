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

/** Régimes alimentaires — alignés analytics / export CSV. */
export const SPECIAL_MEAL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'none', label: 'Standard' },
  { value: 'vegetarian', label: 'Végétarien' },
  { value: 'vegan', label: 'Végétalien (vegan)' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Casher' },
];

export function specialMealLabel(value?: string | null): string {
  return SPECIAL_MEAL_OPTIONS.find((o) => o.value === (value || 'none'))?.label || 'Standard';
}

/** Clés toujours présentes et obligatoires sur toute invitation. */
export const MANDATORY_RSVP_FIELD_KEYS = ['genre', 'allergies', 'boissons', 'type_menu'] as const;

const MANDATORY_RSVP_KEY_ALIASES: Record<string, string[]> = {
  genre: ['genre', 'gender', 'sexe'],
  allergies: ['allergies', 'allergie', 'allergy'],
  boissons: ['boissons', 'boisson', 'drinks', 'drink'],
  type_menu: ['type_menu', 'type_de_menu', 'special_meal', 'regime'],
};

/** Champs RSVP imposés sur tous les modèles (formulaire invité). */
export const MANDATORY_RSVP_FIELD_PRESETS: Array<
  Omit<RsvpField, 'id' | 'analyticsKey'> & { id: string; analyticsKey: string }
> = [
  {
    id: 'mandatory_genre',
    type: 'radio',
    label: 'Genre',
    options: 'Femme, Homme, Autre',
    required: true,
    analyticsKey: 'genre',
    category: 'demographic',
  },
  {
    id: 'mandatory_allergies',
    type: 'text',
    label: 'Allergies',
    required: true,
    analyticsKey: 'allergies',
    category: 'preference',
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
    category: 'preference',
  },
  {
    id: 'mandatory_type_menu',
    type: 'select',
    label: 'Type de menu',
    options: 'Standard, Végétarien, Végétalien (vegan), Halal, Casher',
    required: true,
    analyticsKey: 'type_menu',
    category: 'preference',
    helpText: 'Régime ou type de plat prévu pour vous.',
  },
];

export type MandatoryRsvpKind = 'genre' | 'allergies' | 'boissons' | 'type_menu';

export type RsvpFieldKindCatalogEntry = {
  kind: MandatoryRsvpKind;
  analyticsKey: string;
  label: string;
  defaultType: RsvpFieldType;
  allowedTypes: RsvpFieldType[];
  predefinedOptions?: string;
  placeholder?: string;
  helpText?: string;
  category: RsvpFieldCategory;
};

/** Types de champs RSVP imposés : valeurs prédéfinies ou personnalisées par l’organisateur. */
export const RSVP_FIELD_KIND_CATALOG: RsvpFieldKindCatalogEntry[] = [
  {
    kind: 'genre',
    analyticsKey: 'genre',
    label: 'Genre',
    defaultType: 'radio',
    allowedTypes: ['radio', 'select'],
    predefinedOptions: 'Femme, Homme, Autre',
    category: 'demographic',
  },
  {
    kind: 'allergies',
    analyticsKey: 'allergies',
    label: 'Allergies',
    defaultType: 'text',
    allowedTypes: ['text', 'textarea', 'select'],
    predefinedOptions: 'Aucune, Arachides, Gluten, Lactose, Fruits de mer, Œufs, Soja, Autre',
    placeholder: 'Aucune si pas d’allergie',
    helpText: 'Indiquez vos allergies alimentaires, ou « Aucune ».',
    category: 'preference',
  },
  {
    kind: 'boissons',
    analyticsKey: 'boissons',
    label: 'Boissons',
    defaultType: 'select',
    allowedTypes: ['select', 'radio'],
    predefinedOptions: 'Eau, Jus, Soft, Vin, Bière, Sans alcool',
    category: 'preference',
  },
  {
    kind: 'type_menu',
    analyticsKey: 'type_menu',
    label: 'Type de menu',
    defaultType: 'select',
    allowedTypes: ['select', 'radio'],
    predefinedOptions: 'Standard, Végétarien, Végétalien (vegan), Halal, Casher',
    helpText: 'Régime ou type de plat prévu pour vous.',
    category: 'preference',
  },
];

function normalizeOptionList(options?: string): string {
  return (options || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ')
    .toLowerCase();
}

export function getMandatoryRsvpKind(field: Pick<RsvpField, 'analyticsKey' | 'id' | 'label'>): MandatoryRsvpKind | null {
  for (const entry of RSVP_FIELD_KIND_CATALOG) {
    if (fieldMatchesMandatoryKey(field as RsvpField, entry.analyticsKey)) return entry.kind;
  }
  return null;
}

export function getRsvpFieldKindEntry(field: Pick<RsvpField, 'analyticsKey' | 'id' | 'label'>): RsvpFieldKindCatalogEntry | null {
  const kind = getMandatoryRsvpKind(field);
  return kind ? RSVP_FIELD_KIND_CATALOG.find((entry) => entry.kind === kind) || null : null;
}

export function isAllowedWidgetForKind(kind: MandatoryRsvpKind, type: RsvpFieldType): boolean {
  const entry = RSVP_FIELD_KIND_CATALOG.find((item) => item.kind === kind);
  return Boolean(entry?.allowedTypes.includes(type));
}

export function usesPredefinedRsvpOptions(field: RsvpField): boolean {
  const entry = getRsvpFieldKindEntry(field);
  if (!entry?.predefinedOptions) return false;
  if (field.type !== 'select' && field.type !== 'radio') return false;
  return normalizeOptionList(field.options) === normalizeOptionList(entry.predefinedOptions);
}

export function applyRsvpKindPreset(field: RsvpField, mode: 'predefined' | 'custom' = 'predefined'): RsvpField {
  const entry = getRsvpFieldKindEntry(field);
  if (!entry) return field;
  const nextType = isAllowedWidgetForKind(entry.kind, field.type) ? field.type : entry.defaultType;
  const needsOptions = nextType === 'select' || nextType === 'radio';
  return normalizeRsvpField({
    ...field,
    type: nextType,
    analyticsKey: entry.analyticsKey,
    required: true,
    category: entry.category,
    placeholder: field.placeholder || entry.placeholder,
    helpText: field.helpText || entry.helpText,
    options: needsOptions
      ? (mode === 'predefined' ? entry.predefinedOptions : (field.options || entry.predefinedOptions))
      : undefined,
  });
}

export function parseEventRsvpForm(raw: unknown): RsvpField[] {
  if (!raw) return [];
  const list = Array.isArray(raw)
    ? raw
    : (raw && typeof raw === 'object' && Array.isArray((raw as { fields?: unknown }).fields)
      ? (raw as { fields: unknown[] }).fields
      : []);
  const fields = list
    .filter((item): item is Partial<RsvpField> & { id: string; label: string } =>
      Boolean(item && typeof item === 'object' && 'id' in item && 'label' in item),
    )
    .map((item) => normalizeRsvpField(item));
  return ensureMandatoryRsvpFields(fields);
}

/**
 * Champs RSVP optionnels pour le reporting (stats + export).
 * Les 4 champs obligatoires (genre, allergies, boissons, type de menu) sont ailleurs.
 */
export const REPORTING_RSVP_FIELD_PRESETS: Array<Omit<RsvpField, 'id'> & { id?: string }> = [
  {
    type: 'yes_no',
    label: 'Accompagné d’un plus-one',
    required: false,
    analyticsKey: 'plus_one',
    category: 'logistics',
  },
  {
    type: 'number',
    label: 'Nombre de personnes',
    required: false,
    analyticsKey: 'nombre_personnes',
    category: 'logistics',
    placeholder: 'Ex. : 2',
  },
];

export function isMandatoryRsvpAnalyticsKey(key?: string | null): boolean {
  const normalized = (key || '').trim().toLowerCase();
  if (!normalized) return false;
  return Object.values(MANDATORY_RSVP_KEY_ALIASES).some((aliases) => aliases.includes(normalized));
}

export function isMandatoryRsvpField(field: Pick<RsvpField, 'analyticsKey' | 'id' | 'label'>): boolean {
  if (isMandatoryRsvpAnalyticsKey(field.analyticsKey)) return true;
  if (field.id && MANDATORY_RSVP_FIELD_PRESETS.some((p) => p.id === field.id)) return true;
  return isMandatoryRsvpAnalyticsKey(slugifyAnalyticsKey(field.label || ''));
}

function fieldMatchesMandatoryKey(field: RsvpField, canonicalKey?: string | null): boolean {
  const key = (canonicalKey || '').trim();
  if (!key) return false;
  const aliases = MANDATORY_RSVP_KEY_ALIASES[key] || [key];
  const candidates = [
    field.analyticsKey,
    slugifyAnalyticsKey(field.label || ''),
    field.id,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  return candidates.some((value) => aliases.includes(value));
}

export function createMandatoryRsvpFields(): RsvpField[] {
  return MANDATORY_RSVP_FIELD_PRESETS.map((preset) => normalizeRsvpField({ ...preset, required: true }));
}

/** Ajoute les 4 champs obligatoires s’ils manquent et les verrouille en requis. */
export function ensureMandatoryRsvpFields(fields: RsvpField[] | null | undefined): RsvpField[] {
  const normalized = (fields || []).map((f) => normalizeRsvpField(f));
  const missing: RsvpField[] = [];

  MANDATORY_RSVP_FIELD_PRESETS.forEach((preset) => {
    const existing = normalized.find((field) => fieldMatchesMandatoryKey(field, preset.analyticsKey));
    if (existing) {
      existing.required = true;
      if (!existing.analyticsKey) existing.analyticsKey = preset.analyticsKey;
      return;
    }
    missing.push(
      normalizeRsvpField({
        ...preset,
        id: preset.id,
        required: true,
      }),
    );
  });

  return [...missing, ...normalized];
}

export function ensureMandatoryRsvpFieldsOnElements<T extends { type?: string; rsvpFields?: RsvpField[] }>(
  elements: T[] | null | undefined,
): T[] {
  return (elements || []).map((el) => {
    if (el.type !== 'rsvp-block') return el;
    return { ...el, rsvpFields: ensureMandatoryRsvpFields(el.rsvpFields) };
  });
}

export function createDefaultReportingRsvpFields(): RsvpField[] {
  const stamp = Date.now();
  const extras = REPORTING_RSVP_FIELD_PRESETS.map((preset, index) =>
    normalizeRsvpField({
      ...preset,
      id: preset.id || `rf_${stamp}_${index}`,
    }),
  );
  return ensureMandatoryRsvpFields(extras);
}

/** Ajoute les presets reporting manquants (par analyticsKey) sans dupliquer. */
export function ensureReportingRsvpFields(fields: RsvpField[]): RsvpField[] {
  const normalized = ensureMandatoryRsvpFields(fields);
  const existingKeys = new Set(
    normalized.map((f) => (f.analyticsKey || slugifyAnalyticsKey(f.label)).toLowerCase()),
  );
  const stamp = Date.now();
  const missing = REPORTING_RSVP_FIELD_PRESETS.filter(
    (p) => !existingKeys.has((p.analyticsKey || slugifyAnalyticsKey(p.label)).toLowerCase()),
  ).map((preset, index) =>
    normalizeRsvpField({
      ...preset,
      id: `rf_ensure_${stamp}_${index}`,
    }),
  );
  return [...normalized, ...missing];
}

export function validateRsvpFieldsForReporting(fields: RsvpField[]): string[] {
  const issues: string[] = [];
  const keys = new Map<string, string>();
  fields.forEach((raw, index) => {
    const field = normalizeRsvpField(raw);
    const key = (field.analyticsKey || '').trim();
    if (!key) {
      issues.push(
        `Le champ « ${field.label || `#${index + 1}`} » n’a pas d’identifiant d’export. Donnez-lui un libellé clair.`,
      );
      return;
    }
    const lower = key.toLowerCase();
    if (keys.has(lower)) {
      issues.push(
        `Deux champs (« ${keys.get(lower)} » et « ${field.label} ») produisent le même identifiant d’export. Renommez l’un des libellés pour les distinguer dans les statistiques.`,
      );
    } else {
      keys.set(lower, field.label);
    }
  });
  return issues;
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

/** Aperçu studio : plus large que le format logique, ratio conservé. */
export function getStudioPreviewStyle(global?: {
  canvasSizePreset?: CanvasSizePreset;
  canvasWidth?: number;
  canvasHeight?: number;
}): { width: string; maxWidth: string; aspectRatio: string } {
  const { width, height } = getCanvasDimensions(global);
  return {
    width: '100%',
    maxWidth: 'min(100%, 42rem)',
    aspectRatio: `${width} / ${height}`,
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

  hydrateMandatoryFromPreferences(values, rsvpFields, preferences);
  return values;
}

function hydrateMandatoryFromPreferences(
  values: Record<string, string | number | boolean>,
  rsvpFields: RsvpField[],
  preferences: GuestRsvpPreferences,
) {
  for (const field of rsvpFields.map(normalizeRsvpField)) {
    if (values[field.id] !== undefined) continue;
    const key = (field.analyticsKey || '').toLowerCase();
    if (key === 'allergies' || key === 'allergie') {
      if (preferences.allergies) values[field.id] = preferences.allergies;
    }
    if (key === 'type_menu' || key === 'special_meal' || key === 'regime') {
      if (preferences.specialMeal) values[field.id] = specialMealLabel(preferences.specialMeal);
    }
  }
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
  const toExtracted = (f: RsvpField): ExtractedRsvpField => ({
    id: f.id,
    label: f.label,
    type: f.type,
    analyticsKey: f.analyticsKey!,
    category: f.category,
    options: parseFieldOptions(f.options),
  });

  if (!content) return createMandatoryRsvpFields().map(toExtracted);

  let contentObj = content as { elements?: Array<{ type?: string; rsvpFields?: RsvpField[] }> };
  if (typeof content === 'string') {
    try {
      contentObj = JSON.parse(content);
    } catch {
      return createMandatoryRsvpFields().map(toExtracted);
    }
  }

  contentObj.elements?.forEach((el) => {
    if (el.type === 'rsvp-block') {
      ensureMandatoryRsvpFields(el.rsvpFields).forEach((f) => {
        if (!fields.some((existing) => existing.analyticsKey === f.analyticsKey)) {
          fields.push(toExtracted(f));
        }
      });
    }
  });

  if (fields.length === 0) {
    return createMandatoryRsvpFields().map(toExtracted);
  }

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

export interface GuestCustomFieldDetail {
  key: string;
  label: string;
  type?: RsvpFieldType;
  typeLabel?: string;
  category?: RsvpFieldCategory;
  value: unknown;
  displayValue: string;
  answered: boolean;
}

/**
 * Liste les champs personnalisés RSVP d’un invité pour l’affichage détail :
 * champs du modèle (ordonnés) + réponses rsvpFormData / customFields restantes.
 */
export function listGuestCustomFieldDetails(
  preferences: GuestRsvpPreferences | null | undefined,
  templateFields: ExtractedRsvpField[] = [],
): GuestCustomFieldDetail[] {
  const seen = new Set<string>();
  const rows: GuestCustomFieldDetail[] = [];

  const pushRow = (row: GuestCustomFieldDetail) => {
    const keys = [row.key, row.label].filter(Boolean);
    if (keys.some((k) => seen.has(k))) return;
    keys.forEach((k) => seen.add(k));
    rows.push(row);
  };

  for (const field of templateFields) {
    const key = field.analyticsKey || field.id;
    const value = getCustomFieldValue(preferences, field);
    const displayValue = formatCustomFieldValueForDisplay(value);
    pushRow({
      key,
      label: field.label,
      type: field.type,
      typeLabel: RSVP_FIELD_TYPE_LABELS[field.type],
      category: field.category,
      value,
      displayValue,
      answered: displayValue !== '',
    });
  }

  for (const entry of preferences?.rsvpFormData || []) {
    const key = entry.analyticsKey || entry.fieldId || entry.label;
    const displayValue = formatCustomFieldValueForDisplay(entry.value);
    pushRow({
      key,
      label: entry.label || entry.analyticsKey || 'Champ',
      type: entry.type,
      typeLabel: entry.type ? RSVP_FIELD_TYPE_LABELS[entry.type] : undefined,
      category: entry.category,
      value: entry.value,
      displayValue,
      answered: displayValue !== '',
    });
  }

  for (const [key, value] of Object.entries(preferences?.customFields || {})) {
    const displayValue = formatCustomFieldValueForDisplay(value);
    pushRow({
      key,
      label: key,
      type: typeof value === 'boolean' ? 'checkbox' : typeof value === 'number' ? 'number' : 'text',
      typeLabel:
        typeof value === 'boolean'
          ? RSVP_FIELD_TYPE_LABELS.checkbox
          : typeof value === 'number'
            ? RSVP_FIELD_TYPE_LABELS.number
            : RSVP_FIELD_TYPE_LABELS.text,
      value,
      displayValue,
      answered: displayValue !== '',
    });
  }

  return rows;
}
