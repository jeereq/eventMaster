export type BillingCycle = 'monthly' | 'annual';

/** Réduction facturation annuelle (équivalent mensuel affiché). */
export const ANNUAL_DISCOUNT_PERCENT = 10;

export type PlanAudience = 'B2B' | 'B2C' | 'VENUE' | 'SERVICE' | 'CATALOG';

export type PlanId =
  | 'FREE'
  | 'PERSONAL_50'
  | 'PERSONAL_100'
  | 'PERSONAL_200'
  | 'PERSONAL_PLUS'
  | 'STANDARD'
  | 'PREMIUM_1'
  | 'PREMIUM_2'
  | 'ENTERPRISE_1'
  | 'ENTERPRISE_2'
  | 'ENTERPRISE_3'
  | 'VENUE'
  | 'SERVICE'
  | 'CATALOG';

export const PLAN_IDS: PlanId[] = [
  'FREE',
  'PERSONAL_50',
  'PERSONAL_100',
  'PERSONAL_200',
  'PERSONAL_PLUS',
  'STANDARD',
  'PREMIUM_1',
  'PREMIUM_2',
  'ENTERPRISE_1',
  'ENTERPRISE_2',
  'ENTERPRISE_3',
  'VENUE',
  'SERVICE',
  'CATALOG',
];

export const PAID_PLAN_IDS: PlanId[] = PLAN_IDS.filter((id) => id !== 'FREE');

export const B2C_PLAN_IDS: PlanId[] = [
  'PERSONAL_50',
  'PERSONAL_100',
  'PERSONAL_200',
  'PERSONAL_PLUS',
];

export const MONTH_BILLING_DAYS = 30;
export const B2C_BILLING_DAYS = 90;
export const YEAR_BILLING_DAYS = 365;

export function isB2cPlanId(id: string): boolean {
  return B2C_PLAN_IDS.includes(id as PlanId) || id.startsWith('PERSONAL');
}

export function durationDaysForPlan(id: string, cycle: BillingCycle = 'monthly'): number {
  if (cycle === 'annual') return YEAR_BILLING_DAYS;
  if (isB2cPlanId(id)) return B2C_BILLING_DAYS;
  return MONTH_BILLING_DAYS;
}

export interface DurationPreset {
  days: number;
  label: string;
  annual?: boolean;
}

export function durationPresetsForPlan(id: string): DurationPreset[] {
  if (id === 'FREE') return [];
  if (isB2cPlanId(id)) {
    return [
      { days: B2C_BILLING_DAYS, label: 'Trimestre (90 j)' },
      { days: YEAR_BILLING_DAYS, label: 'Annuel (365 j)', annual: true },
    ];
  }
  return [
    { days: MONTH_BILLING_DAYS, label: 'Mois (30 j)' },
    { days: YEAR_BILLING_DAYS, label: 'Annuel (365 j)', annual: true },
  ];
}

export function planPricePeriodSuffix(id: string): string {
  if (id === 'FREE') return '';
  return isB2cPlanId(id) ? '/ trimestre' : '/ mois';
}

export const VENDOR_PLAN_IDS: PlanId[] = ['VENUE', 'SERVICE', 'CATALOG'];
export const B2B_PLAN_IDS: PlanId[] = PLAN_IDS.filter(
  (id) => !B2C_PLAN_IDS.includes(id) && !VENDOR_PLAN_IDS.includes(id),
);

const B2B_PAID_IDS: PlanId[] = B2B_PLAN_IDS.filter((id) => id !== 'FREE');

/** Forfaits payants visibles en facturation selon le type de compte. */
export function paidPlanIdsForAccountKind(kind?: string | null): PlanId[] {
  switch (kind) {
    case 'CLIENT':
      return [];
    case 'VENDOR':
      return [...VENDOR_PLAN_IDS];
    case 'BOTH':
      return [...B2C_PLAN_IDS, ...VENDOR_PLAN_IDS, ...B2B_PAID_IDS];
    case 'ORGANIZER':
    default:
      return [...B2C_PLAN_IDS, ...B2B_PAID_IDS];
  }
}

export function planAudience(id: PlanId): PlanAudience {
  if (B2C_PLAN_IDS.includes(id)) return 'B2C';
  if (id === 'VENUE' || id === 'SERVICE' || id === 'CATALOG') return id;
  return 'B2B';
}

