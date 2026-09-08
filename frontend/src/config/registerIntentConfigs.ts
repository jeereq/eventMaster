import {
  Calendar,
  Mail,
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
  Ticket,
  Building2,
} from 'lucide-react';
import type { RegistrationActionConfig } from '@/lib/registerActionConfig';

/** Copy landing / URL-intent — loaded only when action, intent or plan is present. */
export const REGISTER_INTENT_CONFIGS: Record<string, RegistrationActionConfig> = {
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
  ai_simulator: {
    key: 'ai_simulator',
    heroTitle: 'Gardez vos packs budget IA',
    heroDescription:
      'Compte client gratuit. Retenez les formules du simulateur, ouvrez les fiches et envoyez les devis sans engagement.',
    defaultAccountKind: 'CLIENT',
    defaultNextPath: '/simulateur',
    submitButtonLabel: 'Créer mon compte client gratuit',
    orgLabel: '',
    orgPlaceholder: '',
    features: [
      { step: 1, icon: Sparkles, title: 'Simuler', desc: 'Trois formules (éco, équilibré, confort) à partir du catalogue réel.' },
      { step: 2, icon: Wallet, title: 'Retenir un pack', desc: 'Enregistrez la formule choisie pour y revenir plus tard.' },
      { step: 3, icon: CalendarCheck, title: 'Demander un devis', desc: 'Écrivez au pro. L’acompte se verse ensuite, directement.' },
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
};
