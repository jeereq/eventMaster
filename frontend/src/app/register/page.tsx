'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
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
  MessageSquare,
  ScanLine,
  LayoutGrid,
  Wallet,
  CalendarCheck,
  Store,
  Sparkles,
  Users,
  ShieldCheck,
  Eye,
  ArrowRight,
  CheckCircle2,
  Ticket,
  Scale,
} from 'lucide-react';
import { AuthSplitLayout, MethodToggle } from '@/components/AuthSplitLayout';
import { Button, Alert, Input, PasswordInput, Card, PhoneInput } from '@/components/ui';
import { TERMS_VERSION, PRIVACY_VERSION } from '@/config/legalConfig';
import { parseReferralFromSearchParams } from '@/lib/referralLink';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import {
  allowsAuthOtpChoice,
  defaultAuthOtpMethod,
  type AuthOtpMethod,
} from '@/lib/authOtpChannels';
import { interpolateRates } from '@/lib/platformRates';
import { DEFAULT_PHONE_COUNTRY_CODE, composeE164 } from '@/lib/phone';
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  type ServiceCategory,
  type TenantAccountKind,
} from '@/lib/marketplace';
import {
  registerAccountFormTitle,
  registerAccountShortLabel,
  registerAccountSummary,
} from '@/lib/registerAccountKinds';
import { safeAppPath, isClientReturnPath } from '@/lib/safeAppPath';
import { LANDING_PLANS } from '@/config/landingPricing';
import RegisterAccountKindPicker from '@/components/register/RegisterAccountKindPicker';
import RegisterReferralGate from '@/components/register/RegisterReferralGate';
import RegisterVendorTrackPicker from '@/components/register/RegisterVendorTrackPicker';
import {
  planForVendorTrack,
  resolveVendorTrackFromParams,
  saveRegisterVendorIntent,
  serviceGroupForCategory,
  type VendorRegisterTrack,
  type VendorServiceGroup,
} from '@/lib/registerVendorIntent';
import { cn } from '@/lib/cn';

const LegalTermsPreviewModal = dynamic(
  () => import('@/components/LegalTermsPreviewModal'),
);