export function planAudienceLabel(audience: PlanAudience | string): string {
  switch (audience) {
    case 'B2C':
      return 'B2C';
    case 'VENUE':
      return 'Salle';
    case 'SERVICE':
      return 'Presta';
    case 'CATALOG':
      return 'Marketplace';
    default:
      return 'B2B';
  }
}

export const PREMIUM_PLAN_IDS: PlanId[] = ['PREMIUM_1', 'PREMIUM_2'];
export const ENTERPRISE_PLAN_IDS: PlanId[] = ['ENTERPRISE_1', 'ENTERPRISE_2', 'ENTERPRISE_3'];

/** Devise unique de la plateforme : franc congolais. */
export const CURRENCY_CODE = 'FC';
export const CURRENCY_NAME = 'franc congolais';

export function formatFc(amount: number): string {
  return `${Number(amount || 0).toLocaleString('fr-FR')} ${CURRENCY_CODE}`;
}

/** Normalise un libellé de prix (jamais USD/EUR). */
export function ensureFcPrice(price?: string | null, fallbackFc?: number): string {
  const raw = (price || '').trim();
  if (raw && !/[\$€£]|USD|EUR/i.test(raw) && /\d/.test(raw)) {
    if (/FC|CDF/i.test(raw)) return raw.replace(/CDF/gi, CURRENCY_CODE);
    return `${raw} ${CURRENCY_CODE}`;
  }
  return formatFc(fallbackFc ?? 0);
}

export function annualMonthlyEquivalent(monthlyFc: number): string {
  if (monthlyFc <= 0) return formatFc(0);
  return formatFc(Math.round(monthlyFc * (1 - ANNUAL_DISCOUNT_PERCENT / 100)));
}

export interface PlanFeatureRow {
  label: string;
  category: string;
  values: Record<PlanId, string | boolean>;
}

export interface LandingPlan {
  id: PlanId;
  ms365Name: string;
  tagline: string;
  monthlyPriceFc: number;
  monthlyNote: string;
  cta: string;
  ctaHref: string;
  ctaVariant: 'outline' | 'primary' | 'contact';
  tier: 'essentials' | 'personal' | 'business' | 'premium' | 'enterprise' | 'venue' | 'service' | 'catalog';
  audience: PlanAudience;
  highlighted?: boolean;
  badge?: string;
  highlights: string[];
}

