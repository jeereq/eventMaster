export type BillingCycle = 'monthly' | 'annual';

export interface PlanFeatureRow {
  label: string;
  category: string;
  values: Record<string, string | boolean>;
}

export interface LandingPlan {
  id: 'FREE' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
  ms365Name: string;
  tagline: string;
  monthlyPrice: string;
  annualPrice: string;
  monthlyNote: string;
  cta: string;
  ctaHref: string;
  ctaVariant: 'outline' | 'primary' | 'contact';
  highlighted?: boolean;
  badge?: string;
}

export const LANDING_PLANS: LandingPlan[] = [
  {
    id: 'FREE',
    ms365Name: 'Essentials',
    tagline: 'Découvrir EventMaster et organiser un premier événement.',
    monthlyPrice: '0 FC',
    annualPrice: '0 FC',
    monthlyNote: 'Gratuit, sans carte bancaire',
    cta: 'Commencer gratuitement',
    ctaHref: '/register',
    ctaVariant: 'outline',
  },
  {
    id: 'STANDARD',
    ms365Name: 'Business',
    tagline: 'Pour les équipes qui gèrent plusieurs réceptions par an.',
    monthlyPrice: '30.000 FC',
    annualPrice: '25.000 FC',
    monthlyNote: 'par organisation / mois',
    cta: 'Essayer Business',
    ctaHref: '/register',
    ctaVariant: 'primary',
  },
  {
    id: 'PREMIUM',
    ms365Name: 'Business Premium',
    tagline: 'Salles 2D avancées, protocole QR et équipes multi-rôles.',
    monthlyPrice: '80.000 FC',
    annualPrice: '66.000 FC',
    monthlyNote: 'par organisation / mois',
    cta: 'Choisir Business Premium',
    ctaHref: '/register',
    ctaVariant: 'primary',
    highlighted: true,
    badge: 'Le plus populaire',
  },
  {
    id: 'ENTERPRISE',
    ms365Name: 'Enterprise',
    tagline: 'Agences, grands comptes et réseau commercial intégré.',
    monthlyPrice: '275.000 FC',
    annualPrice: 'Sur devis',
    monthlyNote: 'par organisation / mois',
    cta: 'Contacter les ventes',
    ctaHref: '/contact',
    ctaVariant: 'contact',
  },
];

export const FEATURE_COMPARISON: PlanFeatureRow[] = [
  { category: 'Événements', label: 'Événements actifs', values: { FREE: '3', STANDARD: '8', PREMIUM: '20', ENTERPRISE: 'Illimité' } },
  { category: 'Événements', label: 'Invités (quota org.)', values: { FREE: '50', STANDARD: '150', PREMIUM: '500', ENTERPRISE: 'Illimité' } },
  { category: 'Événements', label: 'Modèles d\'invitation', values: { FREE: '2', STANDARD: '5', PREMIUM: '10', ENTERPRISE: 'Illimité' } },
  { category: 'Événements', label: 'Modèles personnalisés', values: { FREE: false, STANDARD: false, PREMIUM: true, ENTERPRISE: true } },
  { category: 'Salles & plans', label: 'Éditeur de salle 2D', values: { FREE: 'Basique', STANDARD: 'Standard', PREMIUM: 'Avancé', ENTERPRISE: 'Complet' } },
  { category: 'Salles & plans', label: 'Thèmes & fixtures (scène, fleurs…)', values: { FREE: false, STANDARD: true, PREMIUM: true, ENTERPRISE: true } },
  { category: 'Salles & plans', label: 'Import plan salle → événement', values: { FREE: false, STANDARD: true, PREMIUM: true, ENTERPRISE: true } },
  { category: 'Équipe & rôles', label: 'Manager organisation (accès global)', values: { FREE: '1', STANDARD: '3', PREMIUM: '10', ENTERPRISE: 'Illimité' } },
  { category: 'Équipe & rôles', label: 'Protocole org. / salle / événement', values: { FREE: false, STANDARD: true, PREMIUM: true, ENTERPRISE: true } },
  { category: 'Équipe & rôles', label: 'Managers salle & événement', values: { FREE: false, STANDARD: true, PREMIUM: true, ENTERPRISE: true } },
  { category: 'Protocole', label: 'Scan QR caméra (émargement)', values: { FREE: false, STANDARD: true, PREMIUM: true, ENTERPRISE: true } },
  { category: 'Protocole', label: 'Vérification placement & notification invité', values: { FREE: false, STANDARD: true, PREMIUM: true, ENTERPRISE: true } },
  { category: 'Protocole', label: 'Commentaires protocole par invité', values: { FREE: false, STANDARD: true, PREMIUM: true, ENTERPRISE: true } },
  { category: 'Invités', label: 'Portail RSVP + badge QR', values: { FREE: true, STANDARD: true, PREMIUM: true, ENTERPRISE: true } },
  { category: 'Invités', label: 'WhatsApp / SMS / E-mail', values: { FREE: true, STANDARD: true, PREMIUM: true, ENTERPRISE: true } },
  { category: 'Commercial', label: 'Réseau commercial & commissions 20 %', values: { FREE: false, STANDARD: false, PREMIUM: false, ENTERPRISE: true } },
  { category: 'Support', label: 'Support prioritaire & SLA', values: { FREE: false, STANDARD: false, PREMIUM: 'E-mail', ENTERPRISE: 'Dédié 24/7' } },
];

export const ROLE_HIGHLIGHTS = [
  {
    title: 'Manager organisation',
    description: 'Pilote l\'ensemble : équipe, salles, événements et modèles.',
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
