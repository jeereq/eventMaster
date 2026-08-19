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
  'Invitations RSVP (lien d’abord, PDF ensuite)',
  'Plans de salle 2D & protocole QR web',
  'Marketplace : salles, métiers, locations',
  'Favoris, packs budget, partage & réservations',
  'Événements publics & billets en ligne',
  'Application mobile (en construction)',
] as const;

export const FOOTER_PRODUCT = [
  { label: 'Modèles', href: '/#modeles' },
  { label: 'Marketplace', href: '/marketplace' },
  { label: 'Parcours', href: '/#parcours' },
  { label: 'Tarifs', href: '/#tarifs' },
  { label: 'FAQ', href: '/faq' },
] as const;

export const FOOTER_RESOURCES = [
  { label: 'Contact & Support', href: '/contact' },
  { label: `Conditions d'utilisation (v${TERMS_VERSION})`, href: '/terms' },
  { label: `Politique de confidentialité (v${PRIVACY_VERSION})`, href: '/privacy' },
  { label: 'Connexion', href: '/login' },
  { label: 'Compte client (devis, favoris & packs)', href: '/register' },
] as const;

export const FOOTER_BRAND_DESCRIPTION =
  'EventMaster centralise invitations RSVP, plans de salle 2D, marketplace (salles, métiers, locations) et protocole QR dans le navigateur. L’application mobile est en construction et n’est pas encore déployée.';

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
      'EventMaster est un SaaS web d’événements : invitations et RSVP, plans de salle 2D, protocole QR dans le navigateur, marketplace (salles, métiers et locations — habits, voitures, motos, matériel), favoris, packs budget, partage de recherche ou de fiche, réservations et billets en ligne. Un compte client cherche salle et prestataires sans créer d’événements. Chaque organisation a son espace isolé. L’app iOS/Android est en construction, pas encore sur les stores.',
  },
  {
    id: 'mobile-app',
    question: 'Existe-t-il une application mobile ?',
    answer:
      'Pas encore. L’app native iOS et Android est en construction : elle n’est pas sur l’App Store ni Google Play. En attendant, RSVP, protocole QR, tableau de bord, marketplace et réservations fonctionnent dans le navigateur — y compris sur téléphone. L’édition avancée (modèles, plan de table) reste sur le web.',
  },
  {
    id: 'placement-delivery',
    question: 'Quand l\'invité reçoit-il son plan de table, PDF et localisation GPS ?',
    answer:
      'L’invitation initiale (e-mail ou WhatsApp) contient uniquement le lien RSVP. Le PDF personnalisé, le plan de table interactif et le pin GPS WhatsApp partent automatiquement dès que l’invité accepte ET qu’une place est assignée — jamais à l’envoi de l’invitation. Cette livraison automatique est disponible à partir de Premium 1.',
  },
  {
    id: 'public-events',
    question: 'Puis-je organiser un événement public avec billets payants ?',
    answer:
      'Oui. Dans Événements, choisissez Public : la fiche apparaît sur le marketplace (grille, liste, carte), avec galerie et GPS. Inscription gratuite, ou billets payants en ligne (carte via Stripe). Les acheteurs deviennent des invités avec badge QR. Un événement Privé reste sur liste d’invités uniquement.',
  },
  {
    id: 'marketplace-venues',
    question: 'Puis-je trouver une salle ou un prestataire sur EventMaster ?',
    answer:
      'Oui. Le marketplace liste les salles (plan 2D), les métiers (traiteur, photo, DJ, déco…), les locations (habits homme / femme / enfant, voitures, motos, matériel) et les événements publics. Sans compte, vous parcourez. Le bouton Partager copie l’URL de recherche (filtres inclus) ou le lien public de la fiche — jamais une URL interne du tableau de bord. Pour un devis, un billet ou une réservation : compte client gratuit ou passage invité. L’acompte ({depositPercent} %) se verse au professionnel, hors EventMaster.',
  },
  {
    id: 'marketplace-booking',
    question: 'Comment fonctionne la réservation et la commission marketplace ?',
    answer:
      'Le professionnel accepte la demande, l’organisateur (ou le client) verse l’acompte hors plateforme, puis le professionnel marque l’acompte reçu et confirme : la date est bloquée. EventMaster n’encaisse pas l’acompte. Une commission de {commissionPercent} % (due par le vendeur) s’applique aux réservations confirmées, indépendante de l’abonnement SaaS.',
  },
  {
    id: 'client-account',
    question: 'Je cherche seulement une salle ou un prestataire : dois-je payer un abonnement ?',
    answer:
      'Non. Le compte client n’exige pas de licence SaaS. Après inscription, Marketplace dans le tableau de bord : explorer (salles, métiers, locations), favoris, partager une recherche ou une fiche, préparer un événement selon le budget et sauvegarder un pack. Pour organiser une fête ou publier vos offres, changez le type de compte dans Mon compte, puis choisissez un forfait.',
  },
  {
    id: 'event-packs',
    question: 'Comment fonctionne la préparation d’événement (packs) ?',
    answer:
      'Dans Marketplace → Préparer un événement, indiquez le type (mariage, anniversaire, gala…), le budget en FC, la ville et le nombre d’invités. EventMaster propose trois packs distincts dans l’enveloppe : économique, équilibré et confort. Vous pouvez remplacer une ligne, cocher les métiers, figer une salle puis relancer. Un pack se compose aussi à la main depuis les favoris. Rien n’est réservé tant que vous n’envoyez pas de devis.',
  },
  {
    id: 'free-trial',
    question: 'Puis-je essayer gratuitement ?',
    answer:
      'Oui. Le forfait Essentials (gratuit, sans carte) permet de créer une organisation, jusqu’à 3 événements et 50 invités, avec RSVP et portail invité — ou de tester 1 salle simple et 1 prestation marketplace. Ensuite : Particulier, Business, Premium, Enterprise, Salle, Prestataire ou Salle & presta selon votre type de compte.',
  },
  {
    id: 'plans-quotas',
    question: 'Comment fonctionnent les forfaits et les quotas ?',
    answer:
      'Chaque organisation souscrit un seul forfait. Les particuliers choisissent un palier d’invités (50, 100, 200 ou +200) : période de base = trimestre (90 jours). Les organisateurs B2B ont Essentials (gratuit), Business, Premium et Enterprise (mois). Les gestionnaires de salles et prestataires ont Salle, Prestataire (fiches illimitées dès l’abonnement payé) ou Salle & presta. Le tableau de bord affiche vos quotas. Le paiement annuel facture 12 mois (ou 4 trimestres pour Particulier) d’un coup, avec −10 % sur ce total.',
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
      'Chaque invité qui accepte reçoit un badge QR unique sur son portail RSVP. Le personnel protocole scanne le code à l’entrée dans le navigateur (caméra du téléphone ou de la tablette — pas d’app native). EventMaster enregistre la présence et peut valider le siège. PDF, plan et GPS partent déjà à l’acceptation RSVP si une place est assignée (Premium 1+). Le scan est disponible à partir du forfait Business. L’app native avec caméra n’est pas encore déployée.',
  },
  {
    id: 'roles',
    question: 'Puis-je ajouter des managers ou du personnel protocole ?',
    answer:
      'Oui. Le propriétaire peut inviter des managers, du personnel protocole, des responsables de salle ou d’événement, et — selon le forfait — des commerciaux organisation. Chaque rôle n’accède qu’aux ressources autorisées. Un manager salle employé d’une organisation n’est pas le forfait Salle du marketplace.',
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
