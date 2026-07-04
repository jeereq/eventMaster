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
    highlights: ['3 événements · 50 invités', 'RSVP & portail invité', 'Modèles standards inclus'],
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
    highlights: ['8 événements · 150 invités', 'Protocole QR web & mobile', '3 salles · thèmes & fixtures'],
  },
  {
    id: 'PREMIUM_1',
    ms365Name: 'Business Premium 1',
    tagline: 'Éditeur visuel, import maquette et formulaires RSVP analytiques.',
    monthlyPriceFc: 55000,
    monthlyNote: 'par organisation / mois',
    cta: 'Choisir Premium 1',
    ctaHref: '/register',
    ctaVariant: 'primary',
    tier: 'premium',
    highlights: ['12 événements · 500 invités', 'Modèles custom · import image', 'Taille canvas · champs RSVP stats'],
  },
  {
    id: 'PREMIUM_2',
    ms365Name: 'Business Premium 2',
    tagline: 'OCR maquette, protocole complet et notifications siège.',
    monthlyPriceFc: 85000,
    monthlyNote: 'par organisation / mois',
    cta: 'Choisir Premium 2',
    ctaHref: '/register',
    ctaVariant: 'primary',
    tier: 'premium',
    highlighted: true,
    badge: 'Le plus populaire',
    highlights: ['20 événements · 1 000 invités', 'OCR texte · PDF après check-in', 'GPS WhatsApp · vérification siège'],
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
    highlights: ['40 événements · 3 500 invités', 'Rapports & export commissions', '25 salles · support prioritaire'],
  },
  {
    id: 'ENTERPRISE_2',
    ms365Name: 'Business Enterprise 2',
    tagline: 'Réseau commercial intégré avec commissions 20 % sur facturation.',
    monthlyPriceFc: 525000,
    monthlyNote: 'par organisation / mois',
    cta: 'Choisir Enterprise 2',
    ctaHref: '/register',
    ctaVariant: 'primary',
    tier: 'enterprise',
    highlights: ['70 événements · 5 000 invités', 'Espace commercial dédié', '50 salles · support dédié'],
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
      PREMIUM_1: '500',
      PREMIUM_2: '1 000',
      ENTERPRISE_1: '3 500',
      ENTERPRISE_2: '5 000',
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
    category: 'Événements',
    label: 'Import maquette (image + palette)',
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
    category: 'Événements',
    label: 'OCR texte sur maquette',
    values: {
      FREE: false,
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
    label: 'Scan QR caméra (confirmation de présence)',
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
    label: 'Notification placement invité (WA / e-mail)',
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
    category: 'Protocole',
    label: 'Livraison différée PDF + GPS après check-in',
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
    category: 'Mobile',
    label: 'Application iOS & Android',
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
    category: 'Mobile',
    label: 'Scan QR protocole (caméra native)',
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
    category: 'Mobile',
    label: 'Notifications push (Expo)',
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
    label: 'Formulaires RSVP analytiques (export CSV)',
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
    label: 'WhatsApp / E-mail',
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
    description: 'Scan QR caméra (web ou app mobile), confirmation de présence, validation du siège et déclenchement automatique de la livraison placement.',
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
    description: 'Scan QR web ou application mobile, confirmation de présence, validation du siège et livraison automatique PDF + plan + GPS.',
    icon: 'qr',
  },
  {
    title: 'Application mobile native',
    description: 'iOS & Android : RSVP invité, protocole jour J, scan caméra, notifications push, deep links et thème sombre.',
    icon: 'smartphone',
  },
  {
    title: 'RSVP & invitations',
    description: 'Modèles visuels, diffusion multi-canal (e-mail, WhatsApp), portail invité responsive avec badge QR et fil d\'actualité privé.',
    icon: 'mail',
  },
  {
    title: 'Rôles granulaires',
    description: 'Propriétaire, manager org., protocole, managers salle/événement — chacun voit uniquement ce qu\'il doit gérer.',
    icon: 'users',
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
  const commercial = FEATURE_COMPARISON.find((r) => r.label === 'Réseau commercial & commissions 20 %')?.values[planId];
  const rsvpAnalytics = FEATURE_COMPARISON.find((r) => r.label === 'Formulaires RSVP analytiques (export CSV)')?.values[planId];

  if (custom) badges.push({ id: 'custom', label: 'Éditeur visuel', tone: 'indigo' });
  if (mockup) badges.push({ id: 'mockup', label: 'Import maquette', tone: 'violet' });
  if (ocr) badges.push({ id: 'ocr', label: 'OCR maquette', tone: 'violet' });
  if (rsvpAnalytics) badges.push({ id: 'rsvp', label: 'RSVP analytique', tone: 'emerald' });
  if (commercial) badges.push({ id: 'commercial', label: 'Réseau commercial', tone: 'amber' });
  if (planId === 'FREE') badges.push({ id: 'starter', label: 'Gratuit', tone: 'emerald' });
  if (planId.startsWith('ENTERPRISE_3')) badges.push({ id: 'unlimited', label: 'Illimité', tone: 'rose' });

  return badges;
}

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
