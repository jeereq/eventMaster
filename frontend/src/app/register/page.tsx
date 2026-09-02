'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Calendar,
  Mail,
  Lock,
  User,
  Building,
  Building2,
  PartyPopper,
  Phone,
  MessageSquare,
  UserCheck,
  ScanLine,
  LayoutGrid,
  Wallet,
  CalendarCheck,
  Store,
  Sparkles,
  Heart,
  Users,
  ShieldCheck,
  Zap,
  Eye,
  Layers,
  ArrowRight,
  CheckCircle2,
  Ticket,
  Briefcase,
  ChevronDown,
  Scale,
} from 'lucide-react';
import { AuthSplitLayout, MethodToggle } from '@/components/AuthSplitLayout';
import { Button, Alert, Input, Card, PhoneInput } from '@/components/ui';
import LegalTermsPreviewModal from '@/components/LegalTermsPreviewModal';
import { TERMS_VERSION, PRIVACY_VERSION } from '@/config/legalConfig';
import { parseReferralFromSearchParams } from '@/lib/referralLink';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { interpolateRates } from '@/lib/platformRates';
import { DEFAULT_PHONE_COUNTRY_CODE, composeE164 } from '@/lib/phone';
import { ACCOUNT_KIND_DESCRIPTIONS, ACCOUNT_KIND_LABELS, type TenantAccountKind } from '@/lib/marketplace';
import { safeAppPath, isClientReturnPath } from '@/lib/safeAppPath';
import { LANDING_PLANS } from '@/config/landingPricing';
import { LANDING_SLOGAN } from '@/lib/landingProfiles';
import { cn } from '@/lib/cn';

interface RegistrationActionConfig {
  key: string;
  badge: string;
  heroTitle: string;
  heroDescription: string;
  goalTitle: string;
  goalSubtitle: string;
  goalTag: string;
  goalIcon: React.ComponentType<{ className?: string }>;
  defaultAccountKind: TenantAccountKind;
  defaultNextPath: string;
  submitButtonLabel: string;
  orgLabel: string;
  orgPlaceholder: string;
  features: Array<{
    step: number;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    desc: string;
  }>;
}

