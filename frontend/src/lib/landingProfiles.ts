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
    targetAudience: 'Pour : Mariages, anniversaires, baptêmes et fêtes familiales',
    title: 'Votre fête en 3 étapes simples',
    intro: 'Créez votre événement, invitez vos proches sur WhatsApp et placez vos convives sur plan 2D/3D.',
    examples: 'Mariage, anniversaire, baptême, fête privée.',
    clicks: ['1. Créer la fête', '2. Inviter WhatsApp', '3. Plan & Scan QR'],
    clickHrefs: ['#profils', '/modeles', '#editeur'],
    sectionId: 'editeur',
    exploreCta: { href: '#editeur', label: 'Découvrir l’éditeur' },
    cta: { href: '/register?kind=ORGANIZER&intent=personal', label: 'Créer mon événement (Gratuit)' },
    registerHint: 'Éditeur de salle complet inclus. Sans carte bancaire.',
    results: [
      { icon: Heart, label: 'Faire-part & RSVP WhatsApp' },
      { icon: LayoutGrid, label: 'Plan de table 2D / 3D' },
      { icon: Sparkles, label: 'Simulation IA (4 essais gratuits)' },
      { icon: ScanLine, label: 'Pass QR & Émargement' },
    ],
    icon: Heart,
    imageUrl: 'https://images.unsplash.com/photo-1664645534653-b4b8b6473cb2?auto=format&fit=crop&w=900&q=80',
    pricingAudience: 'B2C',
    faqIds: ['what-is-eventmaster', 'event-packs', 'mobile-app', 'placement-delivery', 'free-trial', 'b2c-annual'],
    steps: [
      {
        title: '1. Créer l’événement',
        description: 'Titre, date, lieu et dress code en 1 minute.',
        detail: 'Renseignez l’essentiel. Vos invités retrouvent les infos pratiques sur leur lien personnel.',
        outcome: 'Lien de l’événement prêt.',
        icon: CalendarCheck,
      },
      {
        title: '2. Inviter sur WhatsApp',
        description: 'Lien unique par invité, sans application.',
        detail: 'Envoyez vos invitations en 1 clic. Suivez les confirmations (RSVP) en temps réel.',
        outcome: 'Confirmations en direct.',
        icon: Mail,
      },
      {
        title: '3. Placer sur plan 2D/3D',
        description: 'Glissez vos invités sur les tables en direct.',
        detail: 'Agencez tables rondes, allées et lustres. Vos invités voient leur place avant d’arriver.',
        outcome: 'Placement visuel sans stress.',
        icon: LayoutGrid,
      },
      {
        title: '4. Scanner à l’entrée',
        description: 'Accueil au smartphone en 2 secondes.',
        detail: 'Scannez le badge QR à l’entrée pour valider la présence et orienter l’invité.',
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
    targetAudience: 'Pour : Organisateurs de concerts, conférences, festivals, galas et agences événementielles',
    title: 'Vendez vos billets et contrôlez les accès par QR code',
    intro: 'Créez votre billetterie en ligne, encaissez les paiements par Mobile Money (Orange Money, M-Pesa, Airtel) ou Carte, et contrôlez les entrées avec votre smartphone.',
    examples: 'Concerts, festivals, conférences, galas d’entreprise, séminaires, spectacles.',
    clicks: ['1. Billetterie & Tarifs', '2. Paiements Mobile Money', '3. Contrôle d’accès QR'],
    clickHrefs: ['/tarifs', '#catalogue', '#editeur'],
    sectionId: 'editeur',
    exploreCta: { href: '/tarifs', label: 'Découvrir les forfaits pro' },
    cta: { href: '/register?kind=ORGANIZER&intent=pro&action=ticketing', label: 'Créer ma billetterie en ligne' },
    registerHint: 'Idéal pour événements payants ou avec contrôle d’accès. Sans matériel coûteux.',
    results: [
      { icon: Wallet, label: 'Paiements Orange Money, M-Pesa, Airtel & Cartes' },
      { icon: ScanLine, label: 'Scan QR d’entrée anti-fraude' },
      { icon: Sparkles, label: 'Simulateur budget IA (4 essais gratuits)' },
      { icon: Users, label: 'Comptes pour l’équipe d’accueil' },
    ],
    icon: Sparkles,
    imageUrl: 'https://images.unsplash.com/photo-1768508948462-58962b3ab650?auto=format&fit=crop&w=900&q=80',
    pricingAudience: 'B2B',
    faqIds: ['what-is-eventmaster', 'event-packs', 'public-events', 'roles', 'protocol-qr', 'plans-quotas', 'room-editor-plans'],
    steps: [
      {
        title: '1. Configurer la billetterie',
        description: 'Tarifs par zone (VIP, Standard) et jauge.',
        detail: 'Définissez les catégories de places et les prix en CDF ou USD. Vente ouverte en quelques minutes.',
        outcome: 'Billetterie en ligne prête.',
        icon: CalendarCheck,
      },
      {
        title: '2. Encaisser en direct',
        description: 'M-Pesa, Orange Money, Airtel et cartes bancaires.',
        detail: 'Les acheteurs paient en ligne en toute sécurité et reçoivent instantanément leur pass QR.',
        outcome: 'Recettes immédiates et e-billets générés.',
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
    targetAudience: 'Pour : Particuliers et entreprises cherchant une salle, un traiteur, un DJ ou un photographe',
    title: 'Trouvez une salle ou un prestataire',
    intro: 'Explorez les salles avec visite 3D, comparez les formules et demandez des devis directement sans intermédiaire.',
    examples: 'Salles de fête, traiteurs, décorateurs, DJ, sonorisation.',
    clicks: ['1. Explorer la carte', '2. Comparer les offres', '3. Demander un devis'],
    clickHrefs: ['#salles', '#catalogue', '#prestataires'],
    sectionId: 'salles',
    exploreCta: { href: '#salles', label: 'Explorer le catalogue' },
    cta: { href: '/marketplace', label: 'Explorer les lieux & prestataires' },
    registerHint: 'Compte 100% gratuit sans engagement. Devis directs.',
    results: [
      { icon: Sparkles, label: 'Simulation IA (4 essais gratuits sans compte)' },
      { icon: Building2, label: 'Salles avec visite 3D' },
      { icon: Store, label: 'Prestataires vérifiés' },
      { icon: MessageSquare, label: 'Devis en direct sans frais' },
    ],
    icon: Store,
    imageUrl: 'https://images.unsplash.com/photo-1768508950243-16fd93e88d7f?auto=format&fit=crop&w=900&q=80',
    pricingAudience: 'B2C',
    faqIds: ['marketplace-venues', 'client-account', 'event-packs', 'marketplace-booking'],
    steps: [
      {
        title: '1. Explorer',
        description: 'Salles et prestataires filtrés par ville, capacité et budget.',
        detail: 'Recherche géolocalisée. Photos HD, plans 3D et équipements disponibles.',
        outcome: 'Trouvez les professionnels adaptés.',
        icon: LayoutGrid,
      },
      {
        title: '2. Composer',
        description: 'Sélectionnez salle, traiteur, photo et déco.',
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
    eyebrow: 'Salle & prestataire',
    targetAudience: 'Pour : Propriétaires de salles, traiteurs, décorateurs, animateurs et loueurs de matériel',
    title: 'Publiez votre salle ou vos prestations',
    intro: 'Vitrine avec plan 3D, demandes de devis directes et gestion de planning sans commission cachée.',
    examples: 'Propriétaires de salle, traiteurs, décorateurs, photographes.',
    clicks: ['1. Publier ma fiche', '2. Recevoir des devis', '3. Bloquer les dates'],
    clickHrefs: ['/tarifs', '#editeur', '#salles'],
    sectionId: 'editeur',
    exploreCta: { href: '/tarifs', label: 'Voir les forfaits' },
    cta: { href: '/register?kind=VENDOR&intent=vendor', label: 'Publier ma vitrine professionnelle' },
    registerHint: 'Visibilité qualifiée, devis directs sans commission plateforme.',
    results: [
      { icon: LayoutGrid, label: 'Vitrine avec visite 3D' },
      { icon: MessageSquare, label: 'Demandes de devis directes' },
      { icon: CalendarCheck, label: 'Planning de réservation' },
    ],
    icon: Building2,
    imageUrl: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=900&q=80',
    pricingAudience: 'VENDOR',
    faqIds: ['marketplace-venues', 'venue-subscription', 'service-subscription', 'plans-quotas', 'room-editor-plans'],
    steps: [
      {
        title: '1. Publier la vitrine',
        description: 'Photos, tarifs et plan de salle 3D interactif.',
        detail: 'Présentez vos espaces et prestations auprès de milliers d’organisateurs.',
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
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  requestAnimationFrame(() => requestAnimationFrame(run));
}
