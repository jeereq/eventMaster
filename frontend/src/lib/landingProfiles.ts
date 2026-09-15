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
import { motionSafeScrollBehavior } from '@/lib/prefersReducedMotion';

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
export type LandingSectionId = 'profils' | 'editeur' | 'modeles' | 'simulateur-ia' | 'salles' | 'catalogue' | 'prestataires' | 'tarifs';

export type LandingProfile = {
  id: LandingProfileId;
  label: string;
  shortLabel: string;
  eyebrow: string;
  targetAudience: string;
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
  /** Photo de fond pour les cartes hero (orientation par besoin). */
  imageUrl: string;
};

/** Slogan landing — promesse unique, visible dès le premier écran. */
export const LANDING_SLOGAN = {
  lead: 'Votre événement,',
  highlight: 'maîtrisé de A à Z',
  full: 'Votre événement réussi, sans stress ni complexité.',
} as const;

export const LANDING_PROFILES: LandingProfile[] = [
  {
    id: 'personal',
    label: 'Fête & Mariage',
    shortLabel: 'Fête & Mariage',
    eyebrow: 'Particulier',
    targetAudience: 'Mariages, anniversaires et réceptions privées',
    title: 'Votre fête en 3 étapes',
    intro: 'Faire-part WhatsApp, plan de table 2D/3D et accueil invité au smartphone.',
    examples: 'Mariage, anniversaire, baptême, fête privée.',
    clicks: ['1. Créer la fête', '2. Inviter WhatsApp', '3. Plan & Scan QR'],
    clickHrefs: ['#profils', '/modeles', '#editeur'],
    sectionId: 'editeur',
    exploreCta: { href: '#editeur', label: 'Découvrir l’éditeur' },
    cta: { href: '/register?kind=ORGANIZER&intent=personal', label: 'Créer mon événement' },
    registerHint: 'Éditeur 2D/3D inclus. Sans carte bancaire.',
    results: [
      { icon: Heart, label: 'Faire-part & Répondez s’il vous plaît WhatsApp avec IA' },
      { icon: LayoutGrid, label: 'Plan de table 2D & 3D photoréaliste' },
      { icon: Sparkles, label: 'Simulateur budget IA (4 essais gratuits)' },
      { icon: ScanLine, label: 'Pass QR & Personnalisation invité' },
    ],
    icon: Heart,
    imageUrl: 'https://i.pinimg.com/1200x/81/58/1b/81581bb9fe9108c7f9d5c405a4f0389e.jpg',
    pricingAudience: 'B2C',
    faqIds: ['what-is-eventmaster', 'event-packs', 'mobile-app', 'placement-delivery', 'shared-tickets-personalization', 'ai-invitations-context', 'free-trial', 'b2c-annual'],
    steps: [
      {
        title: '1. Créer l’événement',
        description: 'Titre, date, lieu et dress code en 1 minute.',
        detail: 'Renseignez l’essentiel. Vos invités retrouvent les infos pratiques et leur pass sur leur lien personnel.',
        outcome: 'Lien de l’événement prêt.',
        icon: CalendarCheck,
      },
      {
        title: '2. Inviter sur WhatsApp',
        description: 'Lien unique par invité, sans application.',
        detail: 'Envoyez vos invitations en 1 clic. Vos convives confirment leur présence (Répondez s’il vous plaît) et personnalisent leurs coordonnées.',
        outcome: 'Confirmations et régimes alimentaires en direct.',
        icon: Mail,
      },
      {
        title: '3. Placer sur plan 2D/3D',
        description: 'Glissez vos invités sur les tables en direct.',
        detail: 'Agencez tables rondes, allées et lustres avec rendu 3D réaliste. Vos invités visualisent leur place avant d’arriver.',
        outcome: 'Placement visuel sans stress.',
        icon: LayoutGrid,
      },
      {
        title: '4. Scanner à l’entrée',
        description: 'Accueil au smartphone en 2 secondes.',
        detail: 'Scannez le badge QR à l’entrée pour valider la présence et orienter l’invité vers sa table.',
        outcome: 'Entrée fluide sans attente.',
        icon: ScanLine,
      },
    ],
  },
  {
    id: 'pro',
    label: 'Billetterie & Événements Pro',
    shortLabel: 'Billetterie Pro',
    eyebrow: 'Concerts, Conférences & Galas',
    targetAudience: 'Concerts, conférences, galas et agences',
    title: 'Billetterie et contrôle d’accès QR',
    intro: 'Billetterie Mobile Money, protocole QR — et catalogue salle + prestations inclus dès Business.',
    examples: 'Concerts, festivals, conférences, galas d’entreprise, séminaires, spectacles.',
    clicks: ['1. Billetterie & Tarifs', '2. Paiements Mobile Money', '3. Contrôle d’accès QR'],
    clickHrefs: ['/tarifs', '#catalogue', '#editeur'],
    sectionId: 'editeur',
    exploreCta: { href: '/tarifs', label: 'Découvrir les forfaits pro' },
    cta: { href: '/register?kind=ORGANIZER&intent=pro&action=ticketing', label: 'Créer ma billetterie' },
    registerHint: 'Organisation Business+ : événements et vitrine catalogue dans le même forfait.',
    results: [
      { icon: Wallet, label: 'Paiements Orange Money, M-Pesa, Airtel & Cartes' },
      { icon: ScanLine, label: 'Présence auto-validée & Scan QR anti-fraude' },
      { icon: Users, label: 'Billets partagés personnalisables par l’acheteur' },
      { icon: Sparkles, label: 'Simulateur budget IA dédié en FC & USD' },
    ],
    icon: Sparkles,
    imageUrl: 'https://i.pinimg.com/736x/8e/7c/81/8e7c81136e2f481af7114856524906ae.jpg',
    pricingAudience: 'B2B',
    faqIds: ['what-is-eventmaster', 'public-events', 'event-donations', 'collection-payouts', 'shared-tickets-personalization', 'event-packs', 'roles', 'protocol-qr', 'plans-quotas', 'room-editor-plans'],
    steps: [
      {
        title: '1. Configurer la billetterie',
        description: 'Tarifs par zone (VIP, Standard) et jauge.',
        detail: 'Définissez les catégories de places et les prix en CDF ou USD avec choix de place sur le plan 2D/3D. Vente ouverte en quelques minutes.',
        outcome: 'Billetterie en ligne prête.',
        icon: CalendarCheck,
      },
      {
        title: '2. Encaisser en direct',
        description: 'M-Pesa, Orange Money, Airtel, Afrimoney et cartes bancaires.',
        detail: 'Les acheteurs paient en ligne en toute sécurité : leur présence est validée automatiquement et chaque billet partagé est personnalisable.',
        outcome: 'Recettes immédiates et pass QR générés.',
        icon: Wallet,
      },
      {
        title: '3. Coordonner l’équipe',
        description: 'Accès dédiés pour managers et agents d’accueil.',
        detail: 'Attribuez des rôles précis pour l’émargement sans donner accès à votre comptabilité.',
        outcome: 'Accès et rôles sécurisés.',
        icon: Users,
      },
      {
        title: '4. Contrôle d’accès Jour J',
        description: 'Scan QR instantané avec alerte sonore.',
        detail: 'Scannez avec la caméra de n’importe quel smartphone. Détection immédiate des faux billets ou doublons.',
        outcome: 'Émargement fluide en temps réel.',
        icon: ScanLine,
      },
    ],
  },
  {
    id: 'seeker',
    label: 'Trouver un lieu / talent',
    shortLabel: 'Explorer & Réserver',
    eyebrow: 'Client marketplace',
    targetAudience: 'Recherche de salle, métier ou Matériel & Équipements',
    title: 'Trouvez salle, métiers et matériel',
    intro: 'Salles avec visite 3D, métiers et Matériel & Équipements — devis directs sans commission.',
    examples: 'Salles de fête, traiteurs, DJ, locations habits / véhicules / sono.',
    clicks: ['1. Explorer la carte', '2. Comparer les offres', '3. Demander un devis'],
    clickHrefs: ['#salles', '#catalogue', '#prestataires'],
    sectionId: 'salles',
    exploreCta: { href: '#salles', label: 'Explorer le catalogue' },
    cta: { href: '/marketplace', label: 'Explorer le catalogue' },
    registerHint: 'Compte client gratuit. Devis, favoris et packs budget.',
    results: [
      { icon: Sparkles, label: 'Simulation IA (4 essais gratuits sans compte)' },
      { icon: Building2, label: 'Salles avec visite 3D' },
      { icon: Store, label: 'Métiers & Matériel & Équipements' },
      { icon: MessageSquare, label: 'Devis en direct sans frais' },
    ],
    icon: Store,
    imageUrl: 'https://i.pinimg.com/736x/04/d5/fc/04d5fcdcc825f807b7f4cee2306e1c7c.jpg',
    pricingAudience: 'B2C',
    faqIds: ['marketplace-venues', 'client-account', 'event-packs', 'marketplace-booking'],
    steps: [
      {
        title: '1. Explorer',
        description: 'Salles, métiers et Matériel & Équipements filtrés par ville et budget.',
        detail: 'Recherche géolocalisée. Photos HD, plans 3D et équipements disponibles.',
        outcome: 'Trouvez les professionnels adaptés.',
        icon: LayoutGrid,
      },
      {
        title: '2. Composer',
        description: 'Sélectionnez salle, traiteur, photo, déco ou locations.',
        detail: 'Enregistrez vos coups de cœur et comparez les tarifs en toute transparence.',
        outcome: 'Pack complet personnalisé.',
        icon: Heart,
      },
      {
        title: '3. Demander un devis',
        description: 'Contact direct sans intermédiaire.',
        detail: 'Transmettez votre date et vos besoins en un clic.',
        outcome: 'Réponse rapide du prestataire.',
        icon: MessageSquare,
      },
      {
        title: '4. Bloquer la date',
        description: 'Confirmez votre réservation avec le prestataire.',
        detail: 'Versez l’acompte convenu pour garantir la disponibilité.',
        outcome: 'Date et prestation sécurisées.',
        icon: CalendarCheck,
      },
    ],
  },
  {
    id: 'vendor',
    label: 'Référencer mon activité',
    shortLabel: 'Propriétaire & Pro',
    eyebrow: 'Salle ou métier',
    targetAudience: 'Salles, métiers de service et Matériel & Équipements',
    title: 'Publiez votre salle ou votre métier',
    intro: 'Vitrine 3D, devis directs et planning — sans gérer d’événements.',
    examples: 'Salles, traiteurs, photographes, locations habits / véhicules / sono.',
    clicks: ['1. Publier ma fiche', '2. Recevoir des devis', '3. Bloquer les dates'],
    clickHrefs: ['/tarifs', '#editeur', '#salles'],
    sectionId: 'editeur',
    exploreCta: { href: '/tarifs', label: 'Voir les forfaits' },
    cta: { href: '/register?kind=VENDOR&intent=vendor', label: 'Publier mon activité' },
    registerHint: 'Compte pro. Les organisateurs Business+ publient aussi via leur forfait.',
    results: [
      { icon: LayoutGrid, label: 'Vitrine salle ou métier (matériel inclus)' },
      { icon: MessageSquare, label: 'Demandes de devis directes' },
      { icon: CalendarCheck, label: 'Planning de réservation' },
    ],
    icon: Building2,
    imageUrl: '/images/landing/card-referencer-activite.jpg',
    pricingAudience: 'VENDOR',
    faqIds: ['marketplace-venues', 'venue-subscription', 'service-subscription', 'plans-quotas', 'room-editor-plans'],
    steps: [
      {
        title: '1. Publier la vitrine',
        description: 'Salle à réserver, ou métier (prestations / Matériel & Équipements).',
        detail: 'Photos, tarifs, calendrier — éventuellement plan 3D pour une salle.',
        outcome: 'Fiche visible et attractive.',
        icon: Store,
      },
      {
        title: '2. Recevoir des demandes',
        description: 'Demandes de devis directes de clients qualifiés.',
        detail: 'Échangez avec les organisateurs sans commission intermédiaire.',
        outcome: 'Nouveaux prospects sans prospection.',
        icon: MessageSquare,
      },
      {
        title: '3. Bloquer le calendrier',
        description: 'Gérez vos dates disponibles et réservations.',
        detail: 'Planning clair pour éviter tout doublon de date.',
        outcome: 'Calendrier à jour et maîtrisé.',
        icon: CalendarCheck,
      },
      {
        title: '4. Développer l’activité',
        description: 'Avis vérifiés et visibilité continue toute l’année.',
        detail: 'Fidélisez votre clientèle et remplissez vos créneaux.',
        outcome: 'Croissance de votre activité.',
        icon: Briefcase,
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
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: motionSafeScrollBehavior(),
      block: 'start',
    });
  };
  requestAnimationFrame(() => requestAnimationFrame(run));
}