export const LANDING_PLANS: LandingPlan[] = [
  {
    id: 'FREE',
    ms365Name: 'Essentials',
    tagline: 'Découverte : tester EventMaster (organisation ou 1 salle / 1 prestation).',
    monthlyPriceFc: 0,
    monthlyNote: 'Gratuit, sans carte bancaire',
    cta: 'Essayer sans carte',
    ctaHref: '/register',
    ctaVariant: 'outline',
    tier: 'essentials',
    audience: 'B2B',
    highlights: ['3 événements · 50 invités', 'RSVP & portail invité', '1 salle simple · 1 prestation'],
  },
  {
    id: 'PERSONAL_50',
    ms365Name: 'Particulier 50',
    tagline: 'Mariage, anniversaire, fête privée jusqu’à 50 invités — sans marketplace.',
    monthlyPriceFc: 60000,
    monthlyNote: 'par particulier / trimestre',
    cta: 'Organiser jusqu’à 50 invités',
    ctaHref: '/register?kind=ORGANIZER',
    ctaVariant: 'primary',
    tier: 'personal',
    audience: 'B2C',
    badge: '50 invités',
    highlights: ['3 événements · 50 invités', 'QR, modèles custom, éditeur 2D', '2 salles plan de table · hors marketplace'],
  },
  {
    id: 'PERSONAL_100',
    ms365Name: 'Particulier 100',
    tagline: 'Fête privée jusqu’à 100 invités : organisation complète, sans marketplace.',
    monthlyPriceFc: 90000,
    monthlyNote: 'par particulier / trimestre',
    cta: 'Organiser jusqu’à 100 invités',
    ctaHref: '/register?kind=ORGANIZER',
    ctaVariant: 'primary',
    tier: 'personal',
    audience: 'B2C',
    badge: '100 invités',
    highlights: ['3 événements · 100 invités', 'QR, modèles custom, éditeur 2D', '2 salles plan de table · hors marketplace'],
  },
  {
    id: 'PERSONAL_200',
    ms365Name: 'Particulier 200',
    tagline: 'Fête privée jusqu’à 200 invités : organisation complète, sans marketplace.',
    monthlyPriceFc: 120000,
    monthlyNote: 'par particulier / trimestre',
    cta: 'Organiser jusqu’à 200 invités',
    ctaHref: '/register?kind=ORGANIZER',
    ctaVariant: 'primary',
    tier: 'personal',
    audience: 'B2C',
    highlighted: true,
    badge: '200 invités',
    highlights: ['3 événements · 200 invités', 'QR, modèles custom, éditeur 2D', '2 salles plan de table · hors marketplace'],
  },
  {
    id: 'PERSONAL_PLUS',
    ms365Name: 'Particulier +200',
    tagline: 'Grande fête privée : plus de 200 invités, quota invités illimité, sans marketplace.',
    monthlyPriceFc: 180000,
    monthlyNote: 'par particulier / trimestre',
    cta: 'Organiser plus de 200 invités',
    ctaHref: '/register?kind=ORGANIZER',
    ctaVariant: 'primary',
    tier: 'personal',
    audience: 'B2C',
    badge: '+200 invités',
    highlights: ['3 événements · invités illimités', 'QR, modèles custom, éditeur 2D', '2 salles plan de table · hors marketplace'],
  },
  {
    id: 'STANDARD',
    ms365Name: 'Business',
    tagline: 'B2B — plusieurs réceptions par an avec protocole QR et salles standard.',
    monthlyPriceFc: 30000,
    monthlyNote: 'par organisation / mois',
    cta: 'Passer en Business',
    ctaHref: '/register',
    ctaVariant: 'primary',
    tier: 'business',
    audience: 'B2B',
    highlights: ['8 événements · 150 invités', 'Protocole QR web', '3 salles · thèmes & fixtures'],
  },
  {
    id: 'PREMIUM_1',
    ms365Name: 'Business Premium 1',
    tagline: 'B2B — éditeur visuel, import maquette et formulaires RSVP analytiques.',
    monthlyPriceFc: 55000,
    monthlyNote: 'par organisation / mois',
    cta: 'Débloquer Premium 1',
    ctaHref: '/register',
    ctaVariant: 'primary',
    tier: 'premium',
    audience: 'B2B',
    highlights: ['12 événements · 500 invités', 'Modèles custom · import image', 'Taille canvas · champs RSVP stats'],
  },
  {
    id: 'PREMIUM_2',
    ms365Name: 'Business Premium 2',
    tagline: 'B2B — OCR maquette, protocole complet et notifications siège.',
    monthlyPriceFc: 85000,
    monthlyNote: 'par organisation / mois',
    cta: 'Prendre le plus demandé',
    ctaHref: '/register',
    ctaVariant: 'primary',
    tier: 'premium',
    audience: 'B2B',
    highlighted: true,
    badge: 'Le plus populaire',
    highlights: ['20 événements · 1 000 invités', 'OCR texte · PDF dès RSVP', 'GPS WhatsApp · vérification siège'],
  },
  {
    id: 'ENTERPRISE_1',
    ms365Name: 'Business Enterprise 1',
    tagline: 'B2B — volume élevé, rapports exportables et support prioritaire.',
    monthlyPriceFc: 350000,
    monthlyNote: 'par organisation / mois',
    cta: 'Gérer un gros volume',
    ctaHref: '/register',
    ctaVariant: 'primary',
    tier: 'enterprise',
    audience: 'B2B',
    highlights: ['40 événements · 3 500 invités', 'Rapports & export commissions', '25 salles · support prioritaire'],
  },
  {
    id: 'ENTERPRISE_2',
    ms365Name: 'Business Enterprise 2',
    tagline: 'B2B — réseau commercial intégré avec commissions 30 % sur facturation.',
    monthlyPriceFc: 525000,
    monthlyNote: 'par organisation / mois',
    cta: 'Activer le réseau commercial',
    ctaHref: '/register',
    ctaVariant: 'primary',
    tier: 'enterprise',
    audience: 'B2B',
    highlights: ['70 événements · 5 000 invités', 'Espace commercial dédié', '50 salles · support dédié'],
  },
  {
    id: 'ENTERPRISE_3',
    ms365Name: 'Business Enterprise 3',
    tagline: 'B2B — illimité, multi-agences, SLA 24/7 et onboarding dédié.',
    monthlyPriceFc: 700000,
    monthlyNote: 'par organisation / mois',
    cta: 'Parler à un conseiller',
    ctaHref: '/contact',
    ctaVariant: 'contact',
    tier: 'enterprise',
    audience: 'B2B',
    badge: 'Sur-mesure',
    highlights: ['Quotas illimités', 'Multi-agences & API', 'SLA 24/7 · account manager'],
  },
  {
    id: 'VENUE',
    ms365Name: 'Salle',
    tagline: 'Gestionnaire de salles : jusqu’à 5 lieux, éditeur 2D complet et protocole QR.',
    monthlyPriceFc: 14900,
    monthlyNote: 'par gestionnaire de salles / mois',
    cta: 'Mettre mes salles en ligne',
    ctaHref: '/register?kind=VENDOR',
    ctaVariant: 'primary',
    tier: 'venue',
    audience: 'VENUE',
    highlighted: true,
    badge: 'Salles',
    highlights: ['5 salles · éditeur 2D complet', 'Banquet, tente, custom', 'Protocole QR sur place'],
  },
  {
    id: 'SERVICE',
    ms365Name: 'Prestataire',
    tagline: 'Fiches services illimitées, photos / vidéos, rayon et calendrier de disponibilité.',
    monthlyPriceFc: 9900,
    monthlyNote: 'par prestataire / mois',
    cta: 'Publier mes prestations',
    ctaHref: '/register?kind=VENDOR',
    ctaVariant: 'primary',
    tier: 'service',
    audience: 'SERVICE',
    badge: 'Prestas',
    highlights: ['Prestations illimitées', 'Rayon d’intervention & carte', 'Demandes et réservations'],
  },
  {
    id: 'CATALOG',
    ms365Name: 'Salle & presta',
    tagline: 'Les deux : 5 salles (éditeur complet) et 5 prestations — pack moins cher que Salle + Prestataire.',
    monthlyPriceFc: 19900,
    monthlyNote: 'par offre mixte / mois',
    cta: 'Vendre salles et prestas',
    ctaHref: '/register?kind=BOTH',
    ctaVariant: 'primary',
    tier: 'catalog',
    audience: 'CATALOG',
    badge: 'Les deux',
    highlights: ['5 salles + 5 prestations', 'Pack ~20 % vs Salle + Prestataire', 'Éditeur 2D complet · QR'],
  },
];

