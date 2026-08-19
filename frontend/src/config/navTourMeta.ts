/** Métadonnées descriptives pour chaque onglet du menu (attribut data-tour). */
export interface NavTourMeta {
  title: string;
  description: string;
  /** Route à ouvrir pour contextualiser l'onglet (optionnel si = menu seulement) */
  route?: string;
}

export const NAV_TOUR_META: Record<string, NavTourMeta> = {
  'nav-overview': {
    title: 'Accueil plateforme',
    description:
      'File du jour : demandes d’abonnement à traiter, licences qui expirent et factures récentes. Point d’entrée Super Admin pour prioriser la journée.',
    route: '/dashboard?tab=overview',
  },
  'nav-tenants': {
    title: 'Organisations',
    description:
      'Liste de toutes les organisations inscrites. Consultez leur forfait, l\'état de la licence, le nombre de membres et d\'événements. Créez une organisation ou ouvrez le détail pour modifier le plan, la clé de licence ou l\'historique d\'abonnement.',
    route: '/dashboard?tab=tenants',
  },
  'nav-users': {
    title: 'Utilisateurs',
    description:
      'Annuaire global de tous les comptes plateforme. Filtrez par rôle (USER, COMMERCIAL, SUPER_ADMIN), recherchez par e-mail ou organisation, et gérez les accès.',
    route: '/dashboard?tab=users',
  },
  'nav-events-admin': {
    title: 'Événements (supervision)',
    description:
      'Vue transversale de tous les événements créés sur la plateforme, toutes organisations confondues. Supervisez dates, lieux, public / privé et billets. Pagination serveur.',
    route: '/dashboard/admin/events',
  },
  'nav-guests': {
    title: 'Invités (supervision)',
    description:
      'Liste globale des invités. Filtrez RSVP, PDF livré / manquant et présence. Détail, impersonation et suppression — sans création depuis cette file.',
    route: '/dashboard/admin/guests',
  },
  'nav-templates': {
    title: 'Modèles globaux',
    description:
      'Modèles d\'invitation publics réutilisables par toutes les organisations. Activez « Sur la landing page » pour les afficher sur le site vitrine. Ouvrez le concepteur visuel pour créer ou modifier un modèle.',
    route: '/dashboard?tab=templates',
  },
  'nav-message-templates': {
    title: 'Messages invités',
    description:
      'Modèles par défaut des e-mails et messages WhatsApp envoyés automatiquement aux invités (invitation, rappel, placement, etc.). Personnalisez le texte et les variables.',
    route: '/dashboard?tab=message-templates',
  },
  'nav-analytics': {
    title: 'Analyses & stats',
    description:
      'Tableaux de bord plateforme : vue d\'ensemble, répartition des forfaits, organisations actives, revenus, modèles, utilisateurs et événements. Export CSV/PDF des revenus.',
    route: '/dashboard?tab=analytics',
  },
  'nav-subscription-requests': {
    title: 'Demandes d\'abonnement',
    description:
      'File d\'attente des demandes de changement ou d\'activation de forfait. Vérifiez la preuve de paiement, approuvez ou rejetez — une facture est générée à l\'approbation.',
    route: '/dashboard?tab=subscription-requests',
  },
  'nav-subscription-plans': {
    title: 'Forfaits',
    description:
      'Configuration des plans (Essentials, Premium, Enterprise) : quotas, fonctionnalités activées et tarifs affichés aux organisations.',
    route: '/dashboard?tab=subscription-plans',
  },
  'nav-invoices': {
    title: 'Factures',
    description:
      'Historique des factures plateforme générées après validation d\'abonnement, paiement ou renouvellement. Consultez montants, périodes et statuts.',
    route: '/dashboard?tab=invoices',
  },
  'nav-payouts': {
    title: 'Versements SaaS',
    description:
      'File des commissions des commerciaux plateforme : EventMaster verse hors plateforme, puis le Super Admin joint une preuve et un motif. Distinct du 8 % marketplace (Catalogue).',
    route: '/dashboard/admin/payouts',
  },
  'nav-settings': {
    title: 'Configurations',
    description:
      'Paramètres globaux de la plateforme : clés API, options système et réglages avancés réservés au super administrateur.',
    route: '/dashboard?tab=settings',
  },
  'nav-commercial': {
    title: 'Parrainage & commissions',
    description:
      'Votre espace commercial : code de parrainage, organisations référées, commissions mensuelles et statistiques de performance.',
    route: '/dashboard/commercial',
  },
  'nav-org-commercial': {
    title: 'Réseau commercial',
    description:
      'Espace dédié au commercial de l\'organisation : partagez votre code de parrainage, suivez les organisations parrainées et vos commissions internes.',
    route: '/dashboard/org-commercial',
  },
  'nav-dashboard': {
    title: 'Tableau de bord',
    description:
      'Page d\'accueil de votre organisation. Visualisez vos quotas (événements, invités, modèles, salles), les événements récents et les indicateurs clés en un coup d\'œil.',
    route: '/dashboard',
  },
  'nav-events': {
    title: 'Événements',
    description:
      'Parcours guidé : événement privé ou public, invités ou billets en ligne, invitation RSVP, plan de table, protocole jour J.',
    route: '/dashboard/events',
  },
  'nav-rooms': {
    title: 'Salles',
    description:
      'Créez les salles de l’organisation, générez un plan 2D, assignez le staff et publiez une fiche sur le marketplace.',
    route: '/dashboard/rooms',
  },
  'nav-team': {
    title: 'Équipe',
    description:
      'Invitez managers, agents protocole et commerciaux. Chaque rôle reçoit les accès correspondants.',
    route: '/dashboard/team',
  },
  'nav-marketplace': {
    title: 'Marketplace',
    description:
      'Publiez salles, métiers ou locations (habits, véhicules, matériel), suivez les devis, puis confirmez les réservations : accepter → acompte hors plateforme → bloquer la date.',
    route: '/dashboard/marketplace',
  },
  'nav-protocol': {
    title: 'Protocole',
    description:
      'Mode accueil le jour J : scan caméra du QR invité, vérification d\'identité et confirmation de présence à l\'entrée.',
    route: '/dashboard/events?mode=protocol',
  },
  'nav-analytics-org': {
    title: 'Statistiques',
    description:
      'Statistiques de votre organisation : taux de réponse RSVP, répartition des invités, activité par événement et indicateurs de participation.',
    route: '/dashboard/analytics',
  },
  'nav-billing': {
    title: 'Facturation & plan',
    description:
      'Consultez votre forfait actuel, les quotas consommés et disponibles. Soumettez une demande de changement de plan avec preuve de paiement si nécessaire.',
    route: '/dashboard/billing',
  },
  'nav-notifications': {
    title: 'Notifications',
    description:
      'Inbox de votre compte : factures, devis marketplace, réservations et alertes d’abonnement. Marquez comme lu et ouvrez l’écran concerné.',
    route: '/dashboard/notifications',
  },
  'nav-audit': {
    title: 'Journal d’audit',
    description:
      'Historique des actions Super Admin et Commercial plateforme : impersonation, changements de forfait, suppressions.',
    route: '/dashboard/audit',
  },
  'nav-catalog-admin': {
    title: 'Catalogue',
    description:
      'Modération des fiches salles, métiers et locations, devis, réservations, et file des commissions vendeur {commissionPercent} %.',
    route: '/dashboard/admin/catalogue',
  },
  'nav-guide': {
    title: 'Guide utilisateur',
    description:
      'Documentation détaillée et visite guidée interactive de votre espace. Relancez le tour des onglets à tout moment depuis l\'onglet « Visite guidée ».',
    route: '/dashboard/guide?view=tour',
  },
  'nav-profile': {
    title: 'Mon compte',
    description:
      'Profil personnel (nom, e-mail, mot de passe) et couleurs de marque de l’organisation.',
    route: '/dashboard/profile',
  },
  'nav-catalogue': {
    title: 'Marketplace',
    description:
      'Explorer salles, prestataires, locations (habits, véhicules, matériel) et événements : filtres, carte Focus, grille ou liste, partage de l’URL. Onglets Favoris, Préparer un événement (brief budget) et Mes packs.',
    route: '/dashboard/catalogue',
  },
  'nav-agenda': {
    title: 'Agenda',
    description:
      'Événements publics du marketplace client. Filtrez, ouvrez une fiche, inscrivez-vous ou achetez un billet — il apparaît dans Mes billets.',
    route: '/dashboard/catalogue?kind=event',
  },
  'nav-bookings': {
    title: 'Mes réservations',
    description:
      'Suivez vos demandes de dates : filtrez par statut, type et période. L’acompte ({depositPercent} %) se verse hors plateforme.',
    route: '/dashboard/bookings',
  },
  'nav-tickets': {
    title: 'Mes billets',
    description:
      'Retrouvez vos inscriptions et achats, filtrez (date, entrée, lieu), passez en grille ou liste, puis ouvrez le badge QR. L’agenda mène au marketplace.',
    route: '/dashboard/tickets',
  },
};

export const WELCOME_STEP = {
  id: 'welcome',
  title: 'Bienvenue sur EventMaster',
  description:
    'Cette visite interactive parcourt chaque onglet de votre menu et explique son rôle. Cliquez sur Suivant pour avancer — vous pourrez relancer la visite quand vous voulez.',
  route: '/dashboard/guide?view=tour',
} as const;

export const FINISH_STEP = {
  id: 'finish',
  title: 'Visite terminée',
  description:
    'Vous avez parcouru tous les onglets disponibles pour votre profil. Consultez la documentation pour plus de détails ou relancez cette visite à tout moment.',
  route: '/dashboard/guide?view=tour',
  target: 'nav-guide',
} as const;