const REGISTRATION_ACTION_CONFIGS: Record<string, RegistrationActionConfig> = {
  room_editor: {
    key: 'room_editor',
    badge: 'Éditeur 2D / 3D',
    heroTitle: 'Concevez votre plan de salle et explorez en 3D',
    heroDescription:
      'Modélisez votre espace au millimètre, disposez vos tables, allées et éclairages, et placez vos invités en direct.',
    goalTitle: 'Objectif : Éditeur de Salle 2D / 3D',
    goalSubtitle: 'Accès immédiat à l’outil d’agencement et de visite 3D dès validation.',
    goalTag: 'Outil de Salle',
    goalIcon: LayoutGrid,
    defaultAccountKind: 'ORGANIZER',
    defaultNextPath: '/dashboard/rooms',
    submitButtonLabel: 'Ouvrir l’éditeur de salle',
    orgLabel: 'Nom de l’espace ou célébration',
    orgPlaceholder: 'Ex: Salle Polyvalente / Fête Privée',
    features: [
      { step: 1, icon: LayoutGrid, title: 'Plan 2D au millimètre', desc: 'Tables rondes, rectangulaires, estrade et allées de passage.' },
      { step: 2, icon: Eye, title: 'Immersion 3D interactive', desc: 'Visite virtuelle fluide sans logiciel ni plugin à installer.' },
      { step: 3, icon: Users, title: 'Placement & Scan QR', desc: 'Assignation nominative et repérage instantané le jour J.' },
    ],
  },
  event: {
    key: 'event',
    badge: 'Fête & Mariage',
    heroTitle: 'Votre événement réussi, maîtrisé de A à Z',
    heroDescription:
      'Créez l’événement, envoyez des faire-part WhatsApp personnalisés et suivez les réponses en direct.',
    goalTitle: 'Objectif : Créer mon événement & RSVP',
    goalSubtitle: 'Votre espace organisateur sera prêt en 1 minute sans carte bancaire.',
    goalTag: 'Célébration Privée',
    goalIcon: Heart,
    defaultAccountKind: 'ORGANIZER',
    defaultNextPath: '/dashboard/events',
    submitButtonLabel: 'Créer mon événement gratuit',
    orgLabel: 'Nom de l’événement ou famille',
    orgPlaceholder: 'Ex: Mariage Sarah & David / Famille Dupont',
    features: [
      { step: 1, icon: Calendar, title: 'Créer la fête', desc: 'Date, lieu, programme et dress code en 1 clic.' },
      { step: 2, icon: Mail, title: 'Inviter sur WhatsApp', desc: 'Lien direct et personnalisé avec choix de menu (RSVP).' },
      { step: 3, icon: ScanLine, title: 'Accueil le Jour J', desc: 'Badge QR nominatif et plan de table instantané.' },
    ],
  },
  template: {
    key: 'template',
    badge: 'Papeterie Digitale',
    heroTitle: 'Personnalisez votre invitation en 1 clic',
    heroDescription:
      'Sélectionnez un modèle élégant, personnalisez les textes et partagez votre faire-part digital à vos convives.',
    goalTitle: 'Objectif : Modèle d’invitation digitale',
    goalSubtitle: 'Votre modèle est réservé et prêt à être personnalisé dès votre première connexion.',
    goalTag: 'Faire-part & RSVP',
    goalIcon: Sparkles,
    defaultAccountKind: 'ORGANIZER',
    defaultNextPath: '/dashboard/templates',
    submitButtonLabel: 'Personnaliser mon invitation',
    orgLabel: 'Nom de l’événement',
    orgPlaceholder: 'Ex: Anniversaire 30 ans / Célébration',
    features: [
      { step: 1, icon: Sparkles, title: 'Modèle sélectionné', desc: 'Typographies soignées et animations prêtes à l’emploi.' },
      { step: 2, icon: MessageSquare, title: 'Partage WhatsApp', desc: 'Lien personnel sans aucune application à installer pour vos proches.' },
      { step: 3, icon: CalendarCheck, title: 'Suivi des présences', desc: 'Tableau de bord des confirmations et régimes alimentaires.' },
    ],
  },
  seating: {
    key: 'seating',
    badge: 'Plan de Table & VIP',
    heroTitle: 'Attribution des places & gestion des invités',
    heroDescription:
      'Assignez chaque invité à sa table, synchronisez les confirmations en temps réel et préparez l’accueil.',
    goalTitle: 'Objectif : Plan de table & placement VIP',
    goalSubtitle: 'Configurez la liste des invités et affectez les sièges en toute simplicité.',
    goalTag: 'Placement Invités',
    goalIcon: Users,
    defaultAccountKind: 'ORGANIZER',
    defaultNextPath: '/dashboard/events',
    submitButtonLabel: 'Organiser le plan de table',
    orgLabel: 'Nom de l’événement',
    orgPlaceholder: 'Ex: Banquet Annuel / Mariage',
    features: [
      { step: 1, icon: LayoutGrid, title: 'Agencement des tables', desc: 'Tables numérotées, carrés VIP et allées de passage.' },
      { step: 2, icon: Users, title: 'Placement nominatif', desc: 'Glissez les invités sur leurs sièges respectifs.' },
      { step: 3, icon: ScanLine, title: 'Notification mobile', desc: 'L’invité découvre son numéro de table sur son pass QR.' },
    ],
  },
  ticketing: {
    key: 'ticketing',
    badge: 'Billetterie & Pro',
    heroTitle: 'Billetterie en ligne & encaissements FlexPay',
    heroDescription:
      'Vendez vos billets par zone (VIP, Standard), encaissez en CDF par Mobile Money / Carte et gérez vos flux.',
    goalTitle: 'Objectif : Billetterie & Ventes FlexPay',
    goalSubtitle: 'Paramétrez vos tarifs et recevez vos encaissements directement sur votre compte.',
    goalTag: 'Billetterie Pro',
    goalIcon: Wallet,
    defaultAccountKind: 'ORGANIZER',
    defaultNextPath: '/dashboard/tickets',
    submitButtonLabel: 'Lancer ma billetterie',
    orgLabel: 'Nom de l’entreprise ou agence',
    orgPlaceholder: 'Ex: Horizon Events SARL / Prod Festival',
    features: [
      { step: 1, icon: Wallet, title: 'Billetterie FlexPay', desc: 'Paiements par Mobile Money (M-Pesa, Airtel, Orange) et Cartes bancaires.' },
      { step: 2, icon: Ticket, title: 'Tarifs multi-zones', desc: 'Pass Standard, Carré VIP, Early Bird et billets numérotés.' },
      { step: 3, icon: ScanLine, title: 'Contrôle à l’entrée', desc: 'Scanner d’émargement avec détection anti-fraude et sonore.' },
    ],
  },
  protocol: {
    key: 'protocol',
    badge: 'Scanner Protocole',
    heroTitle: 'Contrôle d’accès Jour J & orientation rapide',
    heroDescription:
      'Scannez les pass QR de vos invités à l’entrée depuis votre smartphone pour une orientation fluide en 2 secondes.',
    goalTitle: 'Objectif : Scanner Protocole & Accueil',
    goalSubtitle: 'Activez le terminal de scan smartphone pour vos équipes d’accueil.',
    goalTag: 'Accueil Jour J',
    goalIcon: ScanLine,
    defaultAccountKind: 'ORGANIZER',
    defaultNextPath: '/dashboard/protocol',
    submitButtonLabel: 'Activer le scanner protocole',
    orgLabel: 'Nom de l’organisation ou événement',
    orgPlaceholder: 'Ex: Desk Accueil / Festival 2026',
    features: [
      { step: 1, icon: ScanLine, title: 'Scan ultra-rapide', desc: 'Validation instantanée par la caméra du téléphone.' },
      { step: 2, icon: LayoutGrid, title: 'Repérage de table', desc: 'Affichage immédiat de la zone et du numéro de place.' },
      { step: 3, icon: ShieldCheck, title: 'Anti-doublons', desc: 'Alerte sonore et visuelle en cas de billet déjà utilisé.' },
    ],
  },
  sales: {
    key: 'sales',
    badge: 'Analytique & Recettes',
    heroTitle: 'Suivi des ventes, billetterie et rapports',
    heroDescription:
      'Consultez les statistiques d’encaissements en temps réel et téléchargez les listes certifiées.',
    goalTitle: 'Objectif : Suivi des ventes & recettes',
    goalSubtitle: 'Visualisez vos flux financiers et vos statistiques d’audience.',
    goalTag: 'Gestion Financière',
    goalIcon: Sparkles,
    defaultAccountKind: 'ORGANIZER',
    defaultNextPath: '/dashboard/tickets',
    submitButtonLabel: 'Accéder aux recettes',
    orgLabel: 'Organisation / Société',
    orgPlaceholder: 'Ex: Agence Événementielle',
    features: [
      { step: 1, icon: Wallet, title: 'Encaissements en direct', desc: 'Suivi transparent des flux Mobile Money et cartes.' },
      { step: 2, icon: Sparkles, title: 'Rapports exportables', desc: 'Listes complètes d’entrées pour votre comptabilité.' },
      { step: 3, icon: Users, title: 'Taux de présence', desc: 'Statistiques précises d’émargement le jour J.' },
    ],
  },
  team: {
    key: 'team',
    badge: 'Coordination d’Équipe',
    heroTitle: 'Gestion collaborative & rôles d’accès',
    heroDescription:
      'Attribuez des droits sécurisés à vos collaborateurs, régisseurs et agents d’accueil sur le terrain.',
    goalTitle: 'Objectif : Coordination d’équipe & rôles',
    goalSubtitle: 'Invitez vos collaborateurs et définissez leurs permissions d’accès.',
    goalTag: 'Multi-accès',
    goalIcon: Users,
    defaultAccountKind: 'ORGANIZER',
    defaultNextPath: '/dashboard/team',
    submitButtonLabel: 'Configurer mon équipe',
    orgLabel: 'Nom de l’organisation',
    orgPlaceholder: 'Ex: Agence & Partenaires',
    features: [
      { step: 1, icon: Users, title: 'Rôles dédiés', desc: 'Profils Admin, Protocole, Billetterie et Régie.' },
      { step: 2, icon: ShieldCheck, title: 'Accès sécurisés', desc: 'Chaque membre dispose de ses identifiants propres.' },
      { step: 3, icon: ScanLine, title: 'Synchronisation terrain', desc: 'Mise à jour en temps réel des actions de l’équipe.' },
    ],
  },
  venue: {
    key: 'venue',
    badge: 'Salle & Espace',
    heroTitle: 'Référencez votre salle sur le marketplace',
    heroDescription:
      'Créez votre fiche vitrine avec visite 3D, recevez des demandes de devis qualifiées et sécurisez vos dates.',
    goalTitle: 'Objectif : Publication de Salle de Fête',
    goalSubtitle: 'Votre vitrine partenaire sera mise en ligne avec visite 3D et calendrier de disponibilité.',
    goalTag: 'Espace Propriétaire',
    goalIcon: Building2,
    defaultAccountKind: 'VENDOR',
    defaultNextPath: '/dashboard/catalogue',
    submitButtonLabel: 'Référencer mon établissement',
    orgLabel: 'Nom de la salle ou complexe',
    orgPlaceholder: 'Ex: Domaine Royal / Complexe Grand Duc',
    features: [
      { step: 1, icon: Building2, title: 'Fiche vitrine 3D', desc: 'Photos haute résolution, tarifs de location et capacité d’accueil.' },
      { step: 2, icon: MessageSquare, title: 'Demandes de devis directes', desc: 'Échangez sans intermédiaire avec les futurs organisateurs.' },
      { step: 3, icon: CalendarCheck, title: 'Planning de réservation', desc: 'Bloquez vos dates fermes et gérez vos acomptes.' },
    ],
  },
  services: {
    key: 'services',
    badge: 'Prestataire Pro',
    heroTitle: 'Mettez en valeur vos prestations événementielles',
    heroDescription:
      'Proposez vos services de traiteur, décoration, sonorisation, DJ ou photo aux organisateurs de votre région.',
    goalTitle: 'Objectif : Référencement Prestataire',
    goalSubtitle: 'Publiez votre catalogue de services et recevez des commandes de particuliers et entreprises.',
    goalTag: 'Prestataire Événementiel',
    goalIcon: Store,
    defaultAccountKind: 'VENDOR',
    defaultNextPath: '/dashboard/catalogue',
    submitButtonLabel: 'Créer ma fiche prestataire',
    orgLabel: 'Nom de l’enseigne ou entreprise',
    orgPlaceholder: 'Ex: Prestige Traiteur / Sonorisation Pro Kin',
    features: [
      { step: 1, icon: Store, title: 'Catalogue de formules', desc: 'Mettez en avant vos packs, menus et forfaits avec tarifs transparents.' },
      { step: 2, icon: Mail, title: 'Devis instantanés', desc: 'Recevez les demandes ciblées selon votre zone géographique.' },
      { step: 3, icon: CalendarCheck, title: 'Zéro commission cachée', desc: 'Conservez vos marges directes sur vos prestations.' },
    ],
  },
  quotes: {
    key: 'quotes',
    badge: 'Gestion Devis',
    heroTitle: 'Répondez aux demandes de devis clients',
    heroDescription:
      'Gérez vos échanges commerciaux, validez les réservations et synchronisez vos disponibilités.',
    goalTitle: 'Objectif : Gestion des devis clients',
    goalSubtitle: 'Centralisez vos propositions commerciales et vos acomptes.',
    goalTag: 'Espace Pro',
    goalIcon: MessageSquare,
    defaultAccountKind: 'VENDOR',
    defaultNextPath: '/dashboard/catalogue',
    submitButtonLabel: 'Accéder à mes devis',
    orgLabel: 'Nom de votre enseigne',
    orgPlaceholder: 'Ex: Studio Photo / Traiteur Événementiel',
    features: [
      { step: 1, icon: MessageSquare, title: 'Réception des demandes', desc: 'Notifications directes par e-mail et WhatsApp.' },
      { step: 2, icon: Wallet, title: 'Acomptes sécurisés', desc: 'Validation directe des paiements avec le client.' },
      { step: 3, icon: CalendarCheck, title: 'Validation de date', desc: 'Mise à jour automatique de vos plannings.' },
    ],
  },
  seeker: {
    key: 'seeker',
    badge: 'Compte Client Gratuit',
    heroTitle: 'Trouvez la salle ou le prestataire idéal',
    heroDescription:
      'Compte 100% gratuit. Enregistrez vos favoris, composez vos packs budget et demandez des devis sans engagement.',
    goalTitle: 'Objectif : Recherche de salles & prestataires',
    goalSubtitle: 'Compte 100% gratuit : favoris, packs budget sur-mesure et devis sans engagement.',
    goalTag: 'Recherche Gratuite',
    goalIcon: Store,
    defaultAccountKind: 'CLIENT',
    defaultNextPath: '/marketplace',
    submitButtonLabel: 'Créer mon compte client gratuit',
    orgLabel: '',
    orgPlaceholder: '',
    features: [
      { step: 1, icon: LayoutGrid, title: 'Explorer le catalogue', desc: 'Salles avec vue 3D, traiteurs, décorateurs, DJ et animateurs.' },
      { step: 2, icon: Wallet, title: 'Packs budget personnalisés', desc: 'Estimez et ajustez le coût global de votre événement.' },
      { step: 3, icon: CalendarCheck, title: 'Devis en 1 clic', desc: 'Contactez directement les pros sans aucun engagement financier.' },
    ],
  },
  personal: {
    key: 'personal',
    badge: 'Fête & Mariage',
    heroTitle: 'Votre fête réussie de A à Z',
    heroDescription:
      'Créez votre événement, invitez vos proches sur WhatsApp et placez-les sur plan de salle 2D/3D.',
    goalTitle: 'Objectif : Organisation Fête & Célébration',
    goalSubtitle: 'Créez vos invitations WhatsApp, plan de table 2D/3D et scan QR à l’entrée.',
    goalTag: 'Particulier & Fête',
    goalIcon: Heart,
    defaultAccountKind: 'ORGANIZER',
    defaultNextPath: '/dashboard/events',
    submitButtonLabel: 'Créer mon événement gratuit',
    orgLabel: 'Nom de l’événement ou famille',
    orgPlaceholder: 'Ex: Mariage Sarah & David / Famille Dupont',
    features: [
      { step: 1, icon: Calendar, title: 'Créer la fête', desc: 'Date, lieu, programme et dress code en 1 clic.' },
      { step: 2, icon: Mail, title: 'Inviter sur WhatsApp', desc: 'Lien direct et personnalisé avec choix de menu (RSVP).' },
      { step: 3, icon: ScanLine, title: 'Accueillir Jour J', desc: 'Badge QR nominatif et plan de table instantanés.' },
    ],
  },
  pro: {
    key: 'pro',
    badge: 'Pro & Agence',
    heroTitle: 'Billetterie et gestion multi-événements',
    heroDescription:
      'Vendez vos billets par zone, encaissez par Mobile Money/Carte et coordonnez votre desk protocole.',
    goalTitle: 'Objectif : Espace Professionnel & Billetterie',
    goalSubtitle: 'Débloquez les outils d’encaissement FlexPay, gestion d’équipe et contrôle d’accès.',
    goalTag: 'Professionnel B2B',
    goalIcon: Briefcase,
    defaultAccountKind: 'ORGANIZER',
    defaultNextPath: '/dashboard/tickets',
    submitButtonLabel: 'Lancer mon espace Pro',
    orgLabel: 'Nom de l’entreprise ou agence',
    orgPlaceholder: 'Ex: Horizon Events SARL / Agence Prestige',
    features: [
      { step: 1, icon: Wallet, title: 'Billetterie FlexPay', desc: 'Ventes multi-zones en Franc Congolais (CDF).' },
      { step: 2, icon: LayoutGrid, title: 'Équipe & Salles', desc: 'Gestion des rôles et modélisation d’espaces.' },
      { step: 3, icon: ScanLine, title: 'Scan Protocole', desc: 'Contrôle des billets et orientation des invités.' },
    ],
  },
  vendor: {
    key: 'vendor',
    badge: 'Salle & Prestataire',
    heroTitle: 'Donnez de la visibilité à votre activité',
    heroDescription:
      'Publiez votre fiche vitrine, recevez des demandes qualifiées et développez votre clientèle.',
    goalTitle: 'Objectif : Vitrine Professionnelle Marketplace',
    goalSubtitle: 'Mettez vos salles et prestations en avant auprès des organisateurs.',
    goalTag: 'Partenaire Marketplace',
    goalIcon: Store,
    defaultAccountKind: 'VENDOR',
    defaultNextPath: '/dashboard/catalogue',
    submitButtonLabel: 'Référencer mon activité',
    orgLabel: 'Nom de votre enseigne ou établissement',
    orgPlaceholder: 'Ex: Espace Grand Hôtel / Sono Prestige',
    features: [
      { step: 1, icon: Store, title: 'Publier ma vitrine', desc: 'Photos HD, visite 3D et tarifs pour séduire vos clients.' },
      { step: 2, icon: MessageSquare, title: 'Répondre aux devis', desc: 'Recevez les demandes et discutez avec vos futurs clients.' },
      { step: 3, icon: CalendarCheck, title: 'Bloquer la date', desc: 'Confirmez les réservations et synchronisez vos plannings.' },
    ],
  },
  ORGANIZER: {
    key: 'ORGANIZER',
    badge: 'Organisateur',
    heroTitle: LANDING_SLOGAN.full,
    heroDescription:
      'Créez l’événement, invitez, accueillez. Retrouvez la sérénité avec un centre de commande unifié pour toutes vos célébrations.',
    goalTitle: 'Objectif : Espace Organisateur Événementiel',
    goalSubtitle: 'Gérez vos célébrations, invitations WhatsApp et plans de salle en toute autonomie.',
    goalTag: 'Organisateur',
    goalIcon: Calendar,
    defaultAccountKind: 'ORGANIZER',
    defaultNextPath: '/dashboard/events',
    submitButtonLabel: 'S’inscrire gratuitement',
    orgLabel: 'Nom de l’organisation ou événement',
    orgPlaceholder: 'Ex: Association / Famille / Entreprise',
    features: [
      { step: 1, icon: Calendar, title: 'Créer', desc: 'Titre, date, lieu. Un modèle d’invitation prêt en un clic.' },
      { step: 2, icon: Mail, title: 'Inviter', desc: 'Un lien par personne. Suivez les réponses sans aucun stress.' },
      { step: 3, icon: ScanLine, title: 'Accueillir', desc: 'Scannez vos invités à l’entrée, directement depuis votre smartphone.' },
    ],
  },
  CLIENT: {
    key: 'CLIENT',
    badge: 'Client marketplace',
    heroTitle: 'Trouvez la perle rare, tout simplement',
    heroDescription:
      'Compte gratuit. Cherchez, comparez et demandez un devis sans engagement.',
    goalTitle: 'Objectif : Compte Client Gratuit',
    goalSubtitle: 'Explorez le catalogue, créez des packs budget et demandez des devis sans carte.',
    goalTag: 'Compte Client',
    goalIcon: Store,
    defaultAccountKind: 'CLIENT',
    defaultNextPath: '/marketplace',
    submitButtonLabel: 'Créer mon compte client gratuit',
    orgLabel: '',
    orgPlaceholder: '',
    features: [
      { step: 1, icon: LayoutGrid, title: 'Explorer', desc: 'Salles 3D, prestataires, locations. Trouvez exactement ce qu’il vous faut.' },
      { step: 2, icon: Wallet, title: 'Composer', desc: 'Un pack sur mesure. Rien n’est réservé tant que le devis n’est pas envoyé.' },
      { step: 3, icon: CalendarCheck, title: 'Confirmer', desc: 'Versez l’acompte directement au pro et sécurisez votre date.' },
    ],
  },
  VENDOR: {
    key: 'VENDOR',
    badge: 'Salle & Prestataire',
    heroTitle: 'Donnez de la visibilité à votre activité',
    heroDescription:
      'Publiez votre fiche vitrine, recevez des demandes qualifiées et bloquez vos dates.',
    goalTitle: 'Objectif : Vitrine Professionnelle',
    goalSubtitle: 'Publiez vos espaces ou prestations et recevez des demandes sans commission cachée.',
    goalTag: 'Prestataire / Salle',
    goalIcon: Store,
    defaultAccountKind: 'VENDOR',
    defaultNextPath: '/dashboard/catalogue',
    submitButtonLabel: 'Référencer mon activité',
    orgLabel: 'Nom de l’établissement ou entreprise',
    orgPlaceholder: 'Ex: Espace Prestige Kinshasa',
    features: [
      { step: 1, icon: Store, title: 'Publier', desc: 'Photos HD, visite 3D et tarifs pour séduire vos clients.' },
      { step: 2, icon: MessageSquare, title: 'Répondre', desc: 'Recevez les demandes et discutez avec vos futurs clients.' },
      { step: 3, icon: CalendarCheck, title: 'Bloquer la date', desc: 'Confirmez les réservations et synchronisez vos plannings.' },
    ],
  },
  BOTH: {
    key: 'BOTH',
    badge: 'Espace complet',
    heroTitle: 'Le meilleur des deux mondes',
    heroDescription:
      'Organisez vos événements et proposez vos propres services. Maîtrisez tout depuis un seul compte.',
    goalTitle: 'Objectif : Espace Complet (Organisation & Vitrine)',
    goalSubtitle: 'Gérez à la fois l’organisation d’événements et la vente de vos prestations.',
    goalTag: 'Compte Mixte',
    goalIcon: Sparkles,
    defaultAccountKind: 'BOTH',
    defaultNextPath: '/dashboard',
    submitButtonLabel: 'Créer mon espace complet',
    orgLabel: 'Nom de l’entreprise ou établissement',
    orgPlaceholder: 'Ex: Groupe Événementiel & Salles',
    features: [
      { step: 1, icon: Calendar, title: 'Créer ou publier', desc: 'Un événement privé ou une fiche vitrine publique.' },
      { step: 2, icon: Mail, title: 'Échanger', desc: 'Gérez vos invitations d’un côté, et vos devis clients de l’autre.' },
      { step: 3, icon: ScanLine, title: 'Le Jour J', desc: 'Accueil fluide au scan QR, sans aucune application à installer.' },
    ],
  },
};