interface RegistrationActionConfig {
  key: string;
  heroTitle: string;
  heroDescription: string;
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
    heroTitle: 'Concevez votre plan de salle et explorez en 3D',
    heroDescription:
      'Modélisez votre espace au millimètre, disposez vos tables, allées et éclairages, et placez vos invités en direct.',
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
    heroTitle: 'Votre événement réussi, maîtrisé de A à Z',
    heroDescription:
      'Créez l’événement, envoyez des faire-part WhatsApp personnalisés et suivez les réponses en direct.',
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
    heroTitle: 'Personnalisez votre invitation en 1 clic',
    heroDescription:
      'Sélectionnez un modèle élégant, personnalisez les textes et partagez votre faire-part digital à vos convives.',
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
    heroTitle: 'Attribution des places & gestion des invités',
    heroDescription:
      'Assignez chaque invité à sa table, synchronisez les confirmations en temps réel et préparez l’accueil.',
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
    heroTitle: 'Billetterie en ligne & encaissements FlexPay',
    heroDescription:
      'Vendez vos billets par zone (VIP, Standard), encaissez en CDF par Mobile Money / Carte et gérez vos flux.',
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
    heroTitle: 'Ouvrez l’organisation, puis invitez le protocole',
    heroDescription:
      'Ce formulaire crée le compte propriétaire de l’organisation. Les agents protocole s’ajoutent ensuite dans Équipe (4 jetons IA chacun).',
    defaultAccountKind: 'ORGANIZER',
    defaultNextPath: '/dashboard/team',
    submitButtonLabel: 'Créer l’organisation',
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
    heroTitle: 'Suivi des ventes, billetterie et rapports',
    heroDescription:
      'Consultez les statistiques d’encaissements en temps réel et téléchargez les listes certifiées.',
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
    heroTitle: 'Gestion collaborative & rôles d’accès',
    heroDescription:
      'Attribuez des droits sécurisés à vos collaborateurs, régisseurs et agents d’accueil sur le terrain.',
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
    heroTitle: 'Référencez votre salle sur le marketplace',
    heroDescription:
      'Créez votre fiche vitrine avec visite 3D, recevez des demandes de devis qualifiées et sécurisez vos dates.',
    defaultAccountKind: 'VENDOR',
    defaultNextPath: '/dashboard/rooms',
    submitButtonLabel: 'Référencer mon établissement',
    orgLabel: 'Nom de la salle ou complexe',
    orgPlaceholder: 'Ex: Domaine Royal / Complexe Grand Duc',
    features: [
      { step: 1, icon: Building2, title: 'Fiche vitrine 3D', desc: 'Photos haute résolution, tarifs de réservation et capacité d’accueil.' },
      { step: 2, icon: MessageSquare, title: 'Demandes de devis directes', desc: 'Échangez sans intermédiaire avec les futurs organisateurs.' },
      { step: 3, icon: CalendarCheck, title: 'Planning de réservation', desc: 'Bloquez vos dates fermes et gérez vos acomptes.' },
    ],
  },
  services: {
    key: 'services',
    heroTitle: 'Mettez en valeur vos prestations événementielles',
    heroDescription:
      'Choisissez votre métier, publiez une offre claire, puis recevez des devis d’organisateurs près de chez vous.',
    defaultAccountKind: 'VENDOR',
    defaultNextPath: '/dashboard/marketplace',
    submitButtonLabel: 'Créer ma fiche prestataire',
    orgLabel: 'Nom de l’enseigne ou entreprise',
    orgPlaceholder: 'Ex: Prestige Traiteur / Sonorisation Pro Kin',
    features: [
      { step: 1, icon: Store, title: 'Choisir le métier', desc: 'Prestation (traiteur, photo, DJ…) ou location de matériel.' },
      { step: 2, icon: Mail, title: 'Publier une offre', desc: 'Tarif de départ, zone et photos — visible par les organisateurs.' },
      { step: 3, icon: CalendarCheck, title: 'Répondre aux devis', desc: 'Demande, date, acompte. Sans commission plateforme.' },
    ],
  },
  quotes: {
    key: 'quotes',
    heroTitle: 'Répondez aux demandes de devis clients',
    heroDescription:
      'Gérez vos échanges commerciaux, validez les réservations et synchronisez vos disponibilités.',
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
    heroTitle: 'Trouvez la salle ou le prestataire idéal',
    heroDescription:
      'Compte 100% gratuit. Enregistrez vos favoris, composez vos packs budget et demandez des devis sans engagement.',
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
    heroTitle: 'Votre fête réussie de A à Z',
    heroDescription:
      'Créez votre événement, invitez vos proches sur WhatsApp et placez-les sur plan de salle 2D/3D.',
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
    heroTitle: 'Billetterie et gestion multi-événements',
    heroDescription:
      'Vendez vos billets par zone, encaissez par Mobile Money/Carte et coordonnez votre desk protocole.',
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
    heroTitle: 'Donnez de la visibilité à votre activité',
    heroDescription:
      'Publiez votre fiche vitrine, recevez des demandes qualifiées et développez votre clientèle.',
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
    heroTitle: 'Votre espace organisateur',
    heroDescription:
      'Créez l’événement, invitez vos proches, suivez les réponses et accueillez le jour J.',
    defaultAccountKind: 'ORGANIZER',
    defaultNextPath: '/dashboard/events',
    submitButtonLabel: 'Créer mon compte organisateur',
    orgLabel: 'Nom de l’événement ou de l’organisation',
    orgPlaceholder: 'Ex: Mariage Sarah & David / Famille Dupont',
    features: [
      { step: 1, icon: Calendar, title: 'Créer', desc: 'Titre, date, lieu. Un modèle d’invitation prêt en un clic.' },
      { step: 2, icon: Mail, title: 'Inviter', desc: 'Un lien par personne. Suivez les réponses sans aucun stress.' },
      { step: 3, icon: ScanLine, title: 'Accueillir', desc: 'Scannez vos invités à l’entrée, directement depuis votre smartphone.' },
    ],
  },
  CLIENT: {
    key: 'CLIENT',
    heroTitle: 'Trouvez salle et prestataires',
    heroDescription:
      'Compte gratuit. Comparez, gardez des favoris, demandez un devis sans engagement.',
    defaultAccountKind: 'CLIENT',
    defaultNextPath: '/marketplace',
    submitButtonLabel: 'Créer mon compte gratuit',
    orgLabel: '',
    orgPlaceholder: '',
    features: [
      { step: 1, icon: LayoutGrid, title: 'Explorer', desc: 'Salles 3D, prestataires, matériel. Trouvez ce qu’il vous faut.' },
      { step: 2, icon: Wallet, title: 'Comparer', desc: 'Favoris et pack budget. Rien n’est réservé tant que le devis n’est pas envoyé.' },
      { step: 3, icon: CalendarCheck, title: 'Demander un devis', desc: 'Écrivez au pro. L’acompte se verse ensuite, directement.' },
    ],
  },
  VENDOR: {
    key: 'VENDOR',
    heroTitle: 'Publiez votre activité',
    heroDescription:
      'Une vitrine pour votre salle ou votre métier. Les organisateurs vous écrivent, vous bloquez la date.',
    defaultAccountKind: 'VENDOR',
    defaultNextPath: '/dashboard/catalogue',
    submitButtonLabel: 'Créer mon compte professionnel',
    orgLabel: 'Nom de l’établissement ou de l’enseigne',
    orgPlaceholder: 'Ex: Espace Prestige Kinshasa',
    features: [
      { step: 1, icon: Store, title: 'Publier', desc: 'Photos, tarifs, éventuellement visite 3D.' },
      { step: 2, icon: MessageSquare, title: 'Répondre', desc: 'Demandes de devis d’organisateurs, sans commission cachée.' },
      { step: 3, icon: CalendarCheck, title: 'Confirmer', desc: 'Bloquez la date et suivez les acomptes.' },
    ],
  },
  BOTH: {
    key: 'BOTH',
    heroTitle: 'Organiser et vendre, ensemble',
    heroDescription:
      'Un compte pour vos événements et pour votre vitrine salle ou prestataire.',
    defaultAccountKind: 'BOTH',
    defaultNextPath: '/dashboard',
    submitButtonLabel: 'Créer mon compte',
    orgLabel: 'Nom de l’entreprise ou de l’établissement',
    orgPlaceholder: 'Ex: Groupe Événementiel & Salles',
    features: [
      { step: 1, icon: Calendar, title: 'Organiser', desc: 'Invitations, plan de table, accueil QR.' },
      { step: 2, icon: Store, title: 'Publier', desc: 'Votre salle ou vos prestations, visibles des organisateurs.' },
      { step: 3, icon: ScanLine, title: 'Le jour J', desc: 'Scan à l’entrée, sans application à installer pour les invités.' },
    ],
  },
};