type VendorPlanId = 'VENUE' | 'SERVICE' | 'CATALOG';

function fillVendorPlans(
  rows: Array<{
    category: string;
    label: string;
    values: Partial<Record<PlanId, string | boolean>>;
  }>,
): PlanFeatureRow[] {
  const vendorFallback: Record<VendorPlanId, string | boolean> = {
    VENUE: false,
    SERVICE: false,
    CATALOG: false,
  };
  return rows.map((row) => ({
    ...row,
    values: { ...vendorFallback, ...row.values } as Record<PlanId, string | boolean>,
  }));
}

function b2cSame<T extends string | boolean>(
  v: T,
): Record<'PERSONAL_50' | 'PERSONAL_100' | 'PERSONAL_200' | 'PERSONAL_PLUS', T> {
  return {
    PERSONAL_50: v,
    PERSONAL_100: v,
    PERSONAL_200: v,
    PERSONAL_PLUS: v,
  };
}

/** Tableau comparatif — proposition fonctionnalités calibrée sur les prix. */
export const FEATURE_COMPARISON: PlanFeatureRow[] = fillVendorPlans([
  {
    category: 'Événements',
    label: 'Événements actifs',
    values: {
      FREE: '3',
      ...b2cSame('3'),
      STANDARD: '8',
      PREMIUM_1: '12',
      PREMIUM_2: '20',
      ENTERPRISE_1: '40',
      ENTERPRISE_2: '70',
      ENTERPRISE_3: 'Illimité',
      VENUE: '3',
      SERVICE: '—',
      CATALOG: '3',
    },
  },
  {
    category: 'Événements',
    label: 'Invités (quota org.)',
    values: {
      FREE: '50',
      PERSONAL_50: '50',
      PERSONAL_100: '100',
      PERSONAL_200: '200',
      PERSONAL_PLUS: 'Illimité',
      STANDARD: '150',
      PREMIUM_1: '500',
      PREMIUM_2: '1 000',
      ENTERPRISE_1: '3 500',
      ENTERPRISE_2: '5 000',
      ENTERPRISE_3: 'Illimité',
      VENUE: '100',
      SERVICE: '—',
      CATALOG: '100',
    },
  },
  {
    category: 'Événements',
    label: "Modèles d'invitation",
    values: {
      FREE: '2',
      ...b2cSame('Illimité'),
      STANDARD: '5',
      PREMIUM_1: '8',
      PREMIUM_2: '10',
      ENTERPRISE_1: '18',
      ENTERPRISE_2: '30',
      ENTERPRISE_3: 'Illimité',
      VENUE: '2',
      SERVICE: '—',
      CATALOG: '2',
    },
  },
  {
    category: 'Événements',
    label: 'Modèles personnalisés',
    values: {
      FREE: false,
      ...b2cSame(true),
      STANDARD: false,
      PREMIUM_1: true,
      PREMIUM_2: true,
      ENTERPRISE_1: true,
      ENTERPRISE_2: true,
      ENTERPRISE_3: true,
    },
  },
  {
    category: 'Événements',
    label: 'Import maquette (image + palette)',
    values: {
      FREE: false,
      ...b2cSame(true),
      STANDARD: false,
      PREMIUM_1: true,
      PREMIUM_2: true,
      ENTERPRISE_1: true,
      ENTERPRISE_2: true,
      ENTERPRISE_3: true,
    },
  },
  {
    category: 'Événements',
    label: 'OCR texte sur maquette',
    values: {
      FREE: false,
      ...b2cSame(true),
      STANDARD: false,
      PREMIUM_1: false,
      PREMIUM_2: true,
      ENTERPRISE_1: true,
      ENTERPRISE_2: true,
      ENTERPRISE_3: true,
    },
  },
  {
    category: 'Salles & plans',
    label: 'Salles organisation',
    values: {
      FREE: '1',
      ...b2cSame('2'),
      STANDARD: '3',
      PREMIUM_1: '5',
      PREMIUM_2: '10',
      ENTERPRISE_1: '25',
      ENTERPRISE_2: '50',
      ENTERPRISE_3: 'Illimité',
      VENUE: '5',
      SERVICE: '—',
      CATALOG: '5',
    },
  },
  {
    category: 'Salles & plans',
    label: 'Prestations marketplace',
    values: {
      FREE: '1',
      ...b2cSame('—'),
      STANDARD: '—',
      PREMIUM_1: '—',
      PREMIUM_2: '—',
      ENTERPRISE_1: '—',
      ENTERPRISE_2: '—',
      ENTERPRISE_3: '—',
      VENUE: '—',
      SERVICE: 'Illimité',
      CATALOG: '5',
    },
  },
  {
    category: 'Salles & plans',
    label: 'Éditeur de salle 2D',
    values: {
      FREE: 'Basique',
      ...b2cSame('Complet'),
      STANDARD: 'Standard',
      PREMIUM_1: 'Avancé',
      PREMIUM_2: 'Avancé',
      ENTERPRISE_1: 'Complet',
      ENTERPRISE_2: 'Complet',
      ENTERPRISE_3: 'Complet',
      VENUE: 'Complet',
      SERVICE: '—',
      CATALOG: 'Complet',
    },
  },
  {
    category: 'Salles & plans',
    label: 'Thèmes & fixtures (scène, fleurs…)',
    values: {
      FREE: false,
      ...b2cSame(true),
      STANDARD: true,
      PREMIUM_1: true,
      PREMIUM_2: true,
      ENTERPRISE_1: true,
      ENTERPRISE_2: true,
      ENTERPRISE_3: true,
      VENUE: true,
      SERVICE: false,
      CATALOG: true,
    },
  },
  {
    category: 'Équipe & rôles',
    label: 'Managers organisation',
    values: {
      FREE: '1',
      ...b2cSame('1'),
      STANDARD: '3',
      PREMIUM_1: '5',
      PREMIUM_2: '10',
      ENTERPRISE_1: '18',
      ENTERPRISE_2: '30',
      ENTERPRISE_3: 'Illimité',
      VENUE: '3',
      SERVICE: '2',
      CATALOG: '3',
    },
  },
  {
    category: 'Équipe & rôles',
    label: 'Protocole org. / salle / événement',
    values: {
      FREE: false,
      ...b2cSame(true),
      STANDARD: true,
      PREMIUM_1: true,
      PREMIUM_2: true,
      ENTERPRISE_1: true,
      ENTERPRISE_2: true,
      ENTERPRISE_3: true,
      VENUE: true,
      SERVICE: false,
      CATALOG: true,
    },
  },
  {
    category: 'Protocole',
    label: 'Scan QR caméra (confirmation de présence)',
    values: {
      FREE: false,
      ...b2cSame(true),
      STANDARD: true,
      PREMIUM_1: true,
      PREMIUM_2: true,
      ENTERPRISE_1: true,
      ENTERPRISE_2: true,
      ENTERPRISE_3: true,
      VENUE: true,
      SERVICE: false,
      CATALOG: true,
    },
  },
  {
    category: 'Protocole',
    label: 'Notification placement invité (WA / e-mail)',
    values: {
      FREE: false,
      ...b2cSame(true),
      STANDARD: false,
      PREMIUM_1: true,
      PREMIUM_2: true,
      ENTERPRISE_1: true,
      ENTERPRISE_2: true,
      ENTERPRISE_3: true,
      VENUE: true,
      SERVICE: false,
      CATALOG: true,
    },
  },
  {
    category: 'Protocole',
    label: 'Livraison PDF + GPS dès acceptation RSVP',
    values: {
      FREE: false,
      ...b2cSame(true),
      STANDARD: false,
      PREMIUM_1: true,
      PREMIUM_2: true,
      ENTERPRISE_1: true,
      ENTERPRISE_2: true,
      ENTERPRISE_3: true,
    },
  },
  {
    category: 'Mobile',
    label: 'Application iOS & Android (en construction, non déployée)',
    values: {
      FREE: false,
      ...b2cSame(false),
      STANDARD: false,
      PREMIUM_1: false,
      PREMIUM_2: false,
      ENTERPRISE_1: false,
      ENTERPRISE_2: false,
      ENTERPRISE_3: false,
    },
  },
  {
    category: 'Mobile',
    label: 'Scan QR protocole (app caméra native — bientôt)',
    values: {
      FREE: false,
      ...b2cSame(false),
      STANDARD: false,
      PREMIUM_1: false,
      PREMIUM_2: false,
      ENTERPRISE_1: false,
      ENTERPRISE_2: false,
      ENTERPRISE_3: false,
    },
  },
  {
    category: 'Mobile',
    label: 'Notifications push (app — bientôt)',
    values: {
      FREE: false,
      ...b2cSame(false),
      STANDARD: false,
      PREMIUM_1: false,
      PREMIUM_2: false,
      ENTERPRISE_1: false,
      ENTERPRISE_2: false,
      ENTERPRISE_3: false,
    },
  },
  {
    category: 'Invités',
    label: 'Portail RSVP + badge QR',
    values: {
      FREE: true,
      ...b2cSame(true),
      STANDARD: true,
      PREMIUM_1: true,
      PREMIUM_2: true,
      ENTERPRISE_1: true,
      ENTERPRISE_2: true,
      ENTERPRISE_3: true,
      VENUE: true,
      SERVICE: false,
      CATALOG: true,
    },
  },
  {
    category: 'Invités',
    label: 'Formulaires RSVP analytiques (export CSV)',
    values: {
      FREE: false,
      ...b2cSame(true),
      STANDARD: false,
      PREMIUM_1: true,
      PREMIUM_2: true,
      ENTERPRISE_1: true,
      ENTERPRISE_2: true,
      ENTERPRISE_3: true,
    },
  },
  {
    category: 'Invités',
    label: 'WhatsApp / E-mail',
    values: {
      FREE: true,
      ...b2cSame(true),
      STANDARD: true,
      PREMIUM_1: true,
      PREMIUM_2: true,
      ENTERPRISE_1: true,
      ENTERPRISE_2: true,
      ENTERPRISE_3: true,
      VENUE: true,
      SERVICE: true,
      CATALOG: true,
    },
  },
  {
    category: 'Commercial',
    label: 'Réseau commercial & commissions 30 %',
    values: {
      FREE: false,
      ...b2cSame(false),
      STANDARD: false,
      PREMIUM_1: false,
      PREMIUM_2: false,
      ENTERPRISE_1: false,
      ENTERPRISE_2: true,
      ENTERPRISE_3: true,
    },
  },
  {
    category: 'Rapports',
    label: 'Export revenus & commissions (admin)',
    values: {
      FREE: false,
      ...b2cSame(true),
      STANDARD: false,
      PREMIUM_1: false,
      PREMIUM_2: false,
      ENTERPRISE_1: true,
      ENTERPRISE_2: true,
      ENTERPRISE_3: true,
    },
  },
  {
    category: 'Support',
    label: 'Support & SLA',
    values: {
      FREE: 'Communauté',
      ...b2cSame('E-mail'),
      STANDARD: 'E-mail',
      PREMIUM_1: 'E-mail',
      PREMIUM_2: 'Prioritaire',
      ENTERPRISE_1: 'Prioritaire',
      ENTERPRISE_2: 'Dédié',
      ENTERPRISE_3: 'SLA 24/7',
      VENUE: 'E-mail',
      SERVICE: 'E-mail',
      CATALOG: 'E-mail',
    },
  },
]);