function resolveActionConfig(
  action: string | null,
  intent: string | null,
  accountKind: TenantAccountKind,
  isClientFlow: boolean,
): RegistrationActionConfig {
  if (action && REGISTRATION_ACTION_CONFIGS[action]) {
    return REGISTRATION_ACTION_CONFIGS[action];
  }
  if (action === 'venues' || action === 'packs') {
    return REGISTRATION_ACTION_CONFIGS.seeker;
  }
  if (intent && REGISTRATION_ACTION_CONFIGS[intent]) {
    return REGISTRATION_ACTION_CONFIGS[intent];
  }
  if (isClientFlow) {
    return REGISTRATION_ACTION_CONFIGS.CLIENT;
  }
  if (accountKind in REGISTRATION_ACTION_CONFIGS) {
    return REGISTRATION_ACTION_CONFIGS[accountKind];
  }
  return REGISTRATION_ACTION_CONFIGS.ORGANIZER;
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <AuthSplitLayout
          badge="Inscription"
          title="Chargement…"
          description=""
          features={REGISTRATION_ACTION_CONFIGS.ORGANIZER.features}
          backHref="/"
          backLabel="Retour au site"
          maxWidthClassName="max-w-xl"
        >
          <Card padding="md" className="shadow-xl animate-pulse h-96">
            <span className="sr-only">Chargement du formulaire d&apos;inscription</span>
          </Card>
        </AuthSplitLayout>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}

