export type DressCodePresetId =
  | 'cocktail'
  | 'black_tie'
  | 'white_tie'
  | 'smart_casual'
  | 'traditional'
  | 'theme_color'
  | 'outdoor'
  | 'custom';

export type RecommendationType =
  | 'parking'
  | 'gifts'
  | 'cash_gift'
  | 'weather'
  | 'schedule'
  | 'children'
  | 'photos'
  | 'transport'
  | 'accessibility'
  | 'custom';

export interface GuestGuidelinesDressCode {
  enabled: boolean;
  presetId?: DressCodePresetId;
  themeColor?: string;
  themeColorLabel?: string;
  customText?: string;
  examples?: string[];
}

export interface GuestGuidelinesRecommendation {
  id: string;
  type: RecommendationType;
  enabled: boolean;
  title?: string;
  content: string;
}

export interface GuestGuidelines {
  dressCode: GuestGuidelinesDressCode;
  recommendations: GuestGuidelinesRecommendation[];
  additionalNotes?: string;
  showOnRsvp: boolean;
  showOnInvitation: boolean;
}

export const DRESS_CODE_PRESETS: Record<
  Exclude<DressCodePresetId, 'custom'>,
  { label: string; description: string; defaultText: string; examples: string[] }
> = {
  cocktail: {
    label: 'Cocktail chic',
    description: 'Élégant sans smoking obligatoire',
    defaultText: 'Tenue cocktail chic — robe ou costume élégant.',
    examples: ['Robe cocktail', 'Costume', 'Chemise habillée'],
  },
  black_tie: {
    label: 'Black tie',
    description: 'Smoking ou robe longue',
    defaultText: 'Black tie — smoking, cravate noire ou robe longue / cocktail long.',
    examples: ['Smoking', 'Robe longue', 'Robe cocktail longue'],
  },
  white_tie: {
    label: 'White tie',
    description: 'Ultra formel',
    defaultText: 'White tie — frac, gants pour dames (optionnel), tenue très formelle.',
    examples: ['Frac', 'Robe de bal', 'Gants'],
  },
  smart_casual: {
    label: 'Smart casual',
    description: 'Élégant décontracté',
    defaultText: 'Smart casual — élégant mais confortable.',
    examples: ['Pantalon chino', 'Chemise', 'Robe simple'],
  },
  traditional: {
    label: 'Traditionnel',
    description: 'Tenue traditionnelle',
    defaultText: 'Tenue traditionnelle souhaitée (pagne, boubou, dashiki…).',
    examples: ['Pagne chic', 'Boubou', 'Dashiki'],
  },
  theme_color: {
    label: 'Couleurs imposées',
    description: 'Palette de couleurs à respecter',
    defaultText: 'Merci de porter les couleurs indiquées ci-dessous.',
    examples: [],
  },
  outdoor: {
    label: 'Extérieur / Jardin',
    description: 'Confortable pour l\'extérieur',
    defaultText: 'Événement en extérieur — chaussures confortables, éviter talons trop fins.',
    examples: ['Chaussures plates', 'Sandales élégantes', 'Veste légère'],
  },
};

export const RECOMMENDATION_PRESETS: Record<
  RecommendationType,
  { label: string; defaultContent: string }
> = {
  parking: {
    label: 'Parking & accès',
    defaultContent: 'Parking disponible sur place. Accès par l\'entrée principale.',
  },
  gifts: {
    label: 'Cadeaux',
    defaultContent: 'Votre présence nous suffit amplement. Pas de cadeaux matériels, merci.',
  },
  cash_gift: {
    label: 'Enveloppe / Cotisation',
    defaultContent: 'Une contribution libre sera la bienvenue — urne sur place.',
  },
  weather: {
    label: 'Météo / Saison',
    defaultContent: 'Prévoir une veste légère en soirée si l\'événement se prolonge dehors.',
  },
  schedule: {
    label: 'Horaires clés',
    defaultContent: 'Accueil à 18h · Cérémonie à 19h · Dîner à 20h30.',
  },
  children: {
    label: 'Enfants',
    defaultContent: 'Événement réservé aux adultes, merci.',
  },
  photos: {
    label: 'Photos & réseaux',
    defaultContent: 'Photographe officiel sur place. Partagez vos photos avec le hashtag de l\'événement.',
  },
  transport: {
    label: 'Transport',
    defaultContent: 'Navettes disponibles depuis le centre-ville — horaires à confirmer.',
  },
  accessibility: {
    label: 'Accessibilité',
    defaultContent: 'Accès PMR et ascenseur disponibles.',
  },
  custom: {
    label: 'Autre',
    defaultContent: '',
  },
};

export function defaultGuestGuidelines(): GuestGuidelines {
  return {
    dressCode: { enabled: false, presetId: 'cocktail', examples: [] },
    recommendations: [],
    additionalNotes: '',
    showOnRsvp: true,
    showOnInvitation: true,
  };
}

