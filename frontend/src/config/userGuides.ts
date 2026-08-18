export type UserGuideId =
  | 'super_admin'
  | 'commercial_platform'
  | 'owner'
  | 'org_manager'
  | 'org_protocol'
  | 'org_commercial'
  | 'staff_scope'
  | 'client'
  | 'guest';

export interface UserGuideNavLink {
  label: string;
  href: string;
}

export interface UserGuideSection {
  id: string;
  title: string;
  content: string;
  links?: UserGuideNavLink[];
}

export interface UserGuide {
  id: UserGuideId;
  title: string;
  badge: string;
  summary: string;
  canDo: string[];
  cannotDo: string[];
  navLinks: UserGuideNavLink[];
  workflows: UserGuideSection[];
  tips: string[];
}

export const USER_GUIDES: UserGuide[] = [
  {
    id: 'super_admin',
    title: 'Guide Super Administrateur',
    badge: 'Plateforme',
    summary:
      'Vous administrez l\'ensemble de la plateforme EventMaster : organisations, utilisateurs, modèles globaux, forfaits, facturation et statistiques.',
    canDo: [
      'Créer et gérer toutes les organisations et leurs licences',
      'Valider ou rejeter les demandes d\'abonnement',
      'Publier des modèles globaux sur la landing page publique',
      'Consulter les statistiques globales (organisations, événements, revenus)',
      'Configurer les forfaits, tarifs et messages invités par défaut',
    ],
    cannotDo: [
      'Accéder aux données privées d\'une organisation comme un membre interne (vous supervisez, vous n\'organisez pas)',
      'Créer des événements au nom d\'une organisation sans passer par leur espace',
    ],
    navLinks: [
      { label: 'Organisations', href: '/dashboard?tab=tenants' },
      { label: 'Utilisateurs', href: '/dashboard?tab=users' },
      { label: 'Modèles globaux', href: '/dashboard?tab=templates' },
      { label: 'Analyses & stats', href: '/dashboard?tab=analytics&section=overview' },
      { label: 'Demandes abonnement', href: '/dashboard?tab=subscription-requests' },
      { label: 'Forfaits', href: '/dashboard?tab=subscription-plans' },
      { label: 'Concepteur visuel', href: '/dashboard/templates' },
    ],
    workflows: [
      {
        id: 'approve-subscription',
        title: 'Valider une demande d\'abonnement',
        content:
          '1. Ouvrez Demandes abonnement.\n2. Consultez la preuve de paiement et le forfait demandé.\n3. Approuvez ou rejetez — une facture est générée automatiquement en cas d\'approbation.\n4. Le commercial parrainé reçoit une notification in-app si applicable.',
        links: [{ label: 'Demandes abonnement', href: '/dashboard?tab=subscription-requests' }],
      },
      {
        id: 'publish-landing-template',
        title: 'Publier un modèle sur la landing page',
        content:
          '1. Créez ou modifiez un modèle Global (Public) dans le Concepteur visuel.\n2. Dans Paramètres globaux, section Vitrine landing : activez « Afficher sur la landing page », choisissez la catégorie et la description.\n3. Sauvegardez — le modèle apparaît sur la page d\'accueil via l\'API publique.',
        links: [
          { label: 'Modèles globaux', href: '/dashboard?tab=templates' },
          { label: 'Concepteur visuel', href: '/dashboard/templates' },
        ],
      },
      {
        id: 'review-analytics',
        title: 'Consulter les statistiques plateforme',
        content:
          '1. Ouvrez Analyses & stats.\n2. Parcourez les sous-onglets : vue d\'ensemble, plans, organisations, revenus, modèles, utilisateurs, événements.\n3. Exportez le rapport revenus en CSV ou PDF si nécessaire.',
        links: [{ label: 'Analyses & stats', href: '/dashboard?tab=analytics&section=overview' }],
      },
    ],
    tips: [
      'Filtrez les modèles globaux par défaut dans l\'onglet Modèles pour voir rapidement ceux visibles sur la landing.',
      'Les modèles d\'organisation ne doivent jamais avoir showOnLanding — seuls les modèles globaux sont publics.',
      'Vérifiez les licences expirées dans Organisations avant d\'approuver un renouvellement.',
    ],
  },
  {
    id: 'commercial_platform',
    title: 'Guide Commercial plateforme',
    badge: 'Plateforme',
    summary:
      'Vous accompagnez les organisations parrainées, suivez les demandes d\'abonnement et consultez vos commissions sur les factures validées.',
    canDo: [
      'Consulter les organisations que vous avez parrainées',
      'Traiter les demandes d\'abonnement (approbation selon vos droits)',
      'Consulter les factures plateforme et vos commissions',
      'Recevoir des notifications in-app lors d\'approbations',
    ],
    cannotDo: [
      'Modifier les forfaits ou la configuration globale de la plateforme',
      'Accéder aux événements ou invités des organisations parrainées',
      'Créer des modèles globaux ou gérer tous les utilisateurs',
    ],
    navLinks: [
      { label: 'Organisations', href: '/dashboard?tab=tenants' },
      { label: 'Demandes abonnement', href: '/dashboard?tab=subscription-requests' },
      { label: 'Factures', href: '/dashboard?tab=invoices' },
      { label: 'Parrainage & commissions', href: '/dashboard/commercial' },
    ],
    workflows: [
      {
        id: 'follow-requests',
        title: 'Suivre une demande d\'abonnement',
        content:
          '1. Ouvrez Demandes abonnement.\n2. Identifiez la demande liée à votre parrainage.\n3. Vérifiez le statut (en attente, approuvé, rejeté).\n4. Une notification vous alerte lorsque le super admin valide une souscription.',
        links: [{ label: 'Demandes abonnement', href: '/dashboard?tab=subscription-requests' }],
      },
      {
        id: 'check-commissions',
        title: 'Consulter vos commissions',
        content:
          '1. Accédez à Parrainage & commissions pour la vue dédiée.\n2. Consultez aussi l\'onglet Factures pour le détail des montants et périodes.\n3. Les commissions sont calculées sur les factures validées selon votre taux contractuel.',
        links: [
          { label: 'Parrainage & commissions', href: '/dashboard/commercial' },
          { label: 'Factures', href: '/dashboard?tab=invoices' },
        ],
      },
    ],
    tips: [
      'La cloche de notification en haut du menu signale les nouvelles approbations.',
      'Communiquez le code de parrainage aux organisations avant leur inscription.',
      'En cas de rejet, contactez le super admin avec la preuve de paiement corrigée.',
    ],
  },
  {
    id: 'owner',
    title: 'Guide Propriétaire d\'organisation',
    badge: 'Organisation',
    summary:
      'En tant que propriétaire (créateur de l\'organisation), vous disposez de tous les droits : équipe, salles, événements, modèles, marketplace, facturation et factures.',
    canDo: [
      'Gérer l\'équipe (managers, protocoles, commerciaux org.)',
      'Créer et configurer les salles 2D',
      'Créer des événements privés (liste d\'invités) ou publics avec inscription / billets en ligne',
      'Accéder à la facturation, au forfait et aux factures',
      'Personnaliser les modèles d\'invitation et messages invités',
      'Publier des salles (plan 2D) et des prestations : métiers ou locations (habits, véhicules, matériel)',
    ],
    cannotDo: [
      'Voir les données d\'autres organisations',
      'Modifier les forfaits plateforme ou valider des abonnements d\'autres tenants',
    ],
    navLinks: [
      { label: 'Tableau de bord', href: '/dashboard' },
      { label: 'Événements', href: '/dashboard/events' },
      { label: 'Statistiques', href: '/dashboard/analytics' },
      { label: 'Modèles', href: '/dashboard/templates' },
      { label: 'Facturation & plan', href: '/dashboard/billing' },
      { label: 'Factures', href: '/dashboard/invoices' },
      { label: 'Salles', href: '/dashboard/rooms' },
      { label: 'Marketplace', href: '/dashboard/marketplace' },
      { label: 'Équipe', href: '/dashboard/team' },
      { label: 'Mon compte', href: '/dashboard/profile' },
    ],
    workflows: [
      {
        id: 'event-lifecycle',
        title: 'Parcours complet d\'un événement',
        content:
          '1. Créez l\'événement (titre, date, lieu, salle).\n2. Ajoutez ou importez vos invités.\n3. Configurez un modèle visuel et une invitation (e-mail / WhatsApp).\n4. Diffusez l\'invitation : les invités reçoivent le lien RSVP.\n5. Les invités confirment ou déclinent via leur lien personnel — dès acceptation, PDF / plan / GPS partent (si place assignée et forfait Premium+).\n6. Organisez le plan de table 2D et assignez les places — les invités déjà confirmés reçoivent alors le placement complet.\n7. Le jour J, utilisez le mode Protocole (scan QR) pour confirmer la présence à l\'entrée.\n8. Consultez les statistiques RSVP et participation.',
        links: [
          { label: 'Événements', href: '/dashboard/events' },
          { label: 'Statistiques', href: '/dashboard/analytics' },
        ],
      },
      {
        id: 'create-event',
        title: 'Créer un événement complet',
        content:
          '1. Allez dans Événements → Créer.\n2. Choisissez Privé (liste d’invités) ou Public (fiche sur le marketplace : grille, liste et carte).\n3. Ajoutez une galerie (photos / vidéos) : elle sert de couverture marketplace et de fiche publique.\n4. Pour un public payant, activez les billets en ligne et le prix en FC.\n5. Renseignez titre, date, lieu et GPS ; associez une salle (importe le plan 2D) et un modèle de formulaire RSVP si besoin.\n6. Sur le fil d’actualité, publiez une annonce sur la fiche publique si l’événement est ouvert.\n7. Suivez le parcours : invités (ou acheteurs de billets) → invitation RSVP → plan de table → protocole.',
        links: [{ label: 'Événements', href: '/dashboard/events' }],
      },
      {
        id: 'manage-team',
        title: 'Inviter un membre d\'équipe',
        content:
          '1. Ouvrez Équipe dans le menu.\n2. Choisissez le rôle : Manager, Protocole ou Commercial org.\n3. Renseignez e-mail et mot de passe temporaire.\n4. Le membre reçoit ses accès selon son rôle.',
        links: [{ label: 'Équipe', href: '/dashboard/team' }],
      },
      {
        id: 'upgrade-plan',
        title: 'Changer de forfait',
        content:
          '1. Ouvrez Facturation & plan.\n2. Comparez les quotas et fonctionnalités.\n3. Soumettez une demande de changement avec preuve de paiement si requis.\n4. Suivez le statut dans Factures après validation.',
        links: [{ label: 'Facturation & plan', href: '/dashboard/billing' }],
      },
      {
        id: 'marketplace-desk',
        title: 'Publier une prestation et traiter les demandes',
        content:
          '1. Ouvrez Marketplace dans le menu.\n2. Onglet Prestations : créez une fiche métier (traiteur, photo, DJ…) ou location (habits homme / femme / enfant, voiture, moto, matériel) avec photos, tarif, ville, rayon ; passez en grille ou liste, puis publiez. Pour une salle : Salles → plan 2D → publier la fiche.\n3. Onglet Demandes : marquez un devis comme contacté, ou convertissez-le en réservation s’il a une date.\n4. Onglet Réservations : acceptez, marquez l’acompte reçu (versé hors plateforme), puis confirmez pour bloquer la date.\n5. Sur une fiche publique, le bouton Partager envoie le lien marketplace (pas l’URL interne du desk).',
        links: [{ label: 'Marketplace', href: '/dashboard/marketplace' }],
      },
    ],
    tips: [
      'Les quotas (événements, invités, modèles) sont visibles sur le tableau de bord.',
      'Les couleurs de l’organisation (Profil) s’appliquent à toute l’équipe ; l’accent personnel du header ne concerne que cet appareil.',
      'Assignez des protocoles org. pour le scan QR sur tous les événements.',
      'Configurez les salles avant de créer des événements avec plan de table.',
      'La commission marketplace (8 %) est due par le vendeur, distincte de l’abonnement SaaS.',
    ],
  },
  {
    id: 'org_manager',
    title: 'Guide Manager organisation',
    badge: 'Organisation',
    summary:
      'Vous pilotez l\'organisation au quotidien : équipe, salles, événements, modèles et marketplace. La facturation reste réservée au propriétaire.',
    canDo: [
      'Gérer l\'équipe et les rôles organisationnels',
      'Créer salles et événements (privés ou publics, billets en ligne)',
      'Gérer invités, invitations et modèles',
      'Consulter les factures (sans modifier le forfait)',
      'Publier des salles et des prestations (métiers ou locations) et traiter devis / réservations',
    ],
    cannotDo: [
      'Accéder à la facturation ni changer de forfait',
      'Supprimer l\'organisation ou transférer la propriété',
      'Voir les autres organisations',
    ],
    navLinks: [
      { label: 'Tableau de bord', href: '/dashboard' },
      { label: 'Événements', href: '/dashboard/events' },
      { label: 'Statistiques', href: '/dashboard/analytics' },
      { label: 'Modèles', href: '/dashboard/templates' },
      { label: 'Factures', href: '/dashboard/invoices' },
      { label: 'Salles', href: '/dashboard/rooms' },
      { label: 'Marketplace', href: '/dashboard/marketplace' },
      { label: 'Équipe', href: '/dashboard/team' },
      { label: 'Mon compte', href: '/dashboard/profile' },
    ],
    workflows: [
      {
        id: 'event-lifecycle',
        title: 'Parcours complet d\'un événement',
        content:
          '1. Créez l\'événement et associez une salle 2D.\n2. Importez ou ajoutez la liste d\'invités.\n3. Choisissez un modèle et rédigez l\'invitation.\n4. Lancez la diffusion du lien RSVP.\n5. Suivez les réponses RSVP — dès acceptation, PDF / plan / GPS partent si la place est assignée (Premium+).\n6. Placez les invités sur le plan de table — les confirmés reçoivent le placement complet.\n7. Jour J : mode Protocole pour l\'accueil (scan QR).\n8. Analysez les statistiques de participation.',
        links: [
          { label: 'Événements', href: '/dashboard/events' },
          { label: 'Statistiques', href: '/dashboard/analytics' },
        ],
      },
      {
        id: 'setup-room',
        title: 'Configurer une salle 2D',
        content:
          '1. Ouvrez Salles dans le menu → Créer.\n2. Choisissez le type (banquet, conférence…).\n3. Placez tables, chaises et éléments décoratifs.\n4. Associez la salle à un événement pour le placement invités.',
        links: [{ label: 'Salles', href: '/dashboard/rooms' }],
      },
      {
        id: 'invite-guests',
        title: 'Inviter et placer des invités',
        content:
          '1. Ouvrez un événement → onglet Invités.\n2. Ajoutez ou importez la liste.\n3. Assignez les tables depuis le plan de salle.\n4. Envoyez l\'invitation — l\'invité reçoit un lien RSVP personnel.',
        links: [{ label: 'Événements', href: '/dashboard/events' }],
      },
      {
        id: 'marketplace-desk',
        title: 'Gérer prestations, devis et réservations',
        content:
          '1. Ouvrez Marketplace.\n2. Publiez ou mettez à jour vos fiches : métiers ou locations (habits, voitures, motos, matériel), vue grille ou liste.\n3. Traitez les demandes de devis (contacter, convertir en réservation).\n4. Dans Réservations, suivez l’étape suivante affichée sur chaque carte : accepter, acompte, confirmer.\n5. Partagez le lien public d’une fiche depuis la fiche marketplace, pas depuis l’URL interne.',
        links: [{ label: 'Marketplace', href: '/dashboard/marketplace' }],
      },
    ],
    tips: [
      'Respectez le quota de managers org. selon votre forfait.',
      'Déléguez le protocole aux membres Protocole pour le jour J.',
      'Utilisez les modèles globaux comme base dans le concepteur visuel.',
      'La commission marketplace (8 %) est due par le vendeur, distincte de l’abonnement SaaS.',
    ],
  },
  {
    id: 'org_protocol',
    title: 'Guide Protocole organisation',
    badge: 'Organisation',
    summary:
      'Vous gérez l\'accueil et le contrôle des invités sur tous les événements de l\'organisation : scan QR et confirmation de présence à l\'entrée.',
    canDo: [
      'Accéder au mode Protocole sur tous les événements',
      'Scanner les QR codes invités avec la caméra',
      'Consulter et mettre à jour le statut RSVP des invités',
      'Confirmer la présence le jour J',
    ],
    cannotDo: [
      'Créer des événements ou des salles',
      'Gérer l\'équipe ou la facturation',
      'Modifier les modèles d\'invitation globaux',
    ],
    navLinks: [
      { label: 'Événements', href: '/dashboard/events' },
      { label: 'Mode Protocole', href: '/dashboard/events?mode=protocol' },
    ],
    workflows: [
      {
        id: 'protocol-scan',
        title: 'Accueillir un invité (scan QR)',
        content:
          '1. Ouvrez Mode Protocole ou sélectionnez un événement.\n2. Activez la caméra pour scanner le QR de l\'invité (ou recherchez par nom).\n3. Vérifiez que le RSVP est « Confirmé » — sinon orientez l\'invité vers son lien.\n4. Confirmez la présence pour valider l\'entrée.',
        links: [{ label: 'Mode Protocole', href: '/dashboard/events?mode=protocol' }],
      },
      {
        id: 'check-guest-list',
        title: 'Vérifier la liste des invités',
        content:
          '1. Depuis Événements, ouvrez l\'événement du jour.\n2. Filtrez par statut RSVP (accepté, en attente, décliné).\n3. Recherchez par nom ou catégorie VIP.',
        links: [{ label: 'Événements', href: '/dashboard/events' }],
      },
    ],
    tips: [
      'Testez le scan en conditions réelles avant l\'événement.',
      'Assurez une connexion stable pour la synchronisation en direct.',
      'Les invités sans QR peuvent être recherchés manuellement dans la liste.',
    ],
  },
  {
    id: 'org_commercial',
    title: 'Guide Commercial organisation',
    badge: 'Organisation',
    summary:
      'Vous développez le réseau commercial de votre organisation en parrainant de nouvelles organisations et en suivant vos commissions internes.',
    canDo: [
      'Consulter votre code de parrainage et statistiques',
      'Suivre les organisations parrainées via votre espace dédié',
      'Recevoir des commissions sur les souscriptions validées',
    ],
    cannotDo: [
      'Créer des événements ou gérer des invités',
      'Modifier l\'équipe ou les salles',
      'Accéder à la facturation de l\'organisation',
    ],
    navLinks: [{ label: 'Réseau commercial', href: '/dashboard/org-commercial' }],
    workflows: [
      {
        id: 'share-referral',
        title: 'Parrainer une nouvelle organisation',
        content:
          '1. Ouvrez Réseau commercial.\n2. Copiez votre code ou lien de parrainage.\n3. Transmettez-le lors de l\'inscription de la nouvelle organisation.\n4. Suivez l\'avancement des demandes d\'abonnement parrainées.',
        links: [{ label: 'Réseau commercial', href: '/dashboard/org-commercial' }],
      },
    ],
    tips: [
      'Le code doit être saisi à l\'inscription pour lier le parrainage.',
      'Les commissions dépendent du taux configuré par le propriétaire.',
      'Contactez le manager org. en cas de litige sur une commission.',
    ],
  },
  {
    id: 'staff_scope',
    title: 'Guide Manager / Protocole salle ou événement',
    badge: 'Périmètre restreint',
    summary:
      'Vous êtes assigné à une ou plusieurs salles ou événements précis. Vos droits dépendent de votre affectation : Manager (gestion) ou Protocole (accueil).',
    canDo: [
      'Manager événement : gérer invités et contenu sur vos événements/salles assignés',
      'Protocole événement : scan QR et suivi invités sur vos événements assignés',
      'Consulter le plan de salle des événements de votre périmètre',
    ],
    cannotDo: [
      'Créer de nouveaux événements ou salles (sauf si promoteur manager org.)',
      'Gérer l\'équipe ou accéder à la facturation',
      'Voir les événements hors de votre affectation',
    ],
    navLinks: [
      { label: 'Événements', href: '/dashboard/events' },
      { label: 'Protocole', href: '/dashboard/events?mode=protocol' },
    ],
    workflows: [
      {
        id: 'find-assignment',
        title: 'Identifier votre périmètre',
        content:
          '1. Ouvrez Événements — seuls ceux qui vous sont assignés apparaissent.\n2. Si vous êtes protocole, utilisez le lien Protocole pour le scan.\n3. Contactez votre manager org. pour élargir vos affectations.',
        links: [{ label: 'Événements', href: '/dashboard/events' }],
      },
      {
        id: 'staff-day-of',
        title: 'Jour J — protocole sur un événement assigné',
        content:
          '1. Sélectionnez l\'événement dans votre liste.\n2. Passez en mode Protocole.\n3. Scannez les QR ou recherchez les invités.\n4. Signalez les no-shows au manager de l\'événement.',
        links: [{ label: 'Mode Protocole', href: '/dashboard/events?mode=protocol' }],
      },
    ],
    tips: [
      'Votre rôle exact (manager vs protocole) est défini par l\'affectation salle/événement.',
      'Sans événement visible, demandez une assignation à votre responsable.',
      'Le tableau de bord global peut être limité — concentrez-vous sur Événements.',
    ],
  },
  {
    id: 'client',
    title: 'Guide Client marketplace',
    badge: 'Client',
    summary:
      'Vous cherchez une salle, un prestataire (métier ou location) ou un événement public, sans créer d’événements. Marketplace (Explorer, Favoris, Préparer, Mes packs), Agenda, billets et réservations sont dans le tableau de bord. Pour organiser une fête ou publier vos offres, changez le type de compte dans Mon compte.',
    canDo: [
      'Explorer salles, prestataires (métiers et locations : habits, voitures, motos, matériel) et événements (filtres ville, type, prix, carte Focus, grille ou liste)',
      'Ouvrir l’Agenda : événements publics du marketplace, pour s’inscrire ou acheter un billet',
      'Mettre des fiches salles / prestataires en favoris',
      'Préparer un événement avec un brief budget simple (enveloppe, marge en FC, métiers) et obtenir 3 packs',
      'Sauvegarder un brief ou un pack, ou composer un pack depuis les favoris',
      'Partager une recherche (URL avec filtres) ou le lien public d’une fiche',
      'Demander un devis ou une date, puis suivre les réservations',
      'Retrouver vos billets, les filtrer, passer en grille ou liste, et ouvrir le badge QR',
      'Passer organisateur ou prestataire depuis Mon compte',
    ],
    cannotDo: [
      'Créer des événements, invitations ou plans de table',
      'Publier une salle ou une prestation',
      'Souscrire un abonnement SaaS tant que le compte reste client',
    ],
    navLinks: [
      { label: 'Marketplace', href: '/dashboard/catalogue' },
      { label: 'Agenda', href: '/dashboard/catalogue?kind=event' },
      { label: 'Mes billets', href: '/dashboard/tickets' },
      { label: 'Mes réservations', href: '/dashboard/bookings' },
      { label: 'Guide utilisateur', href: '/dashboard/guide' },
      { label: 'Mon compte', href: '/dashboard/profile' },
    ],
    workflows: [
      {
        id: 'explore-favorites',
        title: 'Explorer et enregistrer des favoris',
        content:
          '1. Ouvrez Marketplace.\n2. Onglet Explorer : filtrez par mot-clé, ville, commune, type (salles / prestataires / événements), métier ou location (habits, véhicules, matériel), prix, places.\n3. Passez en grille, liste, carte ou Focus (plein écran). Les pastilles indiquent Salle, Presta ou Évén.\n4. Cliquez sur le cœur d’une salle ou d’un prestataire.\n5. Onglet Favoris : filtrez salles / prestataires et changez la vue.\n6. Bouton Partager : copie l’URL actuelle, avec vos filtres.',
        links: [{ label: 'Marketplace', href: '/dashboard/catalogue' }],
      },
      {
        id: 'share-search',
        title: 'Partager une recherche ou une fiche',
        content:
          '1. Dans Explorer, le bouton Partager copie l’adresse de la page : le destinataire retrouve les mêmes filtres (ville, type, carte…).\n2. Sur une fiche salle, prestataire ou événement, Partager envoie le lien public marketplace — pas une URL interne du tableau de bord.\n3. Aucun compte n’est obligatoire pour ouvrir le lien ; devis, favoris et billets demandent une connexion ou un passage invité.',
        links: [{ label: 'Marketplace', href: '/dashboard/catalogue' }],
      },
      {
        id: 'prepare-event',
        title: 'Préparer un événement avec un brief budget',
        content:
          'À quoi ça sert : vous donnez un budget max et ce dont vous avez besoin. EventMaster propose 3 packs (économique, équilibré, confort) qui tiennent dans l’enveloppe — salle et prestataires déjà combinés. Rien n’est réservé : vous comparez, puis contactez.\n\nCas d’usage — Marie, mariage à Kinshasa, 100 invités, 1 500 000 FC :\n1. Onglet Préparer un événement.\n2. (Facultatif) ouvrez « Exemple — mariage à Kinshasa » et cliquez Appliquer cet exemple.\n3. Budget max = 1 500 000 FC. Marge 5 % = 75 000 FC de réserve ; la recherche porte sur 1 425 000 FC. Les pourcentages (salle 38 %, traiteur 28 %…) s’affichent aussi en francs.\n4. Ville Kinshasa, 100 invités, date. Salle obligatoire. Métiers : un clic = obligatoire → si ça rentre → exclu.\n5. Lancez la recherche, comparez les 3 packs (chaque barre montre le montant exact). Élargissez un poste manquant ou figez une ligne puis relancez.\n6. Sauvegardez le brief et/ou le pack dans Mes packs, puis envoyez un devis depuis une fiche.',
        links: [{ label: 'Préparer un événement', href: '/dashboard/catalogue?hub=plan' }],
      },
      {
        id: 'browse-agenda',
        title: 'Parcourir l’agenda et s’inscrire',
        content:
          '1. Ouvrez Agenda (ou Marketplace filtré sur Événements).\n2. Filtrez par date, ville, entrée payante / libre.\n3. Ouvrez une fiche, inscrivez-vous ou achetez un billet (compte ou invité).\n4. Le billet apparaît dans Mes billets si vous êtes connecté ou si l’e-mail correspond.',
        links: [
          { label: 'Agenda', href: '/dashboard/catalogue?kind=event' },
          { label: 'Mes billets', href: '/dashboard/tickets' },
        ],
      },
      {
        id: 'book-venue',
        title: 'Réserver une salle ou un prestataire',
        content:
          '1. Ouvrez une fiche depuis Explorer, Favoris, l’Agenda ou un pack.\n2. Envoyez un devis ou une demande de date.\n3. Versez l’acompte (30 %) directement au professionnel, hors EventMaster, après acceptation.\n4. Suivez le statut dans Mes réservations (filtres par statut, type et dates).',
        links: [
          { label: 'Marketplace', href: '/dashboard/catalogue' },
          { label: 'Mes réservations', href: '/dashboard/bookings' },
        ],
      },
      {
        id: 'my-tickets',
        title: 'Retrouver, filtrer et afficher un billet',
        content:
          '1. Les commandes liées à votre compte ou à votre e-mail apparaissent dans Mes billets.\n2. Filtrez par mot-clé, à venir / passés, payant / entrée libre, et lieu.\n3. Passez en grille ou liste (nombre de colonnes mémorisé).\n4. Ouvrez Badge QR pour le portail RSVP, ou Fiche pour l’événement.\n5. Le bouton Agenda ouvre les événements du marketplace client — pas le site public.',
        links: [
          { label: 'Mes billets', href: '/dashboard/tickets' },
          { label: 'Agenda', href: '/dashboard/catalogue?kind=event' },
        ],
      },
      {
        id: 'upgrade-account',
        title: 'Passer organisateur ou prestataire',
        content:
          '1. Ouvrez Mon compte.\n2. Changez le type de compte (organisateur, prestataire / salles, ou les deux).\n3. L’espace SaaS s’ouvre : événements ou publication marketplace.\n4. Choisissez ensuite un forfait adapté dans Facturation.',
        links: [{ label: 'Mon compte', href: '/dashboard/profile' }],
      },
    ],
    tips: [
      'Le compte client n’exige pas de licence SaaS.',
      'La marge du brief est un montant : 5 % de 1 500 000 FC = 75 000 FC mis de côté.',
      'Les trois packs d’une recherche évitent de proposer la même salle si le catalogue le permet.',
      'Enregistrez un brief pour relancer la même recherche ; figez une salle puis relancez pour recalculer uniquement les prestataires.',
      'L’Agenda du menu ouvre le marketplace client (événements), pas /marketplace/evenements.',
      'Partagez une recherche pour envoyer exactement les mêmes filtres ; sur une fiche, le lien public suffit.',
      'La commission vendeur (8 %) est distincte de l’abonnement EventMaster ; vous ne la payez pas en tant que client.',
    ],
  },
  {
    id: 'guest',
    title: 'Guide Invité',
    badge: 'Portail RSVP',
    summary:
      'Vous accédez à votre invitation personnelle via un lien reçu par e-mail ou WhatsApp. Aucun compte EventMaster n\'est requis.',
    canDo: [
      'Confirmer ou décliner votre présence (RSVP)',
      'Consulter les détails de l\'événement (date, lieu, description)',
      'Afficher votre badge QR pour l\'accueil',
      'Recevoir votre placement (PDF, plan, GPS) dès confirmation RSVP',
      'Participer au fil d\'actualité et au livre d\'or si activés',
    ],
    cannotDo: [
      'Modifier la liste d\'invités ou créer des événements',
      'Accéder au dashboard organisateur',
      'Voir le plan de table / GPS avant d\'avoir accepté l\'invitation',
      'Voir les informations d\'autres invités (hors voisins de table une fois placé)',
    ],
    navLinks: [],
    workflows: [
      {
        id: 'confirm-rsvp',
        title: 'Confirmer votre présence',
        content:
          '1. Ouvrez le lien reçu dans votre invitation.\n2. Acceptez les conditions d\'utilisation si demandé.\n3. Consultez les détails de l\'événement.\n4. Choisissez Accepter ou Décliner et remplissez les champs demandés (menu, plus-one…).',
      },
      {
        id: 'view-seating',
        title: 'Consulter votre placement',
        content:
          '1. Après avoir accepté l\'invitation, votre badge QR et votre placement (si déjà assigné) sont disponibles.\n2. Vous recevez aussi le PDF et le GPS par e-mail ou WhatsApp (selon le forfait).\n3. Présentez le QR à l\'accueil le jour J pour valider votre entrée.',
      },
      {
        id: 'event-day',
        title: 'Le jour de l\'événement',
        content:
          '1. Présentez votre QR code (portail ou message de confirmation) à l\'accueil.\n2. Le protocole scanne votre code pour valider votre entrée.\n3. Consultez le fil d\'actualité pour les annonces en direct.',
      },
    ],
    tips: [
      'Conservez le lien RSVP — il est unique et personnel.',
      'Le PDF et la localisation GPS partent dès votre RSVP positif, dès que votre place est assignée.',
      'Si le lien ne fonctionne pas, contactez directement l\'organisateur.',
    ],
  },
];

/** Fix typo in org_commercial - I had a typo with canDo */
export function getUserGuide(id: UserGuideId): UserGuide | undefined {
  return USER_GUIDES.find((g) => g.id === id);
}

export function getAllUserGuideIds(): UserGuideId[] {
  return USER_GUIDES.map((g) => g.id);
}

export const DASHBOARD_GUIDE_IDS: UserGuideId[] = USER_GUIDES.filter((g) => g.id !== 'guest').map(
  (g) => g.id,
);
