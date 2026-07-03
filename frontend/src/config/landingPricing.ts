export type BillingCycle = 'monthly' | 'annual';

/** Réduction facturation annuelle (équivalent mensuel affiché). */
export const ANNUAL_DISCOUNT_PERCENT = 10;

export type PlanId =
  | 'FREE'
  | 'STANDARD'
  | 'PREMIUM_1'
  | 'PREMIUM_2'
  | 'ENTERPRISE_1'
  | 'ENTERPRISE_2'
  | 'ENTERPRISE_3';

export const PLAN_IDS: PlanId[] = [
  'FREE',
  'STANDARD',
  'PREMIUM_1',
  'PREMIUM_2',
  'ENTERPRISE_1',
  'ENTERPRISE_2',
  'ENTERPRISE_3',
];

export const PAID_PLAN_IDS: PlanId[] = PLAN_IDS.filter((id) => id !== 'FREE');

export const PREMIUM_PLAN_IDS: PlanId[] = ['PREMIUM_1', 'PREMIUM_2'];
export const ENTERPRISE_PLAN_IDS: PlanId[] = ['ENTERPRISE_1', 'ENTERPRISE_2', 'ENTERPRISE_3'];

export function formatFc(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FC`;
}

export function annualMonthlyEquivalent(monthlyFc: number): string {
  if (monthlyFc <= 0) return '0 FC';
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
  tier: 'essentials' | 'business' | 'premium' | 'enterprise';
  highlighted?: boolean;
  badge?: string;
  highlights: string[];
}

export const LANDING_PLANS: LandingPlan[] = [
  {
    id: 'FREE',
    ms365Name: 'Essentials',
    tagline: 'Découvrir EventMaster et organiser un premier événement.',
    monthlyPriceFc: 0,
    monthlyNote: 'Gratuit, sans carte bancaire',
    cta: 'Commencer gratuitement',
    ctaHref: '/register',
    ctaVariant: 'outline',
    tier: 'essentials',
    highlights: ['3 événements', '50 invités', 'RSVP & portail invité'],
  },
  {
    id: 'STANDARD',
    ms365Name: 'Business',
    tagline: 'Plusieurs réceptions par an avec protocole QR et salles standard.',
    monthlyPriceFc: 30000,
    monthlyNote: 'par organisation / mois',
    cta: 'Essayer Business',
    ctaHref: '/register',
    ctaVariant: 'primary',
    tier: 'business',
    highlights: ['8 événements · 150 invités', 'Protocole QR & émargement', '3 salles · 3 managers'],
  },
  {
    id: 'PREMIUM_1',
    ms365Name: 'Business Premium 1',
    tagline: 'Salles 2D avancées, modèles personnalisés et équipe élargie.',
    monthlyPriceFc: 55000,
    monthlyNote: 'par organisation / mois',
    cta: 'Choisir Premium 1',
    ctaHref: '/register',
    ctaVariant: 'primary',
    tier: 'premium',
    highlights: ['12 événements · 300 invités', 'Modèles custom · thèmes 2D', '5 salles · 5 managers'],
  },
  {
    id: 'PREMIUM_2',
    ms365Name: 'Business Premium 2',
    tagline: 'Protocole complet, notifications siège et gestion multi-salles.',
    monthlyPriceFc: 85000,
    monthlyNote: 'par organisation / mois',
    cta: 'Choisir Premium 2',
    ctaHref: '/register',
    ctaVariant: 'primary',
    tier: 'premium',
    highlighted: true,
    badge: 'Le plus populaire',
    highlights: ['20 événements · 500 invités', 'Vérification siège + WhatsApp', '10 salles · 10 managers'],
  },
  {
    id: 'ENTERPRISE_1',
    ms365Name: 'Business Enterprise 1',
    tagline: 'Volume élevé, rapports exportables et support prioritaire.',
    monthlyPriceFc: 350000,
    monthlyNote: 'par organisation / mois',
    cta: 'Choisir Enterprise 1',
    ctaHref: '/register',
    ctaVariant: 'primary',
    tier: 'enterprise',
    highlights: ['40 événements · 1 500 invités', 'Éditeur salle complet · rapports', '25 salles · 18 managers · support prioritaire'],
  },
  {
    id: 'ENTERPRISE_2',
    ms365Name: 'Business Enterprise 2',
    tagline: 'Agences avec réseau commercial intégré et commissions 20 %.',
    monthlyPriceFc: 525000,
    monthlyNote: 'par organisation / mois',
    cta: 'Choisir Enterprise 2',
    ctaHref: '/register',
    ctaVariant: 'primary',
    tier: 'enterprise',
    highlights: ['70 événements · 3 500 invités', 'Réseau commercial 20 %', '50 salles · 30 managers · support dédié'],
  },
  {
    id: 'ENTERPRISE_3',
    ms365Name: 'Business Enterprise 3',
    tagline: 'Illimité, multi-agences, SLA 24/7 et onboarding dédié.',
    monthlyPriceFc: 700000,
    monthlyNote: 'par organisation / mois',
    cta: 'Contacter les ventes',
    ctaHref: '/contact',
    ctaVariant: 'contact',
    tier: 'enterprise',
    badge: 'Sur-mesure',
    highlights: ['Quotas illimités', 'Multi-agences & API', 'SLA 24/7 · account manager'],
  },
];

/** Tableau comparatif — proposition fonctionnalités calibrée sur les prix. */
export const FEATURE_COMPARISON: PlanFeatureRow[] = [
  {
    category: 'Événements',
    label: 'Événements actifs',
    values: {
      FREE: '3',
      STANDARD: '8',
      PREMIUM_1: '12',
      PREMIUM_2: '20',
      ENTERPRISE_1: '40',
      ENTERPRISE_2: '70',
      ENTERPRISE_3: 'Illimité',
    },
  },
  {
    category: 'Événements',
    label: 'Invités (quota org.)',
    values: {
      FREE: '50',
      STANDARD: '150',
      PREMIUM_1: '300',
      PREMIUM_2: '500',
      ENTERPRISE_1: '1 500',
      ENTERPRISE_2: '3 500',
      ENTERPRISE_3: 'Illimité',
    },
  },
  {
    category: 'Événements',
    label: "Modèles d'invitation",
    values: {
      FREE: '2',
      STANDARD: '5',
      PREMIUM_1: '8',
      PREMIUM_2: '10',
      ENTERPRISE_1: '18',
      ENTERPRISE_2: '30',
      ENTERPRISE_3: 'Illimité',
    },
  },
  {
    category: 'Événements',
    label: 'Modèles personnalisés',
    values: {
      FREE: false,
      STANDARD: false,
      PREMIUM_1: true,
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
      STANDARD: '3',
      PREMIUM_1: '5',
      PREMIUM_2: '10',
      ENTERPRISE_1: '25',
      ENTERPRISE_2: '50',
      ENTERPRISE_3: 'Illimité',
    },
  },
  {
    category: 'Salles & plans',
    label: 'Éditeur de salle 2D',
    values: {
      FREE: 'Basique',
      STANDARD: 'Standard',
      PREMIUM_1: 'Avancé',
      PREMIUM_2: 'Avancé',
      ENTERPRISE_1: 'Complet',
      ENTERPRISE_2: 'Complet',
      ENTERPRISE_3: 'Complet',
    },
  },
  {
    category: 'Salles & plans',
    label: 'Thèmes & fixtures (scène, fleurs…)',
    values: {
      FREE: false,
      STANDARD: true,
      PREMIUM_1: true,
      PREMIUM_2: true,
      ENTERPRISE_1: true,
      ENTERPRISE_2: true,
      ENTERPRISE_3: true,
    },
  },
  {
    category: 'Équipe & rôles',
    label: 'Managers organisation',
    values: {
      FREE: '1',
      STANDARD: '3',
      PREMIUM_1: '5',
      PREMIUM_2: '10',
      ENTERPRISE_1: '18',
      ENTERPRISE_2: '30',
      ENTERPRISE_3: 'Illimité',
    },
  },
  {
    category: 'Équipe & rôles',
    label: 'Protocole org. / salle / événement',
    values: {
      FREE: false,
      STANDARD: true,
      PREMIUM_1: true,
      PREMIUM_2: true,
      ENTERPRISE_1: true,
      ENTERPRISE_2: true,
      ENTERPRISE_3: true,
    },
  },
  {
    category: 'Protocole',
    label: 'Scan QR caméra (émargement)',
    values: {
      FREE: false,
      STANDARD: true,
      PREMIUM_1: true,
      PREMIUM_2: true,
      ENTERPRISE_1: true,
      ENTERPRISE_2: true,
      ENTERPRISE_3: true,
    },
  },
  {
    category: 'Protocole',
    label: 'Notification placement invité (WA/SMS/e-mail)',
    values: {
      FREE: false,
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
    label: 'Portail RSVP + badge QR',
    values: {
      FREE: true,
      STANDARD: true,
      PREMIUM_1: true,
      PREMIUM_2: true,
      ENTERPRISE_1: true,
      ENTERPRISE_2: true,
      ENTERPRISE_3: true,
    },
  },
  {
    category: 'Invités',
    label: 'WhatsApp / SMS / E-mail',
    values: {
      FREE: true,
      STANDARD: true,
      PREMIUM_1: true,
      PREMIUM_2: true,
      ENTERPRISE_1: true,
      ENTERPRISE_2: true,
      ENTERPRISE_3: true,
    },
  },
  {
    category: 'Commercial',
    label: 'Réseau commercial & commissions 20 %',
    values: {
      FREE: false,
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
      STANDARD: 'E-mail',
      PREMIUM_1: 'E-mail',
      PREMIUM_2: 'Prioritaire',
      ENTERPRISE_1: 'Prioritaire',
      ENTERPRISE_2: 'Dédié',
      ENTERPRISE_3: 'SLA 24/7',
    },
  },
];

export const ROLE_HIGHLIGHTS = [
  {
    title: 'Manager organisation',
    description: "Pilote l'ensemble : équipe, salles, événements et modèles.",
    icon: 'shield',
  },
  {
    title: 'Protocole',
    description: 'Scan QR, authentification invités, vérification des sièges et commentaires — sans créer d\'événements.',
    icon: 'scan',
  },
  {
    title: 'Manager salle / événement',
    description: 'Périmètre restreint à une salle ou un événement précis.',
    icon: 'building',
  },
  {
    title: 'Commercial',
    description: 'Crée des organisations parrainées et suit ses commissions (20 % mensuel).',
    icon: 'briefcase',
  },
];

export const PLATFORM_PILLARS = [
  {
    title: 'Salles 2D & plans de table',
    description: 'Modèles banquet, conférence, amphithéâtre. Colonnes, scènes, fleurs, thèmes visuels et placement drag-and-drop.',
    icon: 'layout',
  },
  {
    title: 'Protocole intelligent',
    description: 'Scan caméra du QR invité, émargement, confirmation du siège et notification automatique (e-mail, WhatsApp, SMS).',
    icon: 'qr',
  },
  {
    title: 'Rôles granulaires',
    description: 'Propriétaire, manager org., protocole, managers salle/événement — chacun voit uniquement ce qu\'il doit gérer.',
    icon: 'users',
  },
  {
    title: 'RSVP & invitations',
    description: 'Neuf modèles, diffusion multi-canal, portail invité responsive avec plan de table et fil d\'actualité privé.',
    icon: 'mail',
  },
  {
    title: 'Multi-tenant sécurisé',
    description: 'Isolation stricte par organisation, OTP e-mail/WhatsApp, acceptation légale et licences SaaS.',
    icon: 'lock',
  },
  {
    title: 'Réseau commercial',
    description: 'Code parrainage, création d\'organisations et suivi des commissions sur facturation mensuelle.',
    icon: 'trending',
  },
];

export function getPlanDisplayPrice(plan: LandingPlan, cycle: BillingCycle, dbPrice?: string): string {
  if (plan.id === 'FREE') return '0 FC';
  if (cycle === 'monthly') {
    return dbPrice ? dbPrice : formatFc(plan.monthlyPriceFc);
  }
  const monthlyFc = dbPrice
    ? parseInt(dbPrice.replace(/[^\d]/g, ''), 10) || plan.monthlyPriceFc
    : plan.monthlyPriceFc;
  return annualMonthlyEquivalent(monthlyFc);
}

export function planTierLabel(tier: LandingPlan['tier']): string {
  switch (tier) {
    case 'essentials':
      return 'Découverte';
    case 'business':
      return 'Business';
    case 'premium':
      return 'Business Premium';
    case 'enterprise':
      return 'Business Enterprise';
  }
}