function resolveActionConfig(
  action: string | null,
  intent: string | null,
  accountKind: TenantAccountKind,
  isClientFlow: boolean,
  plan: string | null,
): RegistrationActionConfig {
  if (action && REGISTRATION_ACTION_CONFIGS[action]) {
    return REGISTRATION_ACTION_CONFIGS[action];
  }
  if (action === 'venues' || action === 'packs') {
    return REGISTRATION_ACTION_CONFIGS.seeker;
  }
  if (action === 'ai_recommendation' || action === 'rentals') {
    return REGISTRATION_ACTION_CONFIGS.services;
  }
  const planKey = (plan || '').toUpperCase();
  if (planKey === 'VENUE') return REGISTRATION_ACTION_CONFIGS.venue;
  if (planKey === 'SERVICE') return REGISTRATION_ACTION_CONFIGS.services;
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

const KIND_STEP_FEATURES = [
  { step: 1, icon: Calendar, title: 'Choisissez l’usage', desc: 'Organiser, chercher, ou publier une salle / un métier.' },
  { step: 2, icon: User, title: 'Vos coordonnées', desc: 'Nom, e-mail, mot de passe. Sans carte bancaire.' },
  { step: 3, icon: Mail, title: 'Un code, puis l’accès', desc: 'Confirmation par e-mail ou WhatsApp, ensuite votre espace s’ouvre.' },
];

const VENDOR_TRACK_FEATURES = [
  { step: 1, icon: Building2, title: 'Salle ou métier', desc: 'Un lieu à réserver, ou un service qui se déplace.' },
  { step: 2, icon: User, title: 'Le compte', desc: 'Nom de la salle ou de l’enseigne, puis e-mail et mot de passe.' },
  { step: 3, icon: CalendarCheck, title: 'Votre fiche', desc: 'Après le code, vous publiez vitrine, tarifs et disponibilités.' },
];

export default function RegisterPage() {
 return (
 <Suspense
 fallback={
        <AuthSplitLayout
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

function applyRegisterError(
  message: string,
  setters: {
    setError: (value: string) => void;
    setEmailError: (value: string) => void;
    setOrgError: (value: string) => void;
    setPhoneError: (value: string) => void;
    setReferralError: (value: string) => void;
  },
) {
  const lower = message.toLowerCase();
  if (lower.includes('email')) {
    setters.setEmailError(message);
    window.setTimeout(() => document.getElementById('email')?.focus(), 0);
    return;
  }
  if (lower.includes('parrain')) {
    setters.setReferralError(message);
    window.setTimeout(() => document.getElementById('referralCode')?.focus(), 0);
    return;
  }
  if (lower.includes('téléphone') || lower.includes('whatsapp')) {
    setters.setPhoneError(message);
    window.setTimeout(() => document.getElementById('phone')?.focus(), 0);
    return;
  }
  if (
    lower.includes('organisation')
    || lower.includes('enseigne')
    || lower.includes('salle')
    || lower.includes('complexe')
    || lower.includes('établissement')
  ) {
    setters.setOrgError(message);
    window.setTimeout(() => document.getElementById('tenantName')?.focus(), 0);
    return;
  }
  setters.setError(message);
}

function RegisterPageContent() {
 const { register } = useAuth();
 const { site, ready } = usePlatformSite();
  const authChannels = site.authOtpChannels;
  const canChooseOtpChannel = allowsAuthOtpChoice(authChannels);
 const router = useRouter();
 const searchParams = useSearchParams();

  const nextParam = searchParams.get('next');
  const nextPath = safeAppPath(nextParam);
  const intentParam = searchParams.get('intent');
  const actionParam = searchParams.get('action');
  const planParam = searchParams.get('plan');
  const templateIdParam = searchParams.get('templateId');
  const kindFromUrl = Boolean(actionParam || intentParam || planParam || searchParams.get('kind'));

 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [name, setName] = useState('');
 const [tenantName, setTenantName] = useState('');
 const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_PHONE_COUNTRY_CODE);
 const [phoneNational, setPhoneNational] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<AuthOtpMethod>(defaultAuthOtpMethod(authChannels));
 const [acceptTerms, setAcceptTerms] = useState(false);
 const [acceptPrivacy, setAcceptPrivacy] = useState(false);
 const [referralCode, setReferralCode] = useState('');
 const [referralFromLink, setReferralFromLink] = useState(false);
  const [referralChoice, setReferralChoice] = useState<'yes' | 'no' | null>(null);
 const [accountKind, setAccountKind] = useState<TenantAccountKind>('ORGANIZER');
  const [vendorTrack, setVendorTrack] = useState<VendorRegisterTrack | null>(null);
  const [serviceGroup, setServiceGroup] = useState<VendorServiceGroup | null>(null);
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory | null>(null);
 const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [orgError, setOrgError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [referralError, setReferralError] = useState('');
 const [successMessage, setSuccessMessage] = useState('');
 const [loading, setLoading] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'summary' | 'terms' | 'privacy'>('summary');
  const [kindConfirmed, setKindConfirmed] = useState(kindFromUrl);

  useEffect(() => {
    setVerificationMethod(defaultAuthOtpMethod(authChannels));
  }, [authChannels]);

  useEffect(() => {
    if (!error) return;
    document.getElementById('register-form-error')?.focus();
  }, [error]);

  const isClientFlow = accountKind === 'CLIENT' || isClientReturnPath(nextPath);

  useEffect(() => {
    if (kindFromUrl) setKindConfirmed(true);
  }, [kindFromUrl]);

  // Détection et pré-sélection intelligente des paramètres URL
 useEffect(() => {
   const fromUrl = parseReferralFromSearchParams(searchParams);
   if (fromUrl) {
     setReferralCode(fromUrl);
     setReferralFromLink(true);
      setReferralChoice('yes');
   }
   const kind = searchParams.get('kind');
   if (kind === 'CLIENT' || kind === 'VENDOR' || kind === 'BOTH' || kind === 'ORGANIZER') {
     setAccountKind(kind);
    } else if (actionParam === 'venue' || actionParam === 'services' || actionParam === 'quotes' || actionParam === 'rentals' || actionParam === 'ai_recommendation' || intentParam === 'vendor') {
     setAccountKind('VENDOR');
    } else if (actionParam === 'venues' || actionParam === 'packs' || intentParam === 'seeker') {
     setAccountKind('CLIENT');
    } else if (actionParam || intentParam === 'personal' || intentParam === 'pro') {
     setAccountKind('ORGANIZER');
   }

    const track = resolveVendorTrackFromParams({ action: actionParam, plan: planParam });
    if (track) setVendorTrack(track);
    if (actionParam === 'rentals') {
      setServiceGroup('rental');
    }
    const categoryParam = searchParams.get('category');
    if (categoryParam && (SERVICE_CATEGORIES as string[]).includes(categoryParam)) {
      const category = categoryParam as ServiceCategory;
      setServiceCategory(category);
      setServiceGroup(serviceGroupForCategory(category));
    }
  }, [searchParams, actionParam, intentParam, planParam]);

  const effectiveAction = vendorTrack === 'venue'
    ? 'venue'
    : vendorTrack === 'service'
      ? 'services'
      : actionParam;

  // Résolution de la configuration éditoriale contextuelle
  const config = useMemo(() => {
    return resolveActionConfig(effectiveAction, intentParam, accountKind, isClientFlow, planParam);
  }, [effectiveAction, intentParam, accountKind, isClientFlow, planParam]);

  const vendorPlanLocked = planParam === 'VENUE' || planParam === 'SERVICE' || planParam === 'CATALOG';
  const kindReady = kindFromUrl || kindConfirmed;
  const showKindChooser = !kindReady;
  const showVendorChooser = kindReady && accountKind === 'VENDOR' && !vendorTrack;
  const showAccountForm = kindReady && !showVendorChooser;

  const goBackToKind = () => {
    if (kindFromUrl) return;
    setKindConfirmed(false);
    setVendorTrack(null);
    setServiceGroup(null);
    setServiceCategory(null);
    setError('');
  };

  const goBackToVendorTrack = () => {
    if (vendorPlanLocked) return;
    setVendorTrack(null);
    setServiceGroup(actionParam === 'rentals' ? 'rental' : null);
    setServiceCategory(null);
    setError('');
  };

  // Résolution des détails du forfait éventuel
  const matchedPlan = useMemo(() => {
    if (!planParam) return null;
    return LANDING_PLANS.find((p) => p.id === planParam) ?? null;
  }, [planParam]);

  // Destination intelligente de redirection après validation
  const targetNextPath = useMemo(() => {
    if (nextPath) return nextPath;
    if (matchedPlan && matchedPlan.id !== 'FREE') {
      return `/dashboard/billing?plan=${encodeURIComponent(matchedPlan.id)}`;
    }
    if (templateIdParam && config.key === 'template') {
      return `/dashboard/templates?templateId=${encodeURIComponent(templateIdParam)}`;
    }
    return config.defaultNextPath;
  }, [nextPath, templateIdParam, config, matchedPlan]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setError('');
    setEmailError('');
    setOrgError('');
    setPhoneError('');
    setReferralError('');

    if (!acceptTerms || !acceptPrivacy) {
      setLegalModalTab(!acceptTerms ? 'terms' : 'privacy');
      setLegalModalOpen(true);
      setError('Cochez les conditions et la confidentialité après lecture, ou utilisez « Tout lire & approuver ».');
      return;
    }

 setLoading(true);

 if (verificationMethod === 'WHATSAPP' && !phoneNational.trim()) {
      const phoneMsg = 'Le numéro de téléphone est obligatoire pour la confirmation par WhatsApp.';
      setPhoneError(phoneMsg);
      setLoading(false);
      window.setTimeout(() => document.getElementById('phone')?.focus(), 0);
 return;
 }

 try {
 const e164 = composeE164(phoneCountryCode, phoneNational) || undefined;
 const orgName = accountKind === 'CLIENT' ? name.trim() : tenantName.trim();
 if (accountKind !== 'CLIENT' && !orgName) {
        const orgMsg = vendorTrack === 'venue'
          ? 'Le nom de la salle ou du complexe est obligatoire.'
          : vendorTrack === 'service'
            ? 'Le nom de l’enseigne est obligatoire.'
            : 'Le nom de l’organisation ou établissement est obligatoire.';
        setOrgError(orgMsg);
 setLoading(false);
        window.setTimeout(() => document.getElementById('tenantName')?.focus(), 0);
 return;
 }

      if (accountKind === 'VENDOR' && vendorTrack) {
        saveRegisterVendorIntent({
          track: vendorTrack,
          serviceGroup: serviceCategory ? serviceGroupForCategory(serviceCategory) : serviceGroup || undefined,
          category: serviceCategory || undefined,
        });
      }

      const resolvedPlan = accountKind === 'VENDOR' && vendorTrack
        ? planForVendorTrack(vendorTrack, planParam)
        : planParam || undefined;
      const shouldSendReferral = referralChoice === 'yes' || referralFromLink;
      const referralToSend = shouldSendReferral ? (referralCode.trim() || undefined) : undefined;

 const res = await register(
 email,
 password,
 name,
 orgName,
 e164,
 verificationMethod,
 acceptTerms,
 acceptPrivacy,
        referralToSend,
 phoneCountryCode,
 phoneNational,
 accountKind,
        intentParam || undefined,
        resolvedPlan,
 );

 if (res.requiresVerification && res.email) {
        const nextQ = targetNextPath ? `&next=${encodeURIComponent(targetNextPath)}` : '';
        const welcomeQ = res.welcomeTokens?.offer === 'error' ? '&welcome=failed' : '';
        router.push(
          `/verify-otp?email=${encodeURIComponent(res.email)}&method=${res.verificationMethod || verificationMethod}${nextQ}${welcomeQ}`,
        );
 return;
 }

 setSuccessMessage(res.message);
 setLoading(false);
 } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue lors de la création du compte.';
      applyRegisterError(message, {
        setError,
        setEmailError,
        setOrgError,
        setPhoneError,
        setReferralError,
      });
 setLoading(false);
 }
 };

  const layoutTitle = showKindChooser
    ? 'Que voulez-vous faire ?'
    : showVendorChooser
      ? 'Salle à réserver, ou métier de service ?'
      : config.heroTitle;
  const layoutDescription = showKindChooser
    ? 'Trois usages, un compte. Choisissez d’abord : le formulaire s’adapte ensuite.'
    : showVendorChooser
      ? 'Une salle est un lieu. Un métier se déplace ou loue du matériel. Choisissez pour commencer.'
      : interpolateRates(config.heroDescription, site);

  const layoutFeatures = useMemo(() => {
    const source = showKindChooser
      ? KIND_STEP_FEATURES
      : showVendorChooser
        ? VENDOR_TRACK_FEATURES
        : config.features;
    return source.map((item) => ({
      ...item,
      desc: interpolateRates(item.desc, site),
    }));
  }, [showKindChooser, showVendorChooser, config.features, site]);

  const loginHref = targetNextPath ? `/login?next=${encodeURIComponent(targetNextPath)}` : '/login';

 return (
 <AuthSplitLayout
      title={layoutTitle}
      description={layoutDescription}
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
            <div className="inline-flex items-center justify-center bg-primary/15 p-3.5 rounded-full text-primary">
              {verificationMethod === 'WHATSAPP' ? (
                <MessageSquare className="w-8 h-8" aria-hidden />
              ) : (
                <Mail className="w-8 h-8" aria-hidden />
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
            {error && (
              <Alert variant="error" className="mb-3 py-2 text-xs" id="register-form-error">
                {error}
              </Alert>
            )}

            {showKindChooser && (
              <RegisterAccountKindPicker
                loginHref={loginHref}
                onSelect={(kind) => {
                  setAccountKind(kind);
                  setKindConfirmed(true);
                  setError('');
                  if (kind !== 'VENDOR') {
                    setVendorTrack(null);
                    setServiceGroup(null);
                    setServiceCategory(null);
                  }
                }}
              />
            )}

            {showVendorChooser && (
              <RegisterVendorTrackPicker
                onSelect={setVendorTrack}
                onBack={kindFromUrl ? undefined : goBackToKind}
                loginHref={loginHref}
              />
            )}

            {showAccountForm && (
            <>
            <div className="text-left mb-3 space-y-1.5">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                {registerAccountFormTitle(accountKind, vendorTrack)}
              </h2>
              <p className="text-sm text-muted leading-relaxed">
                {registerAccountSummary(accountKind, vendorTrack)}
              </p>
              <p className="text-xs text-muted leading-relaxed">
                Compte : <span className="font-semibold text-foreground">{registerAccountShortLabel(accountKind, vendorTrack)}</span>
                {!kindFromUrl ? (
                  <>
                    {' · '}
                    <button
                      type="button"
                      onClick={vendorTrack && !vendorPlanLocked ? goBackToVendorTrack : goBackToKind}
                      className="font-semibold text-primary hover:underline min-h-11 inline-flex items-center"
                    >
                      Changer le type de compte
                    </button>
                  </>
                ) : vendorTrack && !vendorPlanLocked ? (
                  <>
                    {' · '}
                    <button
                      type="button"
                      onClick={goBackToVendorTrack}
                      className="font-semibold text-primary hover:underline min-h-11 inline-flex items-center"
                    >
                      Choisir salle ou métier
                    </button>
                  </>
                ) : null}
                {' · '}
                Déjà un compte ?{' '}
                <Link href={loginHref} className="font-semibold text-primary hover:underline">
                  Connexion
                </Link>
              </p>
              {matchedPlan && matchedPlan.id !== 'FREE' && (
                <p className="text-xs text-muted">
                  Forfait choisi : <span className="font-semibold text-foreground">{matchedPlan.ms365Name}</span>
                  {' — vous pourrez le valider après confirmation.'}
                </p>
              )}
              {templateIdParam && (
                <p className="text-xs text-muted">Le modèle d’invitation reste réservé après confirmation.</p>
              )}
              {vendorTrack === 'service' && serviceCategory && (
                <p className="text-xs text-muted">
                  Métier : {SERVICE_CATEGORY_LABELS[serviceCategory]}. Vous pourrez le préciser après connexion.
                </p>
              )}
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className={cn('grid gap-2.5', accountKind === 'CLIENT' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
                <Input
                  label={accountKind === 'CLIENT' ? 'Votre nom complet' : 'Votre nom & prénom'}
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jean Dupont"
                  leftIcon={<User className="w-4 h-4" aria-hidden />}
                />
                {accountKind !== 'CLIENT' && (
                  <Input
                    label={config.orgLabel || 'Nom organisation / Événement'}
                    id="tenantName"
                    required
                    value={tenantName}
                    onChange={(e) => {
                      setTenantName(e.target.value);
                      if (orgError) setOrgError('');
                    }}
                    placeholder={config.orgPlaceholder || 'Dupont Événements'}
                    leftIcon={<Building className="w-4 h-4" aria-hidden />}
                    error={orgError || undefined}
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  placeholder="jean@exemple.com"
                  leftIcon={<Mail className="w-4 h-4" aria-hidden />}
                  error={emailError || undefined}
                />

 <PhoneInput
 id="phone"
 label="Téléphone WhatsApp"
 countryCode={phoneCountryCode}
 national={phoneNational}
 onCountryCodeChange={setPhoneCountryCode}
 onNationalChange={(next) => {
   setPhoneNational(next);
   if (phoneError) setPhoneError('');
 }}
 required={verificationMethod === 'WHATSAPP'}
                  placeholder="812345678"
                  error={phoneError || undefined}
                />
              </div>

 <PasswordInput
                label="Mot de passe"
                id="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4" aria-hidden />}
                hint="Au moins 6 caractères."
              />

              <RegisterReferralGate
                choice={referralChoice}
                onChoice={(next) => {
                  setReferralChoice(next);
                  setReferralFromLink(false);
                  if (next === 'no') setReferralCode('');
                  if (referralError) setReferralError('');
                }}
                code={referralCode}
                onCodeChange={(next) => {
                  setReferralCode(next);
                  if (referralError) setReferralError('');
                }}
                fromLink={referralFromLink}
                error={referralError || undefined}
              />

              {/* ─── CHOIX DE MÉTHODE DE VALIDATION OTP ─── */}
              {canChooseOtpChannel ? (
 <MethodToggle
                  label="Réception du code de confirmation"
 value={verificationMethod}
 onChange={setVerificationMethod}
 options={[
                    { value: 'EMAIL' as const, label: 'Par e-mail', icon: <Mail className="w-3.5 h-3.5" aria-hidden /> },
                    { value: 'WHATSAPP' as const, label: 'Par WhatsApp', icon: <MessageSquare className="w-3.5 h-3.5" aria-hidden /> },
                  ]}
                />
              ) : (
                <p className="text-xs text-muted">
                  Code de confirmation envoyé{' '}
                  {verificationMethod === 'WHATSAPP' ? 'par WhatsApp' : 'par e-mail'}
                  {' '}(réglage plateforme).
                </p>
              )}

              {/* ─── CONDITIONS LÉGALES & PRÉVISUALISATION COMPACTES ─── */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1 text-xs">
                    <Scale className="w-3.5 h-3.5 text-primary" aria-hidden />
                    Engagements
                  </span>
                  {(!acceptTerms || !acceptPrivacy) && (
                    <button
                      type="button"
                      onClick={() => {
                        setLegalModalTab('summary');
                        setLegalModalOpen(true);
                      }}
                      className="text-xs font-bold text-primary hover:underline inline-flex items-center min-h-11 gap-1 touch-manipulation cursor-pointer"
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
                      'min-h-11 px-2.5 py-1.5 rounded-[var(--radius-card)] border transition-all flex items-center justify-between gap-2 text-xs',
                      acceptTerms
                        ? 'border-primary/30 bg-primary/8'
                        : 'border-border bg-surface hover:border-primary/40',
                    )}
                  >
                    <label className="flex items-center gap-2 min-w-0 cursor-pointer flex-1 min-h-11">
                      <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="rounded text-primary focus:ring-primary accent-primary shrink-0 h-4 w-4"
                      />
                      <span className="font-medium text-foreground truncate text-xs">
                        Conditions d’utilisation <span className="text-xs text-muted">v{TERMS_VERSION}</span>
 </span>
 </label>

                    <button
                      type="button"
                      onClick={() => {
                        setLegalModalTab('terms');
                        setLegalModalOpen(true);
                      }}
                      aria-label={acceptTerms ? 'Relire les conditions d’utilisation' : 'Lire les conditions d’utilisation'}
                      className={cn(
                        'min-h-11 min-w-11 px-2 rounded-[var(--radius-button)] text-xs font-bold shrink-0 transition inline-flex items-center justify-center gap-0.5 touch-manipulation cursor-pointer',
                        acceptTerms
                          ? 'text-primary bg-primary/12'
                          : 'text-primary bg-primary/10 hover:bg-primary/20',
                      )}
                    >
                      {acceptTerms ? <CheckCircle2 className="w-4 h-4 text-primary" aria-hidden /> : null}
                      {acceptTerms ? 'Relire' : 'Lire'}
                    </button>
                  </div>

                  {/* 2. Carte Politique de confidentialité */}
                  <div
                    className={cn(
                      'min-h-11 px-2.5 py-1.5 rounded-[var(--radius-card)] border transition-all flex items-center justify-between gap-2 text-xs',
                      acceptPrivacy
                        ? 'border-primary/30 bg-primary/8'
                        : 'border-border bg-surface hover:border-primary/40',
                    )}
                  >
                    <label className="flex items-center gap-2 min-w-0 cursor-pointer flex-1 min-h-11">
                      <input
                        type="checkbox"
                        checked={acceptPrivacy}
                        onChange={(e) => setAcceptPrivacy(e.target.checked)}
                        className="rounded text-primary focus:ring-primary accent-primary shrink-0 h-4 w-4"
                      />
                      <span className="font-medium text-foreground truncate text-xs">
                        Confidentialité <span className="text-xs text-muted">v{PRIVACY_VERSION}</span>
 </span>
 </label>

                    <button
                      type="button"
                      onClick={() => {
                        setLegalModalTab('privacy');
                        setLegalModalOpen(true);
                      }}
                      aria-label={acceptPrivacy ? 'Relire la politique de confidentialité' : 'Lire la politique de confidentialité'}
                      className={cn(
                        'min-h-11 min-w-11 px-2 rounded-[var(--radius-button)] text-xs font-bold shrink-0 transition inline-flex items-center justify-center gap-0.5 touch-manipulation cursor-pointer',
                        acceptPrivacy
                          ? 'text-primary bg-primary/12'
                          : 'text-primary bg-primary/10 hover:bg-primary/20',
                      )}
                    >
                      {acceptPrivacy ? <CheckCircle2 className="w-4 h-4 text-primary" aria-hidden /> : null}
                      {acceptPrivacy ? 'Relire' : 'Lire'}
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

                <p className="text-center text-xs text-muted">
                  Sans carte. Un code de confirmation, puis l’accès.
                </p>
              </div>
 </form>
            </>
            )}
 </>
 )}
 </Card>

      {/* ─── MODALE DE PRÉVISUALISATION ET VALIDATION LÉGALE FORCÉE ─── */}
      {legalModalOpen ? (
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
      ) : null}
 </AuthSplitLayout>
 );
}
