import { TERMS_VERSION, PRIVACY_VERSION, REFUND_VERSION } from '@/config/legalConfig';

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
  'Préparez votre événement de A à Z en un clic',
  'Invitations WhatsApp IA, réponses & personnalisation invité',
  'Billetterie en ligne, présence auto-validée & pass QR',
  'Plans de table 2D & 3D photoréalistes avec caméras cinéma',
  'Simulateur budget IA dédié en Francs Congolais & USD',
  'Marketplace : salles, prestataires certifiés, matériel & devis',
  '100% dans le navigateur mobile et ordinateur',
] as const;

export const FOOTER_PRODUCT = [
  { label: 'Plans & Modèles 2D/3D', href: '/plans-3d' },
  { label: 'Simulateur budget IA', href: '/simulateur' },
  { label: 'Marketplace', href: '/marketplace' },
  { label: 'Réalisations', href: '/activite' },
  { label: 'Modèles', href: '/modeles' },
  { label: 'Tarifs', href: '/tarifs' },
  { label: 'FAQ', href: '/faq' },
] as const;

export const FOOTER_RESOURCES = [
  { label: 'Aide invité', href: '/guide/invite' },
  { label: 'Contact & Support', href: '/contact' },
  { label: `Conditions d'utilisation (v${TERMS_VERSION})`, href: '/terms' },
  { label: `Politique de confidentialité (v${PRIVACY_VERSION})`, href: '/privacy' },
  { label: `Politique de remboursement (v${REFUND_VERSION})`, href: '/refund' },
  { label: 'Connexion', href: '/login' },
  { label: 'Compte client (devis, favoris & packs)', href: '/register' },
] as const;