export const ROLE_HIGHLIGHTS = [
  {
    title: 'Manager organisation',
    description: "Pilote l'ensemble : équipe, salles, événements et modèles.",
    icon: 'shield',
  },
  {
    title: 'Protocole',
    description: 'Scan QR dans le navigateur (caméra web, pas l’app native), confirmation de présence et validation du siège. L’app iOS/Android est en construction.',
    icon: 'scan',
  },
  {
    title: 'Gestionnaire de salle',
    description: 'Publie ses lieux sur le marketplace, gère les réservations et le plan 2D. Forfait Salle ou Salle & presta — distinct du manager salle employé d’une organisation.',
    icon: 'building',
  },
  {
    title: 'Prestataire',
    description: 'Publie métiers (traiteur, photo, DJ…) et locations (habits, voitures, motos, matériel), sans limite de fiches dès l’abonnement Prestataire payé. Forfait Prestataire ou Salle & presta.',
    icon: 'briefcase',
  },
  {
    title: 'Client marketplace',
    description: 'Cherche une salle, un métier ou une location : favoris, partage d’une recherche ou d’une fiche, simulation de budget (packs économique / équilibré / confort) et suivi des réservations, sans créer d’événement.',
    icon: 'heart',
  },
  {
    title: 'Commercial',
    description: 'Crée des organisations parrainées et suit ses commissions (30 % mensuel).',
    icon: 'briefcase',
  },
];

