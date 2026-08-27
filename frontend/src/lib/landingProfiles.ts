import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  CalendarCheck,
  Heart,
  LayoutGrid,
  Mail,
  ScanLine,
  Shirt,
  Sparkles,
  Store,
  Users,
  Wallet,
  Briefcase,
  MessageSquare,
} from 'lucide-react';

export type LandingProfileId = 'personal' | 'pro' | 'seeker' | 'vendor';
export type LandingPricingAudience = 'B2B' | 'B2C' | 'VENDOR';

export type LandingJourneyStep = {
  title: string;
  description: string;
  detail: string;
  outcome: string;
  icon: LucideIcon;
};

/** Ancres de la landing — le hero y envoie selon le profil. */
export type LandingSectionId = 'parcours' | 'produit' | 'modeles' | 'salles' | 'catalogue' | 'prestataires' | 'tarifs';

export type LandingProfile = {
  id: LandingProfileId;
  label: string;
  shortLabel: string;
  eyebrow: string;
  title: string;
  intro: string;
  examples: string;
  clicks: [string, string, string];
  /** Cibles des 3 clics (ancres landing ou pages). */
  clickHrefs: [string, string, string];
  /** Section vers laquelle le choix de profil fait défiler. */
  sectionId: LandingSectionId;
  exploreCta: { href: string; label: string };
  cta: { href: string; label: string };
  registerHint: string;
  results: Array<{ icon: LucideIcon; label: string }>;
  steps: LandingJourneyStep[];
  pricingAudience: LandingPricingAudience;
  faqIds: string[];
  icon: LucideIcon;
};

/** Slogan landing — promesse unique, visible dès le premier écran. */
export const LANDING_SLOGAN = {
  lead: 'Votre événement,',
  highlight: 'maîtrisé de A à Z',
  full: 'Votre prochain événement, maîtrisé de A à Z.',
} as const;

