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

const DRESS_CODE_PRESETS: Record<
  Exclude<DressCodePresetId, 'custom'>,
  { label: string; defaultText: string }
> = {
  cocktail: { label: 'Cocktail chic', defaultText: 'Tenue cocktail chic — robe ou costume élégant.' },
  black_tie: { label: 'Black tie', defaultText: 'Black tie — smoking ou robe longue.' },
  white_tie: { label: 'White tie', defaultText: 'White tie — tenue très formelle.' },
  smart_casual: { label: 'Smart casual', defaultText: 'Smart casual — élégant mais confortable.' },
  traditional: { label: 'Traditionnel', defaultText: 'Tenue traditionnelle souhaitée.' },
  theme_color: { label: 'Couleurs imposées', defaultText: 'Merci de porter les couleurs indiquées.' },
  outdoor: { label: 'Extérieur / Jardin', defaultText: 'Événement en extérieur — chaussures confortables.' },
};

const RECOMMENDATION_LABELS: Record<RecommendationType, string> = {
  parking: 'Parking & accès',
  gifts: 'Cadeaux',
  cash_gift: 'Enveloppe / Cotisation',
  weather: 'Météo / Saison',
  schedule: 'Horaires clés',
  children: 'Enfants',
  photos: 'Photos & réseaux',
  transport: 'Transport',
  accessibility: 'Accessibilité',
  custom: 'Autre',
};

export function normalizeGuestGuidelines(raw: unknown): GuestGuidelines {
  if (!raw || typeof raw !== 'object') {
    return {
      dressCode: { enabled: false },
      recommendations: [],
      showOnRsvp: true,
      showOnInvitation: true,
    };
  }
  const g = raw as Partial<GuestGuidelines>;
  return {
    dressCode: {
      enabled: g.dressCode?.enabled ?? false,
      presetId: g.dressCode?.presetId,
      themeColor: g.dressCode?.themeColor,
      themeColorLabel: g.dressCode?.themeColorLabel,
      customText: g.dressCode?.customText,
      examples: g.dressCode?.examples ?? [],
    },
    recommendations: Array.isArray(g.recommendations) ? g.recommendations : [],
    additionalNotes: g.additionalNotes || '',
    showOnRsvp: g.showOnRsvp !== false,
    showOnInvitation: g.showOnInvitation !== false,
  };
}

function formatDressCodeText(guidelines: GuestGuidelines): string {
  const dc = guidelines.dressCode;
  if (!dc.enabled) return '';
  const parts: string[] = [];
  if (dc.presetId && dc.presetId !== 'custom' && DRESS_CODE_PRESETS[dc.presetId]) {
    parts.push(DRESS_CODE_PRESETS[dc.presetId].label);
  }
  if (dc.presetId === 'theme_color' && dc.themeColorLabel) {
    parts.push(`Couleurs : ${dc.themeColorLabel}`);
  }
  if (dc.customText?.trim()) {
    parts.push(dc.customText.trim());
  } else if (dc.presetId && dc.presetId !== 'custom' && DRESS_CODE_PRESETS[dc.presetId]) {
    parts.push(DRESS_CODE_PRESETS[dc.presetId].defaultText);
  }
  if (dc.examples?.length) {
    parts.push(`Exemples : ${dc.examples.join(', ')}`);
  }
  return parts.filter(Boolean).join(' · ');
}

function getDressCodeShortLabel(guidelines: GuestGuidelines): string {
  const dc = guidelines.dressCode;
  if (!dc.enabled) return '';
  if (dc.presetId && dc.presetId !== 'custom' && DRESS_CODE_PRESETS[dc.presetId]) {
    return DRESS_CODE_PRESETS[dc.presetId].label;
  }
  return 'Tenue';
}

function formatRecommendationsText(guidelines: GuestGuidelines): string {
  return guidelines.recommendations
    .filter((r) => r.enabled && r.content.trim())
    .map((r) => {
      const label = r.title || RECOMMENDATION_LABELS[r.type] || r.type;
      return `• ${label} : ${r.content.trim()}`;
    })
    .join('\n');
}

function formatGuestGuidelinesBlock(guidelines: GuestGuidelines): string {
  if (!guidelines.showOnInvitation) return '';
  const parts: string[] = [];
  const dress = formatDressCodeText(guidelines);
  if (dress) parts.push(`Tenue : ${dress}`);
  const recs = formatRecommendationsText(guidelines);
  if (recs) parts.push(recs);
  if (guidelines.additionalNotes?.trim()) parts.push(guidelines.additionalNotes.trim());
  return parts.join('\n\n');
}

export function applyInvitationGuidelineVariables(
  text: string,
  guidelinesRaw: unknown,
): string {
  const g = normalizeGuestGuidelines(guidelinesRaw);
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