export const PLATFORM_PILLARS = [
  {
    title: 'Salles 2D & plans de table',
    description: 'Banquet, conférence, amphithéâtre, tente. Tables, sièges, scènes et thèmes. Placement glisser-déposer ; le plan s’importe sur l’événement lié.',
    icon: 'layout',
  },
  {
    title: 'Protocole QR (web)',
    description: 'Scan du badge dans le navigateur (téléphone ou tablette), check-in et validation du siège. L’app native caméra n’est pas encore déployée.',
    icon: 'qr',
  },
  {
    title: 'Application mobile',
    description: 'iOS et Android en construction, hors stores. RSVP, protocole et tableau de bord fonctionnent déjà dans le navigateur mobile.',
    icon: 'smartphone',
  },
  {
    title: 'Invitations & RSVP',
    description: 'E-mail ou WhatsApp : le premier message contient uniquement le lien RSVP. PDF, plan de table et GPS partent après acceptation et place assignée (Premium 1+).',
    icon: 'mail',
  },
  {
    title: 'Marketplace salles & prestas',
    description: 'Salles avec plan 2D, métiers (traiteur, photo, DJ…) et locations (habits, voitures, motos, matériel). Favoris, packs éco / équilibré / confort, partage d’URL. Acompte 30 % hors plateforme · commission vendeur 8 %.',
    icon: 'calendar',
  },
  {
    title: 'Rôles granulaires',
    description: 'Propriétaire, manager org., protocole, managers salle/événement, commercial org. — chacun ne voit que son périmètre.',
    icon: 'users',
  },
  {
    title: 'Multi-tenant sécurisé',
    description: 'Isolation par organisation, OTP e-mail ou WhatsApp, acceptation légale et licences SaaS. Le compte client n’exige pas d’abonnement.',
    icon: 'lock',
  },
  {
    title: 'Réseau commercial',
    description: 'Code de parrainage, création d’organisations et commissions (30 % sur la facturation de période).',
    icon: 'trending',
  },
];

