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
  'Invitations & RSVP multi-canal',
  'Plans de salle 2D & protocole QR web',
  'Marketplace : favoris, packs budget, réservations',
  'Application mobile (en construction)',
  'Espace isolé par organisation',
] as const;

export const FOOTER_PRODUCT = [
  { label: 'Modèles', href: '/#modeles' },
  { label: 'Marketplace salles & prestas', href: '/marketplace' },
  { label: 'Parcours', href: '/#parcours' },
  { label: 'Tarifs', href: '/#tarifs' },
  { label: 'FAQ', href: '/faq' },
] as const;

export const FOOTER_RESOURCES = [
  { label: 'Contact & Support', href: '/contact' },
  { label: `Conditions d'utilisation (v${TERMS_VERSION})`, href: '/terms' },
  { label: `Politique de confidentialité (v${PRIVACY_VERSION})`, href: '/privacy' },
  { label: 'Connexion', href: '/login' },
  { label: 'Compte client (favoris & packs)', href: '/register' },
] as const;

export const FOOTER_BRAND_DESCRIPTION =
  'Créez votre organisation sur EventMaster pour gérer invitations, RSVP, plans de salle, marketplace et protocole QR sur le web. L’application mobile est en construction et n’est pas encore déployée.';

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
      'EventMaster est une plateforme SaaS web qui centralise la gestion d\'événements : invitations et RSVP, plans de salle 2D, protocole QR, marketplace (favoris, simulation de budget, packs et réservations), fil d\'actualité et gestion d\'équipe. Un compte client permet de chercher salle et prestataires sans créer d’événements. Chaque organisation dispose de son propre espace isolé. L\'application mobile native est en construction et n\'est pas encore déployée.',
  },
  {
    id: 'mobile-app',
    question: 'Existe-t-il une application mobile ?',
    answer:
      'Pas encore. L\'application native iOS et Android est en construction : elle n\'est pas déployée sur les stores pour l\'instant. En attendant, le RSVP, le protocole QR, le tableau de bord, le marketplace et les réservations fonctionnent dans le navigateur — y compris depuis un téléphone. L\'édition avancée (modèles, plan de table) restera sur le web.',
  },
  {
    id: 'placement-delivery',
    question: 'Quand l\'invité reçoit-il son plan de table, PDF et localisation GPS ?',
    answer:
      'L\'invitation initiale contient uniquement le lien RSVP (e-mail ou WhatsApp). Le PDF personnalisé, le plan de table interactif et la localisation GPS WhatsApp sont envoyés automatiquement dès l\'acceptation RSVP, dès qu\'une place est assignée (forfait Premium 1+) — jamais à l\'envoi de l\'invitation.',
  },
  {
    id: 'marketplace-venues',
    question: 'Puis-je trouver une salle ou un prestataire sur EventMaster ?',
    answer:
      'Oui. Le marketplace liste les salles et prestations (traiteur, photo, DJ, déco…) publiées, avec photos, vidéos, carte et calendrier. Sans compte, vous parcourez le catalogue public. Avec un compte client, vous mettez des fiches en favoris, préparez un événement selon votre budget (trois packs) et suivez vos réservations dans le tableau de bord. Vous pouvez aussi demander un devis ou une date : l’acompte (30 %) se verse au professionnel, hors EventMaster.',
  },
  {
    id: 'marketplace-booking',
    question: 'Comment fonctionne la réservation et la commission marketplace ?',
    answer:
      'Le professionnel accepte la demande, l’organisateur (ou le client) verse l’acompte hors plateforme, puis le professionnel marque l’acompte reçu et confirme : la date est alors bloquée. EventMaster n’encaisse pas l’acompte. Une commission de 8 % (due par le vendeur) s’applique aux réservations confirmées, indépendante de l’abonnement SaaS.',
  },
  {
    id: 'client-account',
    question: 'Je cherche seulement une salle ou un prestataire : dois-je payer un abonnement ?',
    answer:
      'Non. Le compte client n’exige pas de licence SaaS. Après inscription, ouvrez Marketplace dans le tableau de bord : explorer le catalogue, enregistrer des favoris (grille ou liste), préparer un événement selon votre budget et sauvegarder un pack. Pour organiser une fête ou publier vos offres, changez le type de compte dans Mon compte, puis choisissez un forfait.',
  },
  {
    id: 'event-packs',
    question: 'Comment fonctionne la préparation d’événement (packs) ?',
    answer:
      'Dans Marketplace → Préparer un événement, indiquez le type (mariage, anniversaire, gala…), le budget, la ville et le nombre d’invités. EventMaster propose trois packs distincts dans l’enveloppe : économique, équilibré et confort. Vous pouvez remplacer une ligne, cocher les métiers voulus, puis sauvegarder le pack. Un pack parfait se compose aussi à la main depuis vos favoris.',
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
      'Chaque organisation souscrit un seul forfait. Les particuliers choisissent un palier d’invités (50, 100, 200 ou plus de 200) et paient par trimestre (90 jours). Les organisateurs B2B ont Essentials (gratuit), Business, Premium et Enterprise. Les gestionnaires de salles et prestataires ont Salle, Prestataire (prestations illimitées dès l’abonnement payé) ou Salle & presta. Le tableau de bord affiche vos quotas. La facturation annuelle (hors Particulier) bénéficie d’une réduction de 10 %.',
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
      'Chaque invité qui accepte reçoit un badge QR unique sur son portail RSVP. Le personnel protocole scanne le code à l\'entrée dans le navigateur web. EventMaster enregistre la présence et peut valider le siège. Le PDF, le plan de table et la localisation GPS partent déjà à l\'acceptation RSVP (Premium 1+). Disponible à partir du forfait Business ; notifications placement à partir de Premium 1. L\'app native avec caméra n\'est pas encore déployée.',
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