export const LANDING_PROFILES: LandingProfile[] = [
  {
    id: 'personal',
    label: 'Célébrer une fête ou un mariage',
    shortLabel: 'Fête & Mariage',
    eyebrow: 'Particulier',
    title: 'Votre fête réussie en 3 étapes simples',
    intro: 'Créez votre événement, invitez sur WhatsApp et placez vos invités sur plan 2D/3D.',
    examples: 'Mariage, anniversaire, baptême, fête privée.',
    clicks: ['1. Créer la fête', '2. Inviter WhatsApp', '3. Plan & Scan QR'],
    clickHrefs: ['#parcours', '#modeles', '#produit'],
    sectionId: 'parcours',
    exploreCta: { href: '#parcours', label: 'Découvrir les étapes' },
    cta: { href: '/register?kind=ORGANIZER&intent=personal', label: 'Créer mon événement (Gratuit)' },
    registerHint: 'Éditeur de salle 2D/3D complet inclus. Sans carte bancaire.',
    results: [
      { icon: Heart, label: 'Faire-part & RSVP' },
      { icon: LayoutGrid, label: 'Plan de table 3D' },
      { icon: ScanLine, label: 'Pass QR Jour J' },
    ],
    icon: Heart,
    pricingAudience: 'B2C',
    faqIds: ['what-is-eventmaster', 'mobile-app', 'placement-delivery', 'free-trial', 'b2c-annual'],
    steps: [
      {
        title: '1. Créer la fête',
        description: 'Titre, date, lieu et dress code en 1 minute.',
        detail: 'Renseignez l’essentiel. Vos invités retrouvent le plan d’accès, le dress code et les infos pratiques directement sur leur lien personnel.',
        outcome: 'Votre événement est en ligne, prêt à accueillir vos proches.',
        icon: CalendarCheck,
      },
      {
        title: '2. Inviter sur WhatsApp',
        description: 'Un lien d’invitation unique par invité, sans app à installer.',
        detail: 'Envoyez vos invitations en 1 clic par WhatsApp ou SMS. Suivez les confirmations (RSVP) et choix de repas en temps réel.',
        outcome: 'Vos réponses RSVP se mettent à jour automatiquement.',
        icon: Mail,
      },
      {
        title: '3. Placer sur plan 2D/3D',
        description: 'Glissez-déposez vos invités sur les tables.',
        detail: 'Positionnez tables rondes, rectangulaires, allées et lustres. Dès que l’invité confirme, il découvre sa table et son pass QR.',
        outcome: 'Chaque invité sait où s’asseoir avant d’arriver.',
        icon: LayoutGrid,
      },
      {
        title: '4. Scanner à l’entrée',
        description: 'Accueil rapide le jour J depuis votre smartphone.',
        detail: 'Scannez le badge QR de vos invités à l’entrée. Validation instantanée et indication directe de leur table.',
        outcome: 'Zéro file d’attente, accueil VIP garanti.',
        icon: ScanLine,
      },
    ],
  },
  {
    id: 'pro',
    label: 'Organiser des événements Pro & Billetterie',
    shortLabel: 'Pro & Agence',
    eyebrow: 'Professionnel',
    title: 'Billetterie, protocole et gestion multi-événements',
    intro: 'Vendez vos billets par zone (VIP / Standard), encaissez en Mobile Money et pilotez votre équipe d’accueil.',
    examples: 'Concerts, conférences, galas, agences événementielles.',
    clicks: ['1. Billetterie & Prix', '2. Ventes Mobile Money', '3. Desk Protocole'],
    clickHrefs: ['#parcours', '#catalogue', '#produit'],
    sectionId: 'parcours',
    exploreCta: { href: '#parcours', label: 'Découvrir le workflow pro' },
    cta: { href: '/register?kind=ORGANIZER&intent=pro', label: 'Lancer mon espace Pro' },
    registerHint: 'Gestion d’équipe, billetterie multi-zones et scan jour J.',
    results: [
      { icon: Wallet, label: 'Billetterie FlexPay' },
      { icon: Users, label: 'Équipe & Rôles' },
      { icon: ScanLine, label: 'Scanner Protocole' },
    ],
    icon: Sparkles,
    pricingAudience: 'B2B',
    faqIds: ['what-is-eventmaster', 'public-events', 'roles', 'protocol-qr', 'plans-quotas', 'room-editor-plans'],
    steps: [
      {
        title: '1. Configurer la billetterie',
        description: 'Zones de prix (VIP, Carré d’or, Standard) et jauge.',
        detail: 'Définissez le plan de salle avec tarification par zone ou placement libre. Paiements sécurisés en Franc Congolais (CDF).',
        outcome: 'Page de billetterie prête à recevoir les acheteurs.',
        icon: CalendarCheck,
      },
      {
        title: '2. Encaisser en direct',
        description: 'Paiements par M-Pesa, Orange Money, Airtel et Visa.',
        detail: 'Les acheteurs sélectionnent leur place et paient en quelques secondes. Réception immédiate du badge QR sécurisé.',
        outcome: 'Recettes enregistrées et billets délivrés automatiquement.',
        icon: Wallet,
      },
      {
        title: '3. Coordonner l’équipe',
        description: 'Accès dédiés pour vos managers et agents de protocole.',
        detail: 'Attribuez des rôles précis sans partager vos identifiants administrateur. Suivez les présences et l’avancement en direct.',
        outcome: 'Équipe autonome et périmètres sécurisés.',
        icon: Users,
      },
      {
        title: '4. Contrôle d’accès Jour J',
        description: 'Scan QR ultra-rapide et orientation des invités.',
        detail: 'Scanner intégré pour les agents d’accueil avec signal sonore, contrôle anti-doublon et affichage immédiat de la table/siège.',
        outcome: 'Contrôle fluide et rapport d’émargement en temps réel.',
        icon: ScanLine,
      },
    ],
  },
  {
    id: 'seeker',
    label: 'Trouver une salle ou un prestataire',
    shortLabel: 'Explorer & Réserver',
    eyebrow: 'Client marketplace',
    title: 'Trouvez et réservez les meilleurs lieux et talents',
    intro: 'Comparez les salles avec visite 3D, sélectionnez traiteurs, photographes, DJ et demandez vos devis gratuitement.',
    examples: 'Salles de fête, traiteurs, décorateurs, DJ, sonorisation.',
    clicks: ['1. Explorer la carte', '2. Comparer les offres', '3. Demander un devis'],
    clickHrefs: ['#salles', '#catalogue', '#prestataires'],
    sectionId: 'salles',
    exploreCta: { href: '#salles', label: 'Explorer le catalogue' },
    cta: { href: '/marketplace', label: 'Explorer les lieux & prestataires' },
    registerHint: 'Compte gratuit sans engagement. Devis directs.',
    results: [
      { icon: Building2, label: 'Salles 3D & Tarifs' },
      { icon: Store, label: 'Prestataires vérifiés' },
      { icon: MessageSquare, label: 'Devis en direct' },
    ],
    icon: Store,
    pricingAudience: 'B2C',
    faqIds: ['marketplace-venues', 'client-account', 'event-packs', 'marketplace-booking'],
    steps: [
      {
        title: '1. Explorer',
        description: 'Salles et métiers filtrés par ville, capacité et budget.',
        detail: 'Recherche géolocalisée interactive. Consultez les photos HD, les plans de salle et les équipements disponibles.',
        outcome: 'Trouvez les lieux et prestataires adaptés à vos critères.',
        icon: LayoutGrid,
      },
      {
        title: '2. Composer votre pack',
        description: 'Rassemblez salle, traiteur et déco dans votre sélection.',
        detail: 'Enregistrez vos coups de cœur et comparez les tarifs en toute transparence pour respecter votre budget.',
        outcome: 'Une sélection complète et harmonieuse pour votre événement.',
        icon: Heart,
      },
      {
        title: '3. Demander un devis',
        description: 'Contactez directement les professionnels sans frais.',
        detail: 'Transmettez votre date et vos besoins. Échangez facilement pour obtenir une proposition adaptée.',
        outcome: 'Devis personnalisé reçu rapidement.',
        icon: MessageSquare,
      },
      {
        title: '4. Bloquer la date',
        description: 'Confirmez votre réservation en toute sécurité.',
        detail: 'Versez l’acompte convenu directement au prestataire pour garantir la disponibilité de votre date.',
        outcome: 'Votre lieu et vos prestataires sont réservés.',
        icon: CalendarCheck,
      },
    ],
  },
  {
    id: 'vendor',
    label: 'Référencer ma salle ou mes services',
    shortLabel: 'Propriétaire & Pro',
    eyebrow: 'Salle & prestataire',
    title: 'Augmentez vos réservations et valorisez votre espace',
    intro: 'Publiez votre fiche avec visite 3D, recevez des demandes qualifiées et gérez votre planning de réservations.',
    examples: 'Propriétaires de salle, traiteurs, décorateurs, photographes.',
    clicks: ['1. Publier ma fiche', '2. Recevoir des devis', '3. Bloquer les dates'],
    clickHrefs: ['#tarifs', '#parcours', '#salles'],
    sectionId: 'tarifs',
    exploreCta: { href: '#tarifs', label: 'Voir les forfaits' },
    cta: { href: '/register?kind=VENDOR&intent=vendor', label: 'Référencer mon activité' },
    registerHint: 'Visibilité maximale et éditeur de salle 3D inclus.',
    results: [
      { icon: Building2, label: 'Vitrine 3D & Photos' },
      { icon: MessageSquare, label: 'Demandes qualifiées' },
      { icon: CalendarCheck, label: 'Planning réservations' },
    ],
    icon: Briefcase,
    pricingAudience: 'VENDOR',
    faqIds: ['marketplace-booking', 'free-trial', 'plans-quotas', 'room-editor-plans', 'upgrade'],
    steps: [
      {
        title: '1. Créer votre vitrine',
        description: 'Photos HD, tarifs, capacités et modélisation de salle.',
        detail: 'Mettez en valeur vos espaces avec notre éditeur 2D/3D immersif pour séduire instantanément les organisateurs.',
        outcome: 'Votre fiche professionnelle est visible sur la marketplace.',
        icon: Briefcase,
      },
      {
        title: '2. Recevoir des demandes',
        description: 'Notifications directes pour chaque demande de devis.',
        detail: 'Consultez les dates et besoins des clients, échangez en direct et envoyez vos propositions tarifaires.',
        outcome: 'De nouvelles opportunités d’affaires qualifiées.',
        icon: MessageSquare,
      },
      {
        title: '3. Valider l’acompte',
        description: 'Paiement direct et sécurisation de la date.',
        detail: 'Encaissez l’acompte selon vos modalités habituelles et confirmez la réservation dans votre calendrier.',
        outcome: 'Date bloquée sans risque de sur-réservation.',
        icon: Wallet,
      },
      {
        title: '4. Préparer l’événement',
        description: 'Partage du plan de salle avec l’organisateur.',
        detail: 'Le client utilise votre plan de salle pour son placement d’invités et son protocole le jour de l’événement.',
        outcome: 'Prestation maîtrisée et client satisfait.',
        icon: CalendarCheck,
      },
    ],
  },
];

export function getLandingProfile(id: LandingProfileId | string | null | undefined): LandingProfile {
  return LANDING_PROFILES.find((item) => item.id === id) || LANDING_PROFILES[0];
}

export function isLandingProfileId(value: string | null | undefined): value is LandingProfileId {
  return value === 'personal' || value === 'pro' || value === 'seeker' || value === 'vendor';
}

export function scrollToLandingSection(sectionId: string) {
  if (typeof document === 'undefined') return;
  const run = () => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  requestAnimationFrame(() => requestAnimationFrame(run));
}
