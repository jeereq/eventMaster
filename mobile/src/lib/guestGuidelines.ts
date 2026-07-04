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
  presetId?: string;
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

const DRESS_CODE_LABELS: Record<string, string> = {
  cocktail: 'Cocktail chic',
  black_tie: 'Black tie',
  white_tie: 'White tie',
  smart_casual: 'Smart casual',
  traditional: 'Traditionnel',
  theme_color: 'Couleur imposée',
  outdoor: 'En extérieur',
};

const RECOMMENDATION_LABELS: Record<string, string> = {
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

export function formatDressCodeText(guidelines: GuestGuidelines): string {
  const dc = guidelines.dressCode;
  if (!dc.enabled) return '';

  const parts: string[] = [];
  if (dc.presetId && DRESS_CODE_LABELS[dc.presetId]) {
    parts.push(DRESS_CODE_LABELS[dc.presetId]);
  }
  if (dc.presetId === 'theme_color' && dc.themeColorLabel) {
    parts.push(`Couleurs : ${dc.themeColorLabel}`);
  }
  if (dc.customText?.trim()) parts.push(dc.customText.trim());
  if (dc.examples?.length) parts.push(`Exemples : ${dc.examples.join(', ')}`);
  return parts.filter(Boolean).join(' · ');
}

export function hasVisibleGuestGuidelines(guidelines: GuestGuidelines | null | undefined): boolean {
  if (!guidelines || !guidelines.showOnRsvp) return false;
  if (guidelines.dressCode.enabled && formatDressCodeText(guidelines)) return true;
  if (guidelines.recommendations.some((r) => r.enabled && r.content.trim())) return true;
  if (guidelines.additionalNotes?.trim()) return true;
  return false;
}

export function getVisibleRecommendations(guidelines: GuestGuidelines) {
  return guidelines.recommendations.filter((r) => r.enabled && r.content.trim());
}

export function getRecommendationLabel(type: string, title?: string): string {
  return title || RECOMMENDATION_LABELS[type] || type;
}
