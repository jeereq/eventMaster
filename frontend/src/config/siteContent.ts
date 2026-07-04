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
  'Salles 2D & éditeur de layout',
  'Protocole QR & scan caméra',
  'Rôles manager / protocole / commercial',
  'Portail RSVP & notifications placement',
  'Modèles d\'invitation & rappels automatiques',
  'Facturation, quotas & historique abonnements',
] as const;

export const FOOTER_RESOURCES = [
  { label: 'FAQ', href: '/faq' },
  { label: 'Tarifs', href: '/#tarifs' },
  { label: 'Contact & Support', href: '/contact' },
  { label: `Conditions d'utilisation (v${TERMS_VERSION})`, href: '/terms' },
  { label: `Politique de confidentialité (v${PRIVACY_VERSION})`, href: '/privacy' },
  { label: 'Connexion Espace Organisateur', href: '/login' },
  { label: 'Créer une organisation', href: '/register' },
] as const;

export const FOOTER_BRAND_DESCRIPTION =
  'Plateforme SaaS multi-tenant pour événements privés et professionnels : salles 2D, protocole QR, RSVP, rôles granulaires, réseau commercial et forfaits par organisation (Essentials à Enterprise).';

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
      'EventMaster est une plateforme SaaS qui centralise la gestion d\'événements : invitations et RSVP, plans de salle 2D, protocole avec scan QR, fil d\'actualité, livre d\'or, modèles de messages et gestion d\'équipe. Chaque organisation dispose de son propre espace isolé.',
  },
  {
    id: 'free-trial',
    question: 'Puis-je essayer gratuitement ?',
    answer:
      'Oui. Le forfait Essentials (gratuit) permet de créer une organisation, de gérer jusqu\'à 3 événements et 50 invités, avec RSVP et portail invité — sans carte bancaire. Vous pouvez ensuite passer à Business, Premium ou Enterprise selon vos besoins.',
  },
  {
    id: 'plans-quotas',
    question: 'Comment fonctionnent les forfaits et les quotas ?',
    answer:
      'Les forfaits Essentials, Business, Business Premium 1 & 2 et Business Enterprise 1 à 3 définissent des limites d\'événements, d\'invités (jusqu\'à illimité en Enterprise 3), de modèles, de salles et de managers. Le tableau de bord affiche en permanence vos quotas restants. La facturation annuelle bénéficie d\'une réduction de 10 %.',
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
      'Isolation multi-tenant stricte, chiffrement HTTPS, mots de passe hashés, authentification OTP (e-mail ou WhatsApp), rôles et permissions granulaires, journalisation des acceptations légales et accès administration limité au personnel autorisé. Les organisations doivent aussi protéger leurs identifiants et sensibiliser leurs équipes.',
  },
  {
    id: 'protocol-qr',
    question: 'Comment fonctionne le protocole QR ?',
    answer:
      'Chaque invité reçoit un badge QR unique. Le personnel protocole scanne le code à l\'entrée via la caméra du navigateur ou de l\'application. EventMaster vérifie la confirmation de présence, le placement et peut envoyer une notification de table à l\'invité. Disponible à partir du forfait Business.',
  },
  {
    id: 'roles',
    question: 'Puis-je ajouter des managers ou du personnel protocole ?',
    answer:
      'Oui. Le propriétaire de l\'organisation peut inviter des managers, du personnel protocole, des responsables de salle ou d\'événement, et — selon le forfait — des commerciaux organisation. Chaque rôle n\'accède qu\'aux ressources autorisées.',
  },
  {
    id: 'upgrade',
    question: 'Comment changer de forfait ou demander un abonnement ?',
    answer:
      'Depuis votre tableau de bord, section Facturation, vous pouvez consulter votre forfait actuel, vos quotas restants et soumettre une demande d\'activation ou de changement. EventMaster valide la demande et émet une facture le cas échéant.',
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