export function normalizeGuestGuidelines(raw: unknown): GuestGuidelines {
  if (!raw || typeof raw !== 'object') return defaultGuestGuidelines();
  const g = raw as Partial<GuestGuidelines>;
  return {
    dressCode: {
      enabled: g.dressCode?.enabled ?? false,
      presetId: g.dressCode?.presetId ?? 'cocktail',
      themeColor: g.dressCode?.themeColor,
      themeColorLabel: g.dressCode?.themeColorLabel,
      customText: g.dressCode?.customText,
      examples: g.dressCode?.examples ?? [],
    },
    recommendations: Array.isArray(g.recommendations)
      ? g.recommendations.map((r) => ({
          id: r.id || `rec_${Math.random().toString(36).slice(2, 8)}`,
          type: r.type || 'custom',
          enabled: r.enabled ?? true,
          title: r.title,
          content: r.content || '',
        }))
      : [],
    additionalNotes: g.additionalNotes || '',
    showOnRsvp: g.showOnRsvp !== false,
    showOnInvitation: g.showOnInvitation !== false,
  };
}

export function getDressCodeShortLabel(guidelines: GuestGuidelines): string {
  const dc = guidelines.dressCode;
  if (!dc.enabled) return '';
  if (dc.presetId && dc.presetId !== 'custom' && DRESS_CODE_PRESETS[dc.presetId]) {
    return DRESS_CODE_PRESETS[dc.presetId].label;
  }
  return 'Tenue';
}

export function formatDressCodeText(guidelines: GuestGuidelines): string {
  const dc = guidelines.dressCode;
  if (!dc.enabled) return '';

  const parts: string[] = [];

  if (dc.presetId && dc.presetId !== 'custom' && DRESS_CODE_PRESETS[dc.presetId]) {
    parts.push(DRESS_CODE_PRESETS[dc.presetId].label);
  }

  if (dc.presetId === 'theme_color' && dc.themeColorLabel) {
    parts.push(`Couleurs : ${dc.themeColorLabel}`);
  } else if (dc.presetId === 'theme_color' && dc.themeColor) {
    parts.push(`Couleur imposée : ${dc.themeColor}`);
  }

  if (dc.customText?.trim()) {
    parts.push(dc.customText.trim());
  } else if (dc.presetId && dc.presetId !== 'custom' && DRESS_CODE_PRESETS[dc.presetId]) {
    parts.push(DRESS_CODE_PRESETS[dc.presetId].defaultText);
  }

  if (dc.examples && dc.examples.length > 0) {
    parts.push(`Exemples : ${dc.examples.join(', ')}`);
  }

  return parts.filter(Boolean).join(' · ');
}

export function formatRecommendationsText(guidelines: GuestGuidelines): string {
  const lines = guidelines.recommendations
    .filter((r) => r.enabled && r.content.trim())
    .map((r) => {
      const label = r.title || RECOMMENDATION_PRESETS[r.type]?.label || r.type;
      return `• ${label} : ${r.content.trim()}`;
    });
  return lines.join('\n');
}

export function formatGuestGuidelinesBlock(guidelines: GuestGuidelines): string {
  if (!guidelines.showOnInvitation) return '';
  const parts: string[] = [];
  const dress = formatDressCodeText(guidelines);
  if (dress) parts.push(`Tenue : ${dress}`);
  const recs = formatRecommendationsText(guidelines);
  if (recs) parts.push(recs);
  if (guidelines.additionalNotes?.trim()) {
    parts.push(guidelines.additionalNotes.trim());
  }
  return parts.join('\n\n');
}

export function hasVisibleGuestGuidelines(guidelines: GuestGuidelines | null | undefined): boolean {
  if (!guidelines || !guidelines.showOnRsvp) return false;
  if (guidelines.dressCode.enabled && formatDressCodeText(guidelines)) return true;
  if (guidelines.recommendations.some((r) => r.enabled && r.content.trim())) return true;
  if (guidelines.additionalNotes?.trim()) return true;
  return false;
}

export function createRecommendation(type: RecommendationType): GuestGuidelinesRecommendation {
  const preset = RECOMMENDATION_PRESETS[type];
  return {
    id: `rec_${Math.random().toString(36).slice(2, 10)}`,
    type,
    enabled: true,
    content: preset.defaultContent,
  };
}

export function applyInvitationGuidelineVariables(
  text: string,
  guidelines: GuestGuidelines | null | undefined,
): string {
  const g = normalizeGuestGuidelines(guidelines);
  const dressCode = g.showOnInvitation ? formatDressCodeText(g) : '';
  const dressCodeShort = g.showOnInvitation ? getDressCodeShortLabel(g) : '';
  const recommendations = g.showOnInvitation ? formatRecommendationsText(g) : '';
  const guestNotes = g.showOnInvitation ? (g.additionalNotes?.trim() || '') : '';
  const guestGuidelines = g.showOnInvitation ? formatGuestGuidelinesBlock(g) : '';

  return text
    .replaceAll('{{dressCode}}', dressCode)
    .replaceAll('{{dressCodeShort}}', dressCodeShort)
    .replaceAll('{{recommendations}}', recommendations)
    .replaceAll('{{guestNotes}}', guestNotes)
    .replaceAll('{{guestGuidelines}}', guestGuidelines);
}
