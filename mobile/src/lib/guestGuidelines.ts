export type RecommendationType =
  | 'perks'
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
  imageUrls?: string[];
}

export interface GuestGuidelinesRecommendation {
  id: string;
  type: RecommendationType;
  enabled: boolean;
  title?: string;
  content: string;
  imageUrls?: string[];
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
  perks: 'Avantages & extras',
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

function parseImageUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === 'string' && /^https?:\/\//i.test(item.trim()))
    .map((item) => item.trim())
    .slice(0, 4);
}

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
      imageUrls: parseImageUrls(g.dressCode?.imageUrls),
    },
    recommendations: Array.isArray(g.recommendations)
      ? g.recommendations.map((r) => ({
          ...r,
          imageUrls: parseImageUrls(r.imageUrls),
        }))
      : [],
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

export function hasGuestGuidelinesContent(guidelines: GuestGuidelines | null | undefined): boolean {
  const g = normalizeGuestGuidelines(guidelines);
  if (g.dressCode.enabled && (formatDressCodeText(g) || (g.dressCode.imageUrls?.length ?? 0) > 0)) return true;
  if (g.recommendations.some((r) => r.enabled && (r.content.trim() || (r.imageUrls?.length ?? 0) > 0))) return true;
  if (g.additionalNotes?.trim()) return true;
  return false;
}

export function hasVisibleGuestGuidelines(guidelines: GuestGuidelines | null | undefined): boolean {
  if (!guidelines || !guidelines.showOnRsvp) return false;
  return hasGuestGuidelinesContent(guidelines);
}

export function getVisibleRecommendations(guidelines: GuestGuidelines) {
  return guidelines.recommendations.filter((r) => r.enabled && (r.content.trim() || (r.imageUrls?.length ?? 0) > 0));
}

export function getRecommendationLabel(type: string, title?: string): string {
  return title || RECOMMENDATION_LABELS[type] || type;
}
