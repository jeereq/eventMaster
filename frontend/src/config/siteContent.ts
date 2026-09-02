import { TERMS_VERSION, PRIVACY_VERSION } from '@/config/legalConfig';

export const SITE_CONTACT = {
  email: 'mingandajeereq@gmail.com',
  phone: '+243 817 125 577',
  phoneHref: 'tel:+243817125577',
  whatsappNote: 'WhatsApp disponible',
  addressLine1: 'Boulevard du 30 Juin, Gombe',
  addressLine2: 'Kinshasa, RD Congo',
  addressShort: 'Boulevard du 30 Juin, Gombe, Kinshasa, RDC',
  supportHours: 'Lun–Sam, 8h–20h (heure de Kinshasa)',
} as const;

export const FOOTER_FEATURES = [
  'Préparez votre événement en un clic',
  'Invitations, réponses, plan de table, accueil QR',
  'Marketplace : salles, prestataires, matériel & équipements',
  'Favoris, packs budget et réservations',
  'Événements publics et billets',
  'Tout dans le navigateur — l’app arrive bientôt',
] as const;

export const FOOTER_PRODUCT = [
  { label: 'Éditeur 2D/3D', href: '/#editeur' },
  { label: 'Marketplace', href: '/marketplace' },
  { label: 'Modèles', href: '/#modeles' },
  { label: 'Tarifs', href: '/#tarifs' },
  { label: 'FAQ', href: '/faq' },
] as const;

export const FOOTER_RESOURCES = [
  { label: 'Aide invité', href: '/guide/invite' },
  { label: 'Contact & Support', href: '/contact' },
  { label: `Conditions d'utilisation (v${TERMS_VERSION})`, href: '/terms' },
  { label: `Politique de confidentialité (v${PRIVACY_VERSION})`, href: '/privacy' },
  { label: 'Connexion', href: '/login' },
  { label: 'Compte client (devis, favoris & packs)', href: '/register' },
] as const;

