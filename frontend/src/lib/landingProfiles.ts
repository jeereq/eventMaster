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
    label: 'Je célèbre un moment unique',
    shortLabel: 'Mon événement',
    eyebrow: 'Particulier',
    title: 'Votre fête, du premier clic au jour J',
    intro: 'Créez l’événement, invitez, accueillez. C’est tout.',
    examples: 'Mariage, anniversaire... Du faire-part au placement des invités.',
    clicks: ['Créer', 'Inviter', 'Accueillir'],
    clickHrefs: ['#parcours', '#modeles', '#produit'],
    sectionId: 'parcours',
    exploreCta: { href: '#parcours', label: 'Voir les étapes' },
    cta: { href: '/register', label: 'Créer mon événement (Gratuit)' },
    registerHint: 'Compte particulier. Éditeur 2D/3D complet inclus, selon le nombre d’invités.',
    results: [
      { icon: Shirt, label: 'Infos invités' },
      { icon: Mail, label: 'RSVP' },
      { icon: ScanLine, label: 'Accueil QR' },
    ],
    icon: Heart,
    pricingAudience: 'B2C',
    faqIds: ['what-is-eventmaster', 'mobile-app', 'placement-delivery', 'free-trial', 'b2c-annual'],
    steps: [
      {
        title: 'Créer l’événement',
        description: 'Titre, date, lieu. Un clic pour commencer.',
        detail: 'Renseignez l’essentiel. Ajoutez le dress code, le parking et les notes pratiques : vos invités les verront sur leur lien.',
        outcome: 'Votre événement existe, prêt à recevoir la liste d’invités.',
        icon: CalendarCheck,
      },
      {
        title: 'Trouver salle et prestataires',
        description: 'Optionnel. Comparez salle, traiteur, photo, DJ.',
        detail: 'Retenez des fiches, composez une solution, demandez un devis. Rien n’est réservé tant que vous n’envoyez pas la demande.',
        outcome: 'Un mix salle / prestas, ou vous passez directement aux invitations.',
        icon: Store,
      },
      {
        title: 'Inviter',
        description: 'Un lien par personne, par e-mail ou WhatsApp.',
        detail: 'Chaque proche a un lien personnel. Pas de PDF ni de plan à ce stade — uniquement la réponse.',
        outcome: 'Les réponses arrivent dans votre tableau RSVP.',
        icon: Mail,
      },
      {
        title: 'Placer',
        description: 'Glissez les invités sur les sièges. Ils reçoivent le plan après le « oui ».',
        detail: 'Dès qu’un invité a accepté et qu’une place est assignée, le plan et le pin GPS partent automatiquement.',
        outcome: 'Chaque confirmé sait où s’asseoir avant d’arriver.',
        icon: LayoutGrid,
      },
      {
        title: 'Accueillir',
        description: 'Scannez le QR à l’entrée, depuis le téléphone.',
        detail: 'Mode Protocole dans le navigateur : présence enregistrée, siège validé. Pas d’app à installer.',
        outcome: 'Entrée contrôlée, le jour J.',
        icon: ScanLine,
      },
    ],
  },
  {
    id: 'pro',
    label: 'Je suis organisateur Pro',
    shortLabel: 'Event master',
    eyebrow: 'Professionnel',
    title: 'Tous vos événements clients, un seul espace',
    intro: 'Agence, wedding planner, event master : dossiers, équipe, salles.',
    examples: 'Centralisez vos dossiers, devis et la gestion d’équipe.',
    clicks: ['Ouvrir l’espace', 'Préparer', 'Jour J'],
    clickHrefs: ['#parcours', '#catalogue', '#produit'],
    sectionId: 'parcours',
    exploreCta: { href: '#parcours', label: 'Voir les étapes' },
    cta: { href: '/register', label: 'Ouvrir mon espace pro' },
    registerHint: 'Compte organisateur B2B. Forfaits Essentiel, Business, Premium ou Enterprise.',
    results: [
      { icon: Users, label: 'Équipe' },
      { icon: Building2, label: 'Salles' },
      { icon: Sparkles, label: 'Modèles' },
    ],
    icon: Sparkles,
    pricingAudience: 'B2B',
    faqIds: ['what-is-eventmaster', 'public-events', 'roles', 'protocol-qr', 'plans-quotas', 'room-editor-plans'],
    steps: [
      {
        title: 'Créer l’organisation',
        description: 'Un espace pour tous vos événements, avec quotas selon le forfait.',
        detail: 'Essentiel pour démarrer, Business / Premium / Enterprise pour le volume d’invités, l’éditeur avancé ou complet et le protocole d’accueil.',
        outcome: 'Tableau de bord prêt pour plusieurs événements.',
        icon: CalendarCheck,
      },
      {
        title: 'Équipe et salles',
        description: 'Managers, protocole, salles internes et modèles d’invitation.',
        detail: 'Chacun ne voit que son périmètre. Liez une salle pour importer le plan 2D sur un événement.',
        outcome: 'L’équipe et les lieux sont en place.',
        icon: Users,
      },
      {
        title: 'Préparer',
        description: 'Catalogue, simulation IA ou mix final : salle, métiers, locations.',
        detail: 'Retenez des options par événement, demandez des devis, suivez les réservations. Les tâches d’équipe suivent la préparation.',
        outcome: 'Le dossier événement a une solution claire.',
        icon: Store,
      },
      {
        title: 'Inviter et placer',
        description: 'Invitations, RSVP, plan de table, fil d’actualité.',
        detail: 'Même flux que pour un particulier, à l’échelle de vos clients. Événement privé (liste) ou public (billets).',
        outcome: 'Invités confirmés, places attribuées, annonces en direct.',
        icon: Mail,
      },
      {
        title: 'Jour J et suivi',
        description: 'Scan QR, stats, plusieurs événements en parallèle.',
        detail: 'Le protocole scanne depuis le navigateur. Les statistiques couvrent RSVP, check-in et tâches.',
        outcome: 'Accueil maîtrisé, dossiers suivants déjà lancés.',
        icon: ScanLine,
      },
    ],
  },
  {
    id: 'seeker',
    label: 'Je recherche un lieu ou talent',
    shortLabel: 'Je cherche',
    eyebrow: 'Client marketplace',
    title: 'Salle et prestas : cherchez, composez, demandez',
    intro: 'Compte gratuit. Pas d’abonnement. Un devis en quelques clics.',
    examples: 'Comparez et réservez salles, traiteurs, photographes...',
    clicks: ['Chercher', 'Composer', 'Demander un devis'],
    clickHrefs: ['#salles', '#catalogue', '#prestataires'],
    sectionId: 'salles',
    exploreCta: { href: '#salles', label: 'Voir le catalogue' },
    cta: { href: '/register?kind=CLIENT', label: 'Créer mon compte (Gratuit)' },
    registerHint: 'Compte client gratuit : favoris, packs, devis.',
    results: [
      { icon: Heart, label: 'Favoris' },
      { icon: Wallet, label: 'Packs' },
      { icon: Store, label: 'Devis' },
    ],
    icon: Store,
    pricingAudience: 'B2C',
    faqIds: ['marketplace-venues', 'client-account', 'event-packs', 'marketplace-booking'],
    steps: [
      {
        title: 'Explorer',
        description: 'Salles, métiers et locations, filtrés par ville et prix.',
        detail: 'Grille, liste ou carte. Partagez l’URL : le destinataire retrouve les mêmes filtres, sans compte.',
        outcome: 'Un catalogue filtré, partageable.',
        icon: LayoutGrid,
      },
      {
        title: 'Favoris',
        description: 'Gardez les fiches qui vous parlent.',
        detail: 'Le cœur enregistre salles, prestataires et locations pour y revenir avant de composer un pack.',
        outcome: 'Votre shortlist est prête.',
        icon: Heart,
      },
      {
        title: 'Composer',
        description: 'Simulation sans IA ou avec IA, puis une solution finale.',
        detail: 'Indiquez enveloppe, ville et invités. Rien n’est réservé : vous comparez, puis enregistrez un pack.',
        outcome: 'Un pack prêt à envoyer en devis.',
        icon: Wallet,
      },
      {
        title: 'Réserver',
        description: 'Devis puis acompte versé au professionnel, hors EventMaster.',
        detail: 'Après acceptation, vous versez l’acompte ({depositPercent} %) directement au pro. La commission vendeur ne vous concerne pas.',
        outcome: 'Date bloquée une fois l’acompte confirmé.',
        icon: CalendarCheck,
      },
    ],
  },
  {
    id: 'vendor',
    label: 'Je référence mon espace ou service',
    shortLabel: 'Je publie',
    eyebrow: 'Salle & prestataire',
    title: 'Publiez vos offres, recevez des demandes',
    intro: 'Salle, traiteur, photo, location : une fiche, puis les devis arrivent.',
    examples: 'Développez votre visibilité et recevez des devis.',
    clicks: ['Publier', 'Répondre', 'Bloquer la date'],
    clickHrefs: ['#tarifs', '#parcours', '#salles'],
    sectionId: 'tarifs',
    exploreCta: { href: '#tarifs', label: 'Voir les tarifs' },
    cta: { href: '/register?kind=VENDOR', label: 'Développer mon activité' },
    registerHint: 'Compte marketplace. Forfaits Salle (salles illimitées), Prestataire (prestas illimitées) ou Salle & presta.',
    results: [
      { icon: Building2, label: 'Fiche publique' },
      { icon: MessageSquare, label: 'Devis' },
      { icon: CalendarCheck, label: 'Calendrier' },
    ],
    icon: Briefcase,
    pricingAudience: 'VENDOR',
    faqIds: ['marketplace-booking', 'free-trial', 'plans-quotas', 'room-editor-plans', 'upgrade'],
    steps: [
      {
        title: 'Publier',
        description: 'Photos, tarif, ville, GPS. Salle, métier ou location.',
        detail: 'Dès l’abonnement payé, vos salles et/ou prestations sont illimitées selon le forfait choisi. Éditeur 2D/3D complet inclus pour les salles.',
        outcome: 'Vos offres sont visibles et filtrables.',
        icon: Briefcase,
      },
      {
        title: 'Répondre',
        description: 'Les demandes arrivent dans le desk. Contactez, puis convertissez.',
        detail: 'Sans date : devis. Avec date : convertissez en réservation pour enchaîner l’acompte.',
        outcome: 'Pipeline devis → réservation clair.',
        icon: MessageSquare,
      },
      {
        title: 'Acompte',
        description: 'Le client verse {depositPercent} % hors EventMaster. Vous marquez la réception.',
        detail: 'La plateforme n’encaisse pas. Vous confirmez seulement après réception réelle.',
        outcome: 'Acompte tracé, sans intermédiaire de paiement.',
        icon: Wallet,
      },
      {
        title: 'Confirmer',
        description: 'Bloquez la date. Commission vendeur {commissionPercent} % sur les réservations confirmées.',
        detail: 'Si une salle est liée à un événement, le plan 2D sert au placement et au protocole le jour J.',
        outcome: 'Date bloquée, pas de double réservation.',
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
