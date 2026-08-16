export type UserGuideId =
  | 'super_admin'
  | 'commercial_platform'
  | 'owner'
  | 'org_manager'
  | 'org_protocol'
  | 'org_commercial'
  | 'staff_scope'
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
      'En tant que propriétaire (créateur de l\'organisation), vous disposez de tous les droits : équipe, salles, événements, modèles, facturation et factures.',
    canDo: [
      'Gérer l\'équipe (managers, protocoles, commerciaux org.)',
      'Créer et configurer les salles 2D',
      'Créer et gérer tous les événements de l\'organisation',
      'Accéder à la facturation, au forfait et aux factures',
      'Personnaliser les modèles d\'invitation et messages invités',
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
      { label: 'Mon compte — Équipe & Salles', href: '/dashboard/profile' },
    ],
    workflows: [
      {
        id: 'event-lifecycle',
        title: 'Parcours complet d\'un événement',
        content:
          '1. Créez l\'événement (titre, date, lieu, salle).\n2. Ajoutez ou importez vos invités.\n3. Configurez un modèle visuel et une invitation (e-mail / WhatsApp).\n4. Diffusez l\'invitation : les invités reçoivent uniquement le lien RSVP (pas de PDF ni GPS).\n5. Les invités confirment ou déclinent via leur lien personnel.\n6. Organisez le plan de table 2D et assignez les places — une annonce (table + voisins) peut partir à la sauvegarde.\n7. Le jour J, utilisez le mode Protocole (scan QR) pour confirmer la présence : le PDF, le plan et le GPS partent alors à l\'invité.\n8. Consultez les statistiques RSVP et participation.',
        links: [
          { label: 'Événements', href: '/dashboard/events' },
          { label: 'Statistiques', href: '/dashboard/analytics' },
        ],
      },
      {
        id: 'create-event',
        title: 'Créer un événement complet',
        content:
          '1. Allez dans Événements → Créer.\n2. Renseignez titre, date, lieu et associez une salle si disponible.\n3. Suivez le parcours guidé : invités → modèle & invitation → envoi RSVP → réponses → plan de table → protocole (PDF/GPS à l\'entrée) → stats.',
        links: [{ label: 'Événements', href: '/dashboard/events' }],
      },
      {
        id: 'manage-team',
        title: 'Inviter un membre d\'équipe',
        content:
          '1. Mon compte → onglet Équipe.\n2. Choisissez le rôle : Manager, Protocole ou Commercial org.\n3. Renseignez e-mail et mot de passe temporaire.\n4. Le membre reçoit ses accès selon son rôle.',
        links: [{ label: 'Équipe', href: '/dashboard/profile?tab=equipe' }],
      },
      {
        id: 'upgrade-plan',
        title: 'Changer de forfait',
        content:
          '1. Ouvrez Facturation & plan.\n2. Comparez les quotas et fonctionnalités.\n3. Soumettez une demande de changement avec preuve de paiement si requis.\n4. Suivez le statut dans Factures après validation.',
        links: [{ label: 'Facturation & plan', href: '/dashboard/billing' }],
      },
    ],
    tips: [
      'Les quotas (événements, invités, modèles) sont visibles sur le tableau de bord.',
      'Assignez des protocoles org. pour le scan QR sur tous les événements.',
      'Configurez les salles avant de créer des événements avec plan de table.',
    ],
  },
  {
    id: 'org_manager',
    title: 'Guide Manager organisation',
    badge: 'Organisation',
    summary:
      'Vous pilotez l\'organisation au quotidien : équipe, salles, événements et modèles. La facturation reste réservée au propriétaire.',
    canDo: [
      'Gérer l\'équipe et les rôles organisationnels',
      'Créer salles et événements',
      'Gérer invités, invitations et modèles',
      'Consulter les factures (sans modifier le forfait)',
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
      { label: 'Équipe & Salles', href: '/dashboard/profile' },
    ],
    workflows: [
      {
        id: 'event-lifecycle',
        title: 'Parcours complet d\'un événement',
        content:
          '1. Créez l\'événement et associez une salle 2D.\n2. Importez ou ajoutez la liste d\'invités.\n3. Choisissez un modèle et rédigez l\'invitation.\n4. Lancez la diffusion du lien RSVP (sans PDF ni GPS).\n5. Suivez les réponses RSVP.\n6. Placez les invités sur le plan de table — une annonce table/voisins peut partir à la sauvegarde.\n7. Jour J : mode Protocole pour l\'accueil ; PDF, plan et GPS partent après confirmation de présence.\n8. Analysez les statistiques de participation.',
        links: [
          { label: 'Événements', href: '/dashboard/events' },
          { label: 'Statistiques', href: '/dashboard/analytics' },
        ],
      },
      {
        id: 'setup-room',
        title: 'Configurer une salle 2D',
        content:
          '1. Mon compte → Salles → Créer.\n2. Choisissez le type (banquet, conférence…).\n3. Placez tables, chaises et éléments décoratifs.\n4. Associez la salle à un événement pour le placement invités.',
        links: [{ label: 'Salles', href: '/dashboard/profile?tab=salles' }],
      },
      {
        id: 'invite-guests',
        title: 'Inviter et placer des invités',
        content:
          '1. Ouvrez un événement → onglet Invités.\n2. Ajoutez ou importez la liste.\n3. Assignez les tables depuis le plan de salle.\n4. Envoyez l\'invitation — l\'invité reçoit un lien RSVP personnel.',
        links: [{ label: 'Événements', href: '/dashboard/events' }],
      },
    ],
    tips: [
      'Respectez le quota de managers org. selon votre forfait.',
      'Déléguez le protocole aux membres Protocole pour le jour J.',
      'Utilisez les modèles globaux comme base dans le concepteur visuel.',
    ],
  },
  {
    id: 'org_protocol',
    title: 'Guide Protocole organisation',
    badge: 'Organisation',
    summary:
      'Vous gérez l\'accueil et le contrôle des invités sur tous les événements de l\'organisation : scan QR, confirmation de présence et déclenchement de la livraison placement (PDF / GPS).',
    canDo: [
      'Accéder au mode Protocole sur tous les événements',
      'Scanner les QR codes invités avec la caméra',
      'Consulter et mettre à jour le statut RSVP des invités',
      'Confirmer la présence et déclencher l\'envoi PDF / GPS (selon forfait)',
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
          '1. Ouvrez Mode Protocole ou sélectionnez un événement.\n2. Activez la caméra pour scanner le QR de l\'invité (ou recherchez par nom).\n3. Vérifiez que le RSVP est « Confirmé » — sinon orientez l\'invité vers son lien.\n4. Confirmez la présence : le PDF, le plan et le GPS partent automatiquement si le forfait le permet.',
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
    id: 'guest',
    title: 'Guide Invité',
    badge: 'Portail RSVP',
    summary:
      'Vous accédez à votre invitation personnelle via un lien reçu par e-mail ou WhatsApp. Aucun compte EventMaster n\'est requis.',
    canDo: [
      'Confirmer ou décliner votre présence (RSVP)',
      'Consulter les détails de l\'événement (date, lieu, description)',
      'Afficher votre badge QR pour l\'accueil',
      'Recevoir votre placement (PDF, plan, GPS) après validation à l\'entrée',
      'Participer au fil d\'actualité et au livre d\'or si activés',
    ],
    cannotDo: [
      'Modifier la liste d\'invités ou créer des événements',
      'Accéder au dashboard organisateur',
      'Voir le plan de table / GPS avant l\'accueil protocole',
      'Voir les informations d\'autres invités (hors voisins de table affichés après l\'entrée)',
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
          '1. Après avoir accepté l\'invitation, votre badge QR est disponible — le plan détaillé, le PDF et le GPS restent masqués.\n2. Présentez le QR à l\'accueil le jour J.\n3. Une fois votre présence confirmée, le portail affiche votre table et vous recevez le PDF / GPS par e-mail ou WhatsApp.',
      },
      {
        id: 'event-day',
        title: 'Le jour de l\'événement',
        content:
          '1. Présentez votre QR code (portail ou message de confirmation) à l\'accueil.\n2. Le protocole scanne votre code pour valider votre entrée.\n3. Consultez ensuite votre placement et le fil d\'actualité pour les annonces en direct.',
      },
    ],
    tips: [
      'Conservez le lien RSVP — il est unique et personnel.',
      'Le PDF et la localisation GPS arrivent après l\'accueil, pas dès la confirmation RSVP.',
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