export const FOOTER_BRAND_DESCRIPTION =
  'Plateforme tout-en-un pour vos événements en RDC : invitations WhatsApp IA, billetterie multi-zones avec présence auto-validée, plans de table 2D/3D immersifs, simulateur de budget et marketplace de salles & prestataires certifiés.';

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
      'Une plateforme tout-en-un pour préparer un événement en toute sérénité : invitations interactives avec IA, billetterie en ligne avec validation automatique de présence, personnalisation des pass pour billets partagés, plans de salle 2D et 3D photoréalistes, accueil QR le jour J, simulateur de budget IA et marketplace de lieux et talents en RDC. Tout fonctionne directement dans le navigateur, sur smartphone comme sur ordinateur.',
  },
  {
    id: 'mobile-app',
    question: 'Existe-t-il une application mobile ?',
    answer:
      'Pas encore. En attendant, RSVP, scan QR, tableau de bord et marketplace fonctionnent dans le navigateur — y compris sur téléphone.',
  },
  {
    id: 'placement-delivery',
    question: 'Quand l’invité reçoit-il son plan de table, son PDF et l’itinéraire ?',
    answer:
      'Le premier message contient le lien pour répondre. Dès le « oui », le badge QR et l’itinéraire sont dans l’espace invité. Le plan de table et le PDF partent dès qu’une place lui est attribuée — pas avant.',
  },
  {
    id: 'public-events',
    question: 'Puis-je organiser un événement public avec billets payants ?',
    answer:
      'Oui. Choisissez Public à la création : l’événement apparaît sur le marketplace. Vous pouvez configurer des tarifs par zone (VIP, Standard, Fosse...) avec choix de place sur le plan. Lors de l’achat d’un billet (via M-Pesa, Orange Money, Airtel, Afrimoney ou Carte), la présence de l’invité est automatiquement validée (RSVP confirmé) et son pass QR sécurisé est généré immédiatement.',
  },
  {
    id: 'shared-tickets-personalization',
    question: 'Comment les invités peuvent-ils modifier leurs coordonnées sur un billet ou une invitation partagée ?',
    answer:
      'Lorsqu’un proche ou une entreprise achète plusieurs billets ou partage un lien d’invitation, chaque destinataire peut ouvrir son lien personnel pour modifier son prénom, son nom et son numéro WhatsApp, et préciser ses préférences alimentaires (allergies, régime particulier). Le pass QR individuel et les données d’émargement de l’organisateur sont immédiatement mis à jour.',
  },
  {
    id: 'ai-invitations-context',
    question: 'Comment fonctionnent le Studio d’invitation IA et le respect des visages ?',
    answer:
      'Le Studio IA permet de choisir votre source de contexte (profil de votre organisation ou historique de recherche). Les textes sont enrichis en Français et dans les 4 langues nationales congolaises (Lingala, Swahili, Kikongo, Tshiluba). Pour les visages, notre technologie suit les préconisations éthiques de Google Gemini : elle restitue honnêtement les traits réels des photos de référence, sans embellissement artificiel ni déformation trompeuse.',
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
      'Non. Le compte client est gratuit : explorer, favoris, packs budget, devis. Pour organiser une fête ou publier vos offres, un Super Admin doit changer le type de compte ; ensuite choisissez un forfait.',
  },
  {
    id: 'event-packs',
    question: 'Comment fonctionne la simulation d’événement et de packs budget par IA ?',
    answer:
      'Rendez-vous sur la page dédiée /simulateur : sélectionnez un scénario type prêt à l’emploi (Mariage Élégance, Anniversaire, Gala d’Entreprise) ou personnalisez votre ville, nombre d’invités et budget en Francs Congolais ou Dollars au taux officiel du jour. Vous disposez de 4 simulations complètes gratuites sans compte préalable. L’IA EventMaster analyse les prestataires et salles certifiés en RDC et compose instantanément 3 formules réelles (Éco, Équilibré, Confort). Les recharges s’effectuent en Francs Congolais par Mobile Money ou Carte.',
  },
  {
    id: 'free-trial',
    question: 'Puis-je essayer gratuitement ?',
    answer:
      'Oui. Le forfait gratuit (Essentiel) permet de créer une organisation, jusqu’à 3 événements et 50 invités au total — sans carte bancaire. Ensuite, vous passez au forfait qui correspond : particulier, organisation, salle ou prestataire.',
  },
  {
    id: 'plans-quotas',
    question: 'Comment fonctionnent les forfaits et les quotas ?',
    answer:
      'Chaque organisation souscrit un seul forfait. Pour tous les forfaits incluant la gestion d’invités (Particulier ou Professionnel), le quota d’invités est comptabilisé par période de facturation payée (chaque mois pour les formules B2B, chaque trimestre de 90 jours pour Particulier) et non sur la totalité de l’histoire du compte. À chaque renouvellement, votre quota d’invitations se renouvelle intégralement pour vos nouveaux événements sans blocage lié aux invités passés. Les particuliers choisissent un palier d’invités (50, 100, 200 ou +200) avec éditeur de salle complet. Les organisateurs B2B ont Essentiel (gratuit), Business (150 invités/mois), Premium (500 invités/mois), Premium Plus (1 000 invités/mois) et Enterprise. Les forfaits Salle et Prestataire sont quant à eux dédiés au marketplace (sans événements ni quota d’invités). Le paiement annuel applique −10 % de réduction.',
  },
  {
    id: 'guest-quota-period',
    question: 'Comment sont comptabilisés les invités pour un abonnement mensuel ?',
    answer:
      'Le quota d’invités est comptabilisé uniquement sur la période payée en cours (chaque mois pour les forfaits Business, Premium et Enterprise ; chaque trimestre de 90 jours pour les forfaits Particulier) et non sur l’ensemble de l’historique de votre compte. À chaque renouvellement de période, votre compteur d’invitations repart pour accueillir vos prochains événements. Les invités et réponses RSVP de vos événements passés restent précieusement archivés et consultables dans votre espace.',
  },
  {
    id: 'room-editor-plans',
    question: 'Quelles fonctions de l’éditeur de salles sont incluses selon mon abonnement ?',
    answer:
      'L’éditeur de salles propose des plans 2D cotés et une visualisation 3D photoréaliste PBR (nappages, miroirs, chandeliers) avec caméras cinéma et zones tarifaires de billetterie. Les fonctions avancées sont délimitées par le niveau d’éditeur du forfait (visible dans Facturation) :\n\n• Essentiel (découverte) — tables simples, déplacement et suppression. Pas de thèmes ni d’éléments décoratifs (fixtures).\n• Business — rangées, duplication, verrouillage, grille ; entrées, allées et couloirs.\n• Premium / Premium Plus — thèmes, sol, scène, buffet, zones (piste, VIP), rotation, rendu showcase ; escaliers entre étages et balcons.\n• Complet (Particulier, Enterprise, forfaits Salle / Salle & presta) — tout le Premium, plus périmètre, tapis, thèmes personnalisés et images custom.\n\nLes modèles multi-étages (Duplex, Villa…) et la vue empilée sont disponibles dès que vous avez accès à l’éditeur ; créer un escalier ou un balcon exige le niveau Premium (ou Complet) avec thèmes/fixtures activés.',
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
