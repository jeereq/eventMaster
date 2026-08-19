type RsvpFieldLike = {
  id?: string;
  type?: string;
  label?: string;
  options?: string;
  required?: boolean;
  analyticsKey?: string;
  category?: string;
  placeholder?: string;
  helpText?: string;
};

const MANDATORY_RSVP_KEY_ALIASES: Record<string, string[]> = {
  genre: ['genre', 'gender', 'sexe'],
  allergies: ['allergies', 'allergie', 'allergy'],
  boissons: ['boissons', 'boisson', 'drinks', 'drink'],
  type_menu: ['type_menu', 'type_de_menu', 'special_meal', 'regime'],
};

export const MANDATORY_RSVP_FIELD_PRESETS: RsvpFieldLike[] = [
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

function slugify(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'champ';
}

function fieldMatchesMandatoryKey(field: RsvpFieldLike, canonicalKey: string): boolean {
  const aliases = MANDATORY_RSVP_KEY_ALIASES[canonicalKey] || [canonicalKey];
  const candidates = [field.analyticsKey, slugify(field.label || ''), field.id]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  return candidates.some((value) => aliases.includes(value));
}

export function ensureMandatoryRsvpFields(fields: RsvpFieldLike[] | null | undefined): RsvpFieldLike[] {
  const normalized = (fields || []).map((field) => ({ ...field, required: Boolean(field.required) }));
  const missing: RsvpFieldLike[] = [];

  MANDATORY_RSVP_FIELD_PRESETS.forEach((preset) => {
    const existing = normalized.find((field) => fieldMatchesMandatoryKey(field, preset.analyticsKey || ''));
    if (existing) {
      existing.required = true;
      if (!existing.analyticsKey) existing.analyticsKey = preset.analyticsKey;
      return;
    }
    missing.push({
      ...preset,
      id: preset.id,
      required: true,
    });
  });

  return [...missing, ...normalized];
}

export function ensureMandatoryRsvpFieldsOnContent(content: unknown): unknown {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return content;
  const parsed = content as { elements?: Array<{ type?: string; rsvpFields?: RsvpFieldLike[] }> };
  if (!Array.isArray(parsed.elements)) return content;

  let touched = false;
  const elements = parsed.elements.map((el) => {
    if (el?.type !== 'rsvp-block') return el;
    touched = true;
    return { ...el, rsvpFields: ensureMandatoryRsvpFields(el.rsvpFields) };
  });

  return touched ? { ...parsed, elements } : content;
}
