export interface LandingTemplate {
  id: string;
  name: string;
  category: 'private' | 'corporate' | 'casual';
  group: 'private' | 'corporate' | 'casual';
  description: string;
  style: {
    bg: string;
    border: string;
    textTitle: string;
    textBody: string;
    btnBg: string;
    btnText: string;
    /** Couleur de fond hex (modèles issus de la base) */
    bgColor?: string;
    borderColor?: string;
  };
  elements: Array<{
    type: 'text' | 'button' | 'rsvp';
    content: string;
    color?: string;
    fontSize?: string;
  }>;
  /** Contenu brut du concepteur visuel pour un aperçu fidèle sur la landing */
  previewContent?: {
    global?: {
      bgColor?: string;
      bgImageUrl?: string;
      bgPattern?: string;
      frameType?: string;
      [key: string]: unknown;
    };
    elements?: Array<Record<string, unknown>>;
  };
}

export const LANDING_TEMPLATE_GROUPS = [
  {
    id: 'private' as const,
    title: 'Célébrations privées',
    subtitle: 'Mariages, baptêmes et anniversaires avec une touche personnelle.',
  },
  {
    id: 'corporate' as const,
    title: 'Événements professionnels',
    subtitle: 'Galas, séminaires et lancements pour marquer les esprits.',
  },
  {
    id: 'casual' as const,
    title: 'Cocktails & soirées',
    subtitle: 'Formats dynamiques pour networking et moments conviviaux.',
  },
];

/** Anciens identifiants des modèles statiques (démo) — exclus de la vitrine DB. */
export const LEGACY_STATIC_LANDING_IDS = new Set([
  'wedding-elegant',
  'baptism-family',
  'birthday-milestone',
  'gala-prestige',
  'corporate-seminar',
  'product-launch',
  'cocktail-networking',
  'garden-party',
  'dj-club-night',
]);

/** @deprecated Vitrine landing = API uniquement. Conservé vide pour compatibilité imports. */
export const LANDING_TEMPLATES: LandingTemplate[] = [];

export function getLandingTemplatesByCategory(_category: string): LandingTemplate[] {
  return [];
}

export function getLandingTemplatesByCategoryFrom(
  templates: LandingTemplate[],
  category: string,
): LandingTemplate[] {
  if (category === 'all') return templates;
  return templates.filter((t) => t.category === category);
}

export function buildLandingTemplateGroups(templates: LandingTemplate[], category: string) {
  if (category === 'all') {
    return LANDING_TEMPLATE_GROUPS.map((group) => ({
      ...group,
      templates: templates.filter((t) => t.group === group.id),
    })).filter((g) => g.templates.length > 0);
  }
  const filtered = getLandingTemplatesByCategoryFrom(templates, category);
  return [{ id: category, title: '', subtitle: '', templates: filtered }];
}

export function getLandingTemplateGroups(category: string) {
  return buildLandingTemplateGroups([], category);
}