export const FOOTER_BRAND_DESCRIPTION =
  'Préparez votre événement en un clic : invitations, plan de table, accueil QR, plus un marketplace pour salles et prestataires. Tout se fait dans le navigateur.';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'what-is-eventmaster',
    question: 'Qu\'est-ce qu\'EventMaster ?',
    answer:
      'Un outil pour préparer un événement en un clic : invitations, réponses, plan de table, accueil QR le jour J, et un marketplace pour trouver (ou publier) salles et prestataires. Pas besoin d’app : tout marche dans le navigateur, y compris sur téléphone.',
  },
  {
    id: 'mobile-app',
    question: 'Existe-t-il une application mobile ?',
    answer:
      'Pas encore. En attendant, RSVP, scan QR, tableau de bord et marketplace fonctionnent dans le navigateur — y compris sur téléphone.',
  },
  {
    id: 'placement-delivery',
    question: 'Quand l\'invité reçoit-il son plan de table, PDF et localisation GPS ?',
    answer:
      'Le premier message (e-mail ou WhatsApp) contient seulement le lien pour répondre. Le PDF, le plan de table et le pin GPS partent dès que l’invité dit oui ET qu’une place lui est attribuée — pas avant. Inclus sur tous les forfaits particuliers et organisations.',
  },
  {
    id: 'public-events',
    question: 'Puis-je organiser un événement public avec billets payants ?',
    answer:
      'Oui. Choisissez Public à la création : la fiche apparaît sur le marketplace. Inscription gratuite, ou billets payants. Un événement Privé reste sur liste d’invités uniquement.',
  },
  {
    id: 'marketplace-venues',
    question: 'Puis-je trouver une salle ou un prestataire sur EventMaster ?',
    answer:
      'Oui. Parcourez salles, prestataires, matériel et équipements sans compte. Pour un devis ou une réservation, créez un compte client gratuit. L’acompte ({depositPercent} %) se verse directement au professionnel, pas via EventMaster.',
  },
  {
    id: 'marketplace-booking',
    question: 'Comment fonctionne la réservation et la commission marketplace ?',
    answer:
      'Le professionnel accepte, vous versez l’acompte hors plateforme, il confirme : la date est bloquée. EventMaster n’encaisse pas l’acompte. Une commission de {commissionPercent} % (due par le vendeur) s’applique aux réservations confirmées.',
  },
  {
    id: 'client-account',
    question: 'Je cherche seulement une salle ou un prestataire : dois-je payer un abonnement ?',
    answer:
      'Non. Le compte client est gratuit : explorer, favoris, packs budget, devis. Pour organiser une fête ou publier vos offres, changez le type de compte puis choisissez un forfait.',
  },
  {
    id: 'event-packs',
    question: 'Comment fonctionne la simulation d’événement et de packs budget par IA ?',
    answer:
      'Indiquez votre type d’événement (mariage, fête, gala), votre budget en Francs Congolais (CDF), votre ville et votre nombre d’invités. Vous disposez de 3 simulations complètes gratuites sans connexion ni compte préalable. L’IA EventMaster analyse les prestataires et salles certifiés en RDC et génère instantanément 3 formules optimisées (Économique, Équilibré, Confort). Vous pouvez ajuster chaque poste, sauvegarder votre simulation et envoyer des demandes de devis directes en 1 clic.',
  },
  {
    id: 'free-trial',
    question: 'Puis-je essayer gratuitement ?',
    answer:
      'Oui. Le forfait gratuit (Essentiel) permet de créer une organisation, jusqu’à 3 événements et 50 invités — sans carte. Ensuite, vous passez au forfait qui correspond : particulier, organisation, salle ou prestataire.',
  },
  {
    id: 'plans-quotas',
    question: 'Comment fonctionnent les forfaits et les quotas ?',
    answer:
      'Chaque organisation souscrit un seul forfait. Les particuliers choisissent un palier d’invités (50, 100, 200 ou +200) avec éditeur de salle complet : période de base = trimestre (90 jours). Les organisateurs B2B ont Essentiel (gratuit), Business, Premium / Premium Plus et Enterprise (mois). Les gestionnaires de salles et prestataires ont Salle (salles illimitées), Prestataire (prestations illimitées) ou Salle & presta (les deux illimités) — sans événements ni invités. Le tableau de bord affiche vos quotas. Le paiement annuel facture 12 mois (ou 4 trimestres pour Particulier) d’un coup, avec −10 % sur ce total. L’éditeur de salles 2D/3D dépend aussi du niveau d’éditeur du forfait — voir la question dédiée.',
  },
  {
    id: 'room-editor-plans',
    question: 'Quelles fonctions de l’éditeur de salles sont incluses selon mon abonnement ?',
    answer:
      'L’éditeur de salles est délimité par le niveau d’éditeur du forfait (visible dans Facturation) :\n\n• Essentiel (découverte) — tables simples, déplacement et suppression. Pas de thèmes ni d’éléments décoratifs (fixtures).\n• Business — rangées, duplication, verrouillage, grille ; entrées, allées et couloirs.\n• Premium / Premium Plus — thèmes, sol, scène, buffet, zones (piste, VIP), rotation, rendu showcase ; escaliers entre étages et balcons.\n• Complet (Particulier, Enterprise, forfaits Salle / Salle & presta) — tout le Premium, plus périmètre, tapis, thèmes personnalisés et images custom.\n\nLes modèles multi-étages (Duplex, Villa…) et la vue empilée sont disponibles dès que vous avez accès à l’éditeur ; créer un escalier ou un balcon exige le niveau Premium (ou Complet) avec thèmes/fixtures activés. Pour monter de niveau : Facturation → changer de forfait.',
  },
  {
    id: 'b2c-annual',
    question: 'Les forfaits Particulier ont-ils une réduction annuelle ?',
    answer:
      'Oui. La période de base d’un forfait Particulier est le trimestre (90 jours). Le paiement annuel facture 4 trimestres d’un coup, avec 10 % de réduction sur ce total — comme les forfaits organisations et marketplace (12 mois). Le prix affiché en mode annuel est le montant à payer pour l’année, pas l’équivalent d’un trimestre.',
  },
  {
    id: 'data-responsibility',
    question: 'Qui est responsable des données invités et utilisateurs ?',
    answer:
      'Votre organisation est responsable de traitement des données qu\'elle saisit ou importe (invités, membres d\'équipe, contenus). EventMaster agit en sous-traitant pour héberger et sécuriser ces données. Vous devez disposer d\'une base légale, informer les personnes concernées et répondre à leurs demandes d\'accès ou d\'effacement.',
  },
  {
    id: 'security',
    question: 'Quelles mesures de sécurité EventMaster met-il en place ?',
    answer:
      'Isolation multi-tenant, chiffrement HTTPS, mots de passe hashés, authentification OTP (e-mail ou WhatsApp), rôles et permissions granulaires, journalisation des acceptations légales et accès administration limité au personnel autorisé. Protégez aussi vos identifiants en interne.',
  },
  {
    id: 'protocol-qr',
    question: 'Comment fonctionne le protocole QR ?',
    answer:
      'Chaque invité qui dit oui reçoit un badge QR. Le jour J, vous le scannez à l’entrée depuis le navigateur du téléphone. Présence enregistrée, siège validé. Pas d’app à installer. Inclus sur tous les forfaits particuliers et organisations.',
  },
  {
    id: 'roles',
    question: 'Puis-je ajouter des managers ou du personnel protocole ?',
    answer:
      'Oui. Le propriétaire peut inviter des managers, du personnel protocole, et des responsables de salle ou d’événement selon les quotas du forfait. Chaque rôle n’accède qu’aux ressources autorisées. Un manager salle interne à une organisation est distinct du forfait Salle du marketplace.',
  },
  {
    id: 'upgrade',
    question: 'Comment changer de forfait ou demander un abonnement ?',
    answer:
      'Depuis Facturation, comparez les quotas, choisissez la période de base ou l’annuel (−10 %), puis soumettez une demande. EventMaster valide et émet une facture. Le type de compte (organisateur, prestataire, mixte, client) détermine les forfaits visibles.',
  },
  {
    id: 'invoices',
    question: 'Où consulter et télécharger mes factures ?',
    answer:
      'Les propriétaires et managers autorisés accèdent à la liste des factures depuis le tableau de bord. Vous pouvez consulter le détail, télécharger le PDF et partager la facture par e-mail.',
  },
  {
    id: 'support',
    question: 'Comment contacter le support ?',
    answer:
      `Utilisez le formulaire de contact, écrivez à ${SITE_CONTACT.email} ou appelez le ${SITE_CONTACT.phone} (${SITE_CONTACT.whatsappNote}). Notre équipe répond aux questions commerciales, techniques et de facturation.`,
  },
];