function RegisterPageContent() {
  const { register } = useAuth();
  const { site, ready } = usePlatformSite();
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextParam = searchParams.get('next');
  const nextPath = safeAppPath(nextParam);
  const intentParam = searchParams.get('intent');
  const actionParam = searchParams.get('action');
  const planParam = searchParams.get('plan');
  const templateIdParam = searchParams.get('templateId');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_PHONE_COUNTRY_CODE);
  const [phoneNational, setPhoneNational] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<'EMAIL' | 'WHATSAPP'>('EMAIL');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [referralFromLink, setReferralFromLink] = useState(false);
  const [accountKind, setAccountKind] = useState<TenantAccountKind>('ORGANIZER');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMobileSteps, setShowMobileSteps] = useState(false);
  const [showAllAccountKinds, setShowAllAccountKinds] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'summary' | 'terms' | 'privacy'>('summary');

  const hasExplicitAction = Boolean(actionParam || intentParam || planParam || searchParams.get('kind'));
  const isClientFlow = accountKind === 'CLIENT' || isClientReturnPath(nextPath);

  // Détection et pré-sélection intelligente des paramètres URL
  useEffect(() => {
    const fromUrl = parseReferralFromSearchParams(searchParams);
    if (fromUrl) {
      setReferralCode(fromUrl);
      setReferralFromLink(true);
    }
    const kind = searchParams.get('kind');
    if (kind === 'CLIENT' || kind === 'VENDOR' || kind === 'BOTH' || kind === 'ORGANIZER') {
      setAccountKind(kind);
    } else if (actionParam === 'venue' || actionParam === 'services' || actionParam === 'quotes' || intentParam === 'vendor') {
      setAccountKind('VENDOR');
    } else if (actionParam === 'venues' || actionParam === 'packs' || intentParam === 'seeker') {
      setAccountKind('CLIENT');
    } else if (actionParam || intentParam === 'personal' || intentParam === 'pro') {
      setAccountKind('ORGANIZER');
    }
  }, [searchParams, actionParam, intentParam]);

  // Résolution de la configuration éditoriale contextuelle
  const config = useMemo(() => {
    return resolveActionConfig(actionParam, intentParam, accountKind, isClientFlow);
  }, [actionParam, intentParam, accountKind, isClientFlow]);

  // Résolution des détails du forfait éventuel
  const matchedPlan = useMemo(() => {
    if (!planParam) return null;
    return LANDING_PLANS.find((p) => p.id === planParam) ?? null;
  }, [planParam]);

  // Destination intelligente de redirection après validation
  const targetNextPath = useMemo(() => {
    if (nextPath) return nextPath;
    if (templateIdParam && config.key === 'template') {
      return `/dashboard/templates?templateId=${encodeURIComponent(templateIdParam)}`;
    }
    return config.defaultNextPath;
  }, [nextPath, templateIdParam, config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!acceptTerms || !acceptPrivacy) {
      setLegalModalTab(!acceptTerms ? 'terms' : 'privacy');
      setLegalModalOpen(true);
      setError('Veuillez examiner et approuver les conditions d’utilisation et la politique de confidentialité pour continuer.');
      return;
    }

    setLoading(true);

    if (verificationMethod === 'WHATSAPP' && !phoneNational.trim()) {
      setError('Le numéro de téléphone est obligatoire pour la confirmation par WhatsApp.');
      setLoading(false);
      return;
    }

    try {
      const e164 = composeE164(phoneCountryCode, phoneNational) || undefined;
      const orgName = accountKind === 'CLIENT' ? name.trim() : tenantName.trim();
      if (accountKind !== 'CLIENT' && !orgName) {
        setError('Le nom de l’organisation ou établissement est obligatoire.');
        setLoading(false);
        return;
      }

      const res = await register(
        email,
        password,
        name,
        orgName,
        e164,
        verificationMethod,
        acceptTerms,
        acceptPrivacy,
        referralCode || undefined,
        phoneCountryCode,
        phoneNational,
        accountKind,
      );

      if (res.requiresVerification && res.email) {
        const nextQ = targetNextPath ? `&next=${encodeURIComponent(targetNextPath)}` : '';
        router.push(
          `/verify-otp?email=${encodeURIComponent(res.email)}&method=${res.verificationMethod || verificationMethod}${nextQ}`,
        );
        return;
      }

      setSuccessMessage(res.message);
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la création du compte.');
      setLoading(false);
    }
  };

  const GoalIcon = config.goalIcon;

  // Caractéristiques enrichies pour le volet marketing
  const layoutFeatures = useMemo(() => {
    return config.features.map((item) => ({
      ...item,
      desc: interpolateRates(item.desc, site),
    }));
  }, [config.features, site]);

  return (
    <AuthSplitLayout
      badge={config.badge}
      title={config.heroTitle}
      description={interpolateRates(config.heroDescription, site)}
      features={layoutFeatures}
      backHref="/"
      backLabel="Retour au site"
      maxWidthClassName="max-w-xl"
    >
      <Card padding="md" className="border-border shadow-sm p-4 sm:p-5">
        {ready && !site.allowRegistration ? (
          <div className="text-center space-y-4 py-6">
            <h2 className="text-xl font-semibold text-foreground">Inscriptions temporairement fermées</h2>
            <p className="text-sm text-muted leading-relaxed">
              Les nouvelles créations de compte sont temporairement suspendues. Contactez{' '}
              <a href={`mailto:${site.supportEmail}`} className="font-semibold text-primary hover:underline">
                {site.supportEmail}
              </a>{' '}
              pour ouvrir une organisation.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              <Link href="/contact">
                <Button>Nous contacter</Button>
              </Link>
              <Link href={targetNextPath ? `/login?next=${encodeURIComponent(targetNextPath)}` : '/login'}>
                <Button variant="secondary">Se connecter</Button>
              </Link>
            </div>
          </div>
        ) : successMessage ? (
          <div className="text-center space-y-4 py-2">
            <div className="inline-flex items-center justify-center bg-emerald-100 dark:bg-emerald-950/30 p-3.5 rounded-full text-emerald-600 dark:text-emerald-400">
              {verificationMethod === 'WHATSAPP' ? (
                <MessageSquare className="w-8 h-8" />
              ) : (
                <Mail className="w-8 h-8" />
              )}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">
                {verificationMethod === 'WHATSAPP' ? 'Vérifiez votre WhatsApp' : 'Vérifiez votre boîte mail'}
              </h2>
              <p className="text-xs sm:text-sm text-muted mt-1.5 leading-relaxed">{successMessage}</p>
            </div>
            <Link href={targetNextPath ? `/login?next=${encodeURIComponent(targetNextPath)}` : '/login'}>
              <Button fullWidth>
                Aller à la connexion
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* ─── BANDEAU CONTEXTUEL D'INTENTION D'ACTION COMPACT ─── */}
            <div className="mb-3.5 p-2.5 rounded-[var(--radius-card)] bg-gradient-to-r from-primary/10 via-[color:var(--festive-accent-soft)]/20 to-primary/5 border border-primary/20 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-md bg-primary/20 text-primary flex items-center justify-center shrink-0">
                  <GoalIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/15 px-1.5 py-0.5 rounded">
                      {config.goalTag}
                    </span>
                    {matchedPlan && (
                      <span className="text-[9px] font-bold text-foreground bg-surface border border-border px-1.5 py-0.5 rounded">
                        Forfait : {matchedPlan.ms365Name}
                      </span>
                    )}
                    {templateIdParam && (
                      <span className="text-[9px] font-bold text-foreground bg-surface border border-border px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-primary" /> Modèle prêt
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-bold text-foreground truncate mt-0.5">
                    {config.goalTitle}
                  </h3>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-[10px] text-muted shrink-0">
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Sans carte
                </span>
              </div>
            </div>

            {/* En-tête formulaire compact */}
            <div className="text-left mb-3">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                {accountKind === 'CLIENT'
                  ? 'Créer mon compte client'
                  : accountKind === 'VENDOR'
                    ? 'Créer mon compte professionnel'
                    : 'Créer mon espace organisateur'}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Déjà inscrit ?{' '}
                <Link
                  href={targetNextPath ? `/login?next=${encodeURIComponent(targetNextPath)}` : '/login'}
                  className="font-semibold text-primary hover:underline"
                >
                  Connectez-vous
                </Link>
              </p>
            </div>

            {error && <Alert variant="error" className="mb-3 py-2 text-xs">{error}</Alert>}

            {referralFromLink && referralCode && (
              <div className="mb-3 flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs">
                <UserCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-800 dark:text-emerald-300">Parrainage actif</p>
                  <p className="text-emerald-700 dark:text-emerald-400 text-[11px] mt-0.5">
                    Code commercial appliqué : <span className="font-mono font-bold">{referralCode}</span>
                  </p>
                </div>
              </div>
            )}

            <form className="space-y-3" onSubmit={handleSubmit}>
              {/* ─── SÉLECTION DU TYPE DE COMPTE COMPACTE ─── */}
              {hasExplicitAction && !showAllAccountKinds ? (
                <div className="p-2 rounded-[var(--radius-card)] bg-surface-muted/70 border border-border flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <GoalIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-foreground truncate text-xs">
                      {ACCOUNT_KIND_LABELS[accountKind]}
                    </span>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-1 py-0.2 rounded shrink-0">
                      Actif
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAllAccountKinds(true)}
                    className="text-[11px] font-semibold text-primary hover:underline touch-manipulation shrink-0 px-1.5 py-0.5 rounded hover:bg-primary/5 cursor-pointer"
                  >
                    Changer
                  </button>
                </div>
              ) : (
                <fieldset className="space-y-1 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <legend className="text-xs font-semibold text-foreground">
                      Type de compte souhaité
                    </legend>
                    {hasExplicitAction ? (
                      <button
                        type="button"
                        onClick={() => setShowAllAccountKinds(false)}
                        className="text-[10px] font-semibold text-primary hover:underline touch-manipulation cursor-pointer"
                      >
                        Garder le focus
                      </button>
                    ) : (
                      <span className="text-[10px] text-muted">Modifiable plus tard</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {(['ORGANIZER', 'CLIENT', 'VENDOR', 'BOTH'] as TenantAccountKind[]).map((kind) => {
                      const isSelected = accountKind === kind;
                      const isRecommended = config.defaultAccountKind === kind;

                      return (
                        <label
                          key={kind}
                          className={cn(
                            'flex flex-col justify-center gap-0.5 p-2 rounded-[var(--radius-card)] border text-xs cursor-pointer transition-all touch-manipulation',
                            isSelected
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/40 text-foreground shadow-xs'
                              : 'border-border text-muted hover:border-primary/40 hover:bg-surface-muted/50',
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                              <input
                                type="radio"
                                name="accountKind"
                                className="accent-primary"
                                checked={isSelected}
                                onChange={() => setAccountKind(kind)}
                              />
                              {ACCOUNT_KIND_LABELS[kind]}
                            </span>
                            {isRecommended && (
                              <span className="text-[9px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-1 py-0.2 rounded">
                                Recommandé
                              </span>
                            )}
                          </div>
                          <span className="font-normal text-[10px] text-muted opacity-90 leading-tight pl-5 truncate">
                            {ACCOUNT_KIND_DESCRIPTIONS[kind]}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {/* ─── IDENTITÉ ET ORGANISATION (2 COLONNES) ─── */}
              <div className={cn('grid gap-2.5', accountKind === 'CLIENT' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
                <Input
                  label={accountKind === 'CLIENT' ? 'Votre nom complet' : 'Votre nom & prénom'}
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jean Dupont"
                  leftIcon={<User className="w-4 h-4" />}
                />
                {accountKind !== 'CLIENT' && (
                  <Input
                    label={config.orgLabel || 'Nom organisation / Événement'}
                    id="tenantName"
                    required
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    placeholder={config.orgPlaceholder || 'Dupont Événements'}
                    leftIcon={<Building className="w-4 h-4" />}
                  />
                )}
              </div>

              {/* ─── CONTACT : E-MAIL & WHATSAPP (2 COLONNES) ─── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Input
                  label="Adresse email"
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jean@exemple.com"
                  leftIcon={<Mail className="w-4 h-4" />}
                />

                <PhoneInput
                  id="phone"
                  label="Téléphone WhatsApp"
                  countryCode={phoneCountryCode}
                  national={phoneNational}
                  onCountryCodeChange={setPhoneCountryCode}
                  onNationalChange={setPhoneNational}
                  required={verificationMethod === 'WHATSAPP'}
                  placeholder="812345678"
                />
              </div>

              {/* ─── MOT DE PASSE & CODE PARRAINAGE (2 COLONNES) ─── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Input
                  label="Mot de passe"
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={<Lock className="w-4 h-4" />}
                />

                <Input
                  label="Code parrainage (optionnel)"
                  id="referralCode"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="EM-XXXX-XXXX"
                />
              </div>

              {/* ─── CHOIX DE MÉTHODE DE VALIDATION OTP ─── */}
              <MethodToggle
                label="Réception du code de confirmation"
                value={verificationMethod}
                onChange={setVerificationMethod}
                options={[
                  { value: 'EMAIL' as const, label: 'Par e-mail', icon: <Mail className="w-3.5 h-3.5" /> },
                  { value: 'WHATSAPP' as const, label: 'Par WhatsApp', icon: <MessageSquare className="w-3.5 h-3.5" /> },
                ]}
              />

              {/* ─── CONDITIONS LÉGALES & PRÉVISUALISATION COMPACTES ─── */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1 text-xs">
                    <Scale className="w-3.5 h-3.5 text-primary" />
                    Engagements légaux
                  </span>
                  {(!acceptTerms || !acceptPrivacy) && (
                    <button
                      type="button"
                      onClick={() => {
                        setLegalModalTab('summary');
                        setLegalModalOpen(true);
                      }}
                      className="text-[10px] font-bold text-primary hover:underline inline-flex items-center gap-1 touch-manipulation cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      Tout lire & approuver
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                  {/* 1. Carte Conditions d'utilisation */}
                  <div
                    className={cn(
                      'px-2.5 py-1.5 rounded-[var(--radius-card)] border transition-all flex items-center justify-between gap-2 text-xs',
                      acceptTerms
                        ? 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'border-border bg-surface hover:border-primary/40',
                    )}
                  >
                    <label className="flex items-center gap-2 min-w-0 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={() => {
                          if (!acceptTerms) {
                            setLegalModalTab('terms');
                            setLegalModalOpen(true);
                          } else {
                            setAcceptTerms(false);
                          }
                        }}
                        className="rounded text-primary focus:ring-primary accent-primary shrink-0"
                      />
                      <span className="font-medium text-foreground truncate text-[11px]">
                        Conditions d’utilisation <span className="text-[10px] text-muted">v{TERMS_VERSION}</span>
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setLegalModalTab('terms');
                        setLegalModalOpen(true);
                      }}
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 transition flex items-center gap-0.5 touch-manipulation cursor-pointer',
                        acceptTerms
                          ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-900/30'
                          : 'text-primary bg-primary/10 hover:bg-primary/20',
                      )}
                    >
                      {acceptTerms ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : 'Lire'}
                    </button>
                  </div>

                  {/* 2. Carte Politique de confidentialité */}
                  <div
                    className={cn(
                      'px-2.5 py-1.5 rounded-[var(--radius-card)] border transition-all flex items-center justify-between gap-2 text-xs',
                      acceptPrivacy
                        ? 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'border-border bg-surface hover:border-primary/40',
                    )}
                  >
                    <label className="flex items-center gap-2 min-w-0 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={acceptPrivacy}
                        onChange={() => {
                          if (!acceptPrivacy) {
                            setLegalModalTab('privacy');
                            setLegalModalOpen(true);
                          } else {
                            setAcceptPrivacy(false);
                          }
                        }}
                        className="rounded text-primary focus:ring-primary accent-primary shrink-0"
                      />
                      <span className="font-medium text-foreground truncate text-[11px]">
                        Confidentialité <span className="text-[10px] text-muted">v{PRIVACY_VERSION}</span>
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setLegalModalTab('privacy');
                        setLegalModalOpen(true);
                      }}
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 transition flex items-center gap-0.5 touch-manipulation cursor-pointer',
                        acceptPrivacy
                          ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-900/30'
                          : 'text-primary bg-primary/10 hover:bg-primary/20',
                      )}
                    >
                      {acceptPrivacy ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : 'Lire'}
                    </button>
                  </div>
                </div>
              </div>

              {/* ─── BOUTON D'ACTION PRINCIPAL DYNAMIQUE ─── */}
              <div className="pt-1.5 space-y-1.5">
                <Button
                  type="submit"
                  fullWidth
                  loading={loading}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="shadow-md shadow-primary/20 font-bold py-2.5"
                >
                  {config.submitButtonLabel}
                </Button>

                <p className="text-center text-[10px] text-muted flex items-center justify-center gap-1">
                  <Zap className="w-3 h-3 text-primary shrink-0" />
                  Accès débloqué immédiatement après validation du code
                </p>
              </div>
            </form>
          </>
        )}
      </Card>

      {/* ─── MODALE DE PRÉVISUALISATION ET VALIDATION LÉGALE FORCÉE ─── */}
      <LegalTermsPreviewModal
        open={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalModalTab}
        acceptedTerms={acceptTerms}
        acceptedPrivacy={acceptPrivacy}
        onAcceptAll={() => {
          setAcceptTerms(true);
          setAcceptPrivacy(true);
          setError('');
        }}
      />
    </AuthSplitLayout>
  );
}