export function parsePriceFc(price: string): number {
  return parseInt(price.replace(/[^\d]/g, ''), 10) || 0;
}

export function computePromoSavingsPercent(catalogFc: number, promoFc: number): number | null {
  if (catalogFc <= 0 || promoFc <= 0 || promoFc >= catalogFc) return null;
  return Math.round((1 - promoFc / catalogFc) * 100);
}

export interface PlanCapabilityBadge {
  id: string;
  label: string;
  tone: 'indigo' | 'violet' | 'emerald' | 'amber' | 'rose';
}

export function getPlanCapabilityBadges(planId: PlanId): PlanCapabilityBadge[] {
  const badges: PlanCapabilityBadge[] = [];
  const custom = FEATURE_COMPARISON.find((r) => r.label === 'Modèles personnalisés')?.values[planId];
  const mockup = FEATURE_COMPARISON.find((r) => r.label === 'Import maquette (image + palette)')?.values[planId];
  const ocr = FEATURE_COMPARISON.find((r) => r.label === 'OCR texte sur maquette')?.values[planId];
  const commercial = FEATURE_COMPARISON.find((r) => r.label === 'Réseau commercial & commissions 30 %')?.values[planId];
  const rsvpAnalytics = FEATURE_COMPARISON.find((r) => r.label === 'Formulaires RSVP analytiques (export CSV)')?.values[planId];

  if (custom) badges.push({ id: 'custom', label: 'Éditeur visuel', tone: 'indigo' });
  if (mockup) badges.push({ id: 'mockup', label: 'Import maquette', tone: 'violet' });
  if (ocr) badges.push({ id: 'ocr', label: 'OCR maquette', tone: 'violet' });
  if (rsvpAnalytics) badges.push({ id: 'rsvp', label: 'RSVP analytique', tone: 'emerald' });
  if (commercial) badges.push({ id: 'commercial', label: 'Réseau commercial', tone: 'amber' });
  if (planId === 'FREE') badges.push({ id: 'starter', label: 'Gratuit', tone: 'emerald' });
  if (B2C_PLAN_IDS.includes(planId)) badges.push({ id: 'b2c', label: 'Particulier B2C', tone: 'amber' });
  if (planId === 'VENUE') badges.push({ id: 'venue', label: 'Gestionnaire de salles', tone: 'emerald' });
  if (planId === 'SERVICE') badges.push({ id: 'service', label: 'Prestataire', tone: 'indigo' });
  if (planId === 'CATALOG') badges.push({ id: 'catalog', label: 'Salles & prestas', tone: 'violet' });
  if (planId.startsWith('ENTERPRISE_3')) badges.push({ id: 'unlimited', label: 'Illimité', tone: 'rose' });

  return badges;
}

