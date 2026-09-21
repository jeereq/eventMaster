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
  'Organisation complète en ligne',
  'Invitations WhatsApp & Répondez s’il vous plaît en direct',
  'Billetterie Mobile Money & pass QR',
  'Plans de salle 2D cotés & visite 3D',
  'Simulateur de budget CDF & USD',
  'Marketplace : salles, métiers, matériel et boissons',
  '100% web, sans application à installer',
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
  { label: 'Compte client (devis, favoris & packs)', href: '/register?kind=CLIENT&intent=seeker' },
] as const;

export const FOOTER_BRAND_DESCRIPTION =
  'Plateforme événementielle en RDC : invitations WhatsApp, plans 2D/3D, billetterie Mobile Money et marketplace (salles, métiers, matériel, boissons).';

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
      'Une plateforme tout-en-un pour préparer un événement en toute sérénité : invitations interactives avec IA, billetterie en ligne avec validation automatique de présence, personnalisation des pass pour billets partagés, plans de salle 2D et 3D photoréalistes, accueil QR le jour J, simulateur de budget IA et marketplace (salles, métiers, Matériel & Équipements, boissons) en RDC. Trois types de compte : organisateur, client, ou pro (salle / métier). Dès Business, la vitrine catalogue est incluse pour un organisateur. Tout fonctionne dans le navigateur.',
  },
  {
    id: 'mobile-app',
    question: 'Existe-t-il une application mobile ?',
    answer:
      'Pas encore. En attendant, Répondez s’il vous plaît, scan QR, tableau de bord et marketplace fonctionnent dans le navigateur — y compris sur téléphone.',
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
      'Oui. Choisissez Public à la création : l’événement apparaît sur le marketplace. Vous pouvez configurer des tarifs par zone (VIP, Standard, Fosse...) avec choix de place sur le plan. Lors de l’achat d’un billet (via M-Pesa, Orange Money, Airtel, Afrimoney ou Carte), la présence de l’invité est automatiquement validée (Répondez s’il vous plaît confirmé) et son pass QR sécurisé est généré immédiatement. L’activation de la billetterie exige d’accepter les conditions en vigueur. En plus de l’abonnement, EventMaster se réserve le droit de prélever {collectionCommission} du montant global collecté avant reversement.',
  },
  {
    id: 'event-donations',
    question: 'Puis-je collecter des dons solidaires sur un événement ?',
    answer:
      'Oui, si l’option est autorisée pour votre organisation. Activez la collecte à montant libre sur l’événement : les donateurs paient en Francs Congolais via Mobile Money ou carte. Un don peut, selon vos réglages, donner un pass d’accès. L’activation exige d’accepter les conditions en vigueur. En plus de l’abonnement, EventMaster se réserve le droit de prélever {collectionCommission} du montant collecté avant reversement. Les dons confirmés sont irrévocables.',
  },
  {
    id: 'collection-payouts',
    question: 'Comment sont reversées les recettes de billets et de dons ?',
    answer:
      'EventMaster encaisse pour votre compte via FlexPay, puis reverse les recettes nettes (virement ou Mobile Money). En plus de l’abonnement déjà payé, une commission de {collectionCommission} du montant global collecté (billets et/ou dons) peut être déduite, ainsi que les frais FlexPay. Cette commission n’est pas remboursable. Vous devez valider les conditions de la plateforme au moment d’activer la billetterie ou les dons.',
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
      'Le Studio IA permet de choisir votre source de contexte (profil de votre organisation ou historique de recherche). Les textes sont enrichis en Français et dans les 4 langues nationales congolaises (Lingala, Swahili, Kikongo, Tshiluba). Pour les visages : les photos sources fournissent l’identité (qui sont les personnes) ; les expressions (sourire, regard, émotion) restent celles déjà présentes sur le carton. Pas d’embellissement artificiel trompeur. Vous devez disposer du consentement des personnes photographiées.',
  },
  {
    id: 'marketplace-venues',
    question: 'Puis-je trouver une salle ou un prestataire sur EventMaster ?',
    answer:
      'Oui. Parcourez salles, métiers (traiteur, photo…), Matériel & Équipements (chaises, habits, véhicules, sono…) et le catalogue Boissons sans compte. Une location précise le retrait sur place, la livraison déjà comprise dans le tarif, ou la livraison en supplément. Pour un devis ou une réservation, créez un compte client gratuit. L’acompte ({depositPercent} %) se verse directement au professionnel, pas via EventMaster.',
  },
  {
    id: 'marketplace-booking',
    question: 'Comment fonctionne la réservation et la commission marketplace ?',
    answer:
      'Le professionnel accepte, vous versez l’acompte hors plateforme, il confirme : la date est bloquée. EventMaster n’encaisse pas l’acompte. Une commission de {commissionPercent} % (due par le vendeur) s’applique aux réservations confirmées. Si la location prévoit une livraison en supplément, ce montant est ajouté une seule fois au total, pas multiplié par les jours. Un prix promotionnel encore en cours remplace le tarif normal dans ce total.',
  },
  {
    id: 'marketplace-drinks',
    question: 'Où voir les boissons et leurs prix ?',
    answer:
      'La page Marketplace → Boissons liste les bières, boissons, vins et champagnes du catalogue. Quand un prestataire a publié un tarif, vous voyez le prix le plus bas, promotion comprise tant qu’elle est en cours. Le prestataire choisit la quantité vendue : bouteille, casier, pack ou un autre conditionnement. Dans une invitation, l’organisateur peut proposer ces boissons dans le champ Boissons : l’invité choisit un nom, sans voir le prix.',
  },
  {
    id: 'rental-delivery',
    question: 'Comment fonctionne la livraison d’une location ?',
    answer:
      'Chaque fiche de matériel indique un retrait sur place, une livraison dont le prix est déjà compris dans le tarif, ou une livraison facturée en supplément. Le supplément s’ajoute une fois à la réservation. Les filtres du catalogue matériel permettent de ne garder que l’un de ces trois cas. Le rayon de livraison reste obligatoire dès que le prestataire se déplace.',
  },
  {
    id: 'client-account',
    question: 'Je cherche seulement une salle ou un prestataire : dois-je payer un abonnement ?',
    answer:
      'Non. Le compte client est gratuit : explorer, favoris, packs budget, devis. Pour organiser une fête ou publier vos offres, un Super Admin doit changer le type de compte ; ensuite choisissez un forfait.',
  },
  {
    id: 'venue-subscription',
    question: 'Comment publier une salle sur le marketplace ?',
    answer:
      'Inscrivez-vous en compte pro, choisissez « Une salle à réserver », puis souscrivez le forfait Salle (ou Salle & presta). Les organisateurs Business+ peuvent aussi publier des salles via le catalogue inclus dans leur forfait organisation — sans forfait marketplace séparé.',
  },
  {
    id: 'service-subscription',
    question: 'Comment publier une prestation ou du Matériel & Équipements ?',
    answer:
      'Compte pro → « Un métier de service » : traiteur, photo, DJ… ou locations (chaises, habits, voiture, sono, tente…). Pour une location livrée, indiquez si le prix de livraison est déjà dans le tarif ou ajouté une fois en supplément. Le forfait Prestataire couvre aussi l’onglet Boissons : vous y fixez bouteille, casier, pack ou un autre conditionnement, et une promotion inférieure au tarif normal. Salle & presta ajoute les salles. Un organisateur Business+ publie aussi ces fiches via le catalogue inclus.',
  },
  {
    id: 'event-packs',
    question: 'Comment fonctionne la simulation d’événement et de packs budget par IA ?',
    answer:
      'Rendez-vous sur la page dédiée /simulateur : sélectionnez un scénario type prêt à l’emploi (Mariage Élégance, Anniversaire, Gala d’Entreprise) ou personnalisez votre ville, nombre d’invités et budget en Francs Congolais ou Dollars au taux officiel du jour. La simulation complète se règle selon le besoin (salle, métiers, locations, boissons). Vous pouvez aussi ne simuler que les boissons, les locations, ou les services. Vous disposez de 4 simulations gratuites sans compte préalable. L’IA EventMaster compose 3 formules (Éco, Équilibré, Confort). Les boissons, elles, suivent les invités et le catalogue, sans filtre de ville. Les recharges s’effectuent en Francs Congolais par Mobile Money ou Carte.',
  },
  {
    id: 'free-trial',
    question: 'Puis-je essayer gratuitement ?',
    answer:
      'Oui. Le forfait gratuit (Essentiel) permet de créer une organisation, jusqu’à 3 événements et 50 invités au total — sans carte bancaire. Ensuite, choisissez selon votre usage : Particulier, organisation Business+ (catalogue salle + prestations inclus dès Business), ou compte pro salle / métier (prestations et Matériel & Équipements).',
  },
  {
    id: 'plans-quotas',
    question: 'Comment fonctionnent les forfaits et les quotas ?',
    answer:
      'Chaque organisation souscrit un seul forfait. Le quota d’invités (Particulier ou B2B) se compte par période payée (mois B2B, trimestre Particulier), pas sur tout l’historique — il se renouvelle à chaque période. Particulier : paliers 50 / 100 / 200 / +200 avec éditeur complet. Organisations B2B : Essentiel, Business, Premium, Premium Plus, Enterprise — dès Business, salles publiables et prestations marketplace (y compris Matériel & Équipements) sont incluses. Les forfaits Salle, Prestataire et Salle & presta restent pour le compte pro sans événements. −10 % en annuel.',
  },
  {
    id: 'guest-quota-period',
    question: 'Comment sont comptabilisés les invités pour un abonnement mensuel ?',
    answer:
      'Le quota d’invités est comptabilisé uniquement sur la période payée en cours (chaque mois pour les forfaits Business, Premium et Enterprise ; chaque trimestre de 90 jours pour les forfaits Particulier) et non sur l’ensemble de l’historique de votre compte. À chaque renouvellement de période, votre compteur d’invitations repart pour accueillir vos prochains événements. Les invités et réponses Répondez s’il vous plaît de vos événements passés restent précieusement archivés et consultables dans votre espace.',
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
      'Depuis Facturation, comparez les quotas, choisissez la période de base ou l’annuel (−10 %), puis soumettez une demande. EventMaster valide et émet une facture. Le type de compte (organisateur, prestataire / salle, client) détermine les forfaits visibles. Les forfaits Business incluent déjà la vitrine salle et prestations.',
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