/** Prix affiché : `monthlyPriceFc` de la BD en priorité, puis libellé `price`, puis fallback landing. */
export function resolvePlanMonthlyFc(
  plan: Pick<LandingPlan, 'monthlyPriceFc'>,
  db?: { price?: string | null; monthlyPriceFc?: number | null } | null,
): number {
  if (db?.monthlyPriceFc != null && Number.isFinite(db.monthlyPriceFc)) {
    return db.monthlyPriceFc;
  }
  if (db?.price) {
    const parsed = parsePriceFc(db.price);
    if (parsed > 0) return parsed;
  }
  return plan.monthlyPriceFc;
}

export function getPlanDisplayPrice(
  plan: LandingPlan,
  cycle: BillingCycle,
  dbPrice?: string | null,
  dbMonthlyFc?: number | null,
): string {
  if (plan.id === 'FREE') return formatFc(0);
  const monthlyFc = resolvePlanMonthlyFc(plan, {
    price: dbPrice,
    monthlyPriceFc: dbMonthlyFc,
  });
  if (cycle === 'monthly') return formatFc(monthlyFc);
  return annualMonthlyEquivalent(monthlyFc);
}

export function planTierLabel(tier: LandingPlan['tier']): string {
  switch (tier) {
    case 'essentials':
      return 'Découverte';
    case 'personal':
      return 'Particulier';
    case 'business':
      return 'Business';
    case 'premium':
      return 'Business Premium';
    case 'enterprise':
      return 'Business Enterprise';
    case 'venue':
      return 'Salles';
    case 'service':
      return 'Prestataire';
    case 'catalog':
      return 'Marketplace';
  }
}
