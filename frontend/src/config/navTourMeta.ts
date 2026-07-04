/** Métadonnées descriptives pour chaque onglet du menu (attribut data-tour). */
export interface NavTourMeta {
  title: string;
  description: string;
  /** Route à ouvrir pour contextualiser l'onglet (optionnel si = menu seulement) */
  route?: string;
}

export const NAV_TOUR_META: Record<string, NavTourMeta> = {
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
      'Vue transversale de tous les événements créés sur la plateforme, toutes organisations confondues. Supervisez dates, lieux et volumes d\'activité.',
    route: '/dashboard?tab=events',
  },
  'nav-guests': {
    title: 'Invités (supervision)',
    description:
      'Liste globale des invités enregistrés. Recherchez par nom, e-mail, événement ou organisation. Exportez ou modifiez un invité si nécessaire.',
    route: '/dashboard?tab=guests',
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
      'Parcours guidé de bout en bout : création, invités, modèle & invitation, envoi PDF, RSVP, plan de table avec notifications, protocole jour J et statistiques.',
    route: '/dashboard/events',
  },
  'nav-protocol': {
    title: 'Protocole',
    description:
      'Mode accueil le jour J : scan caméra du QR invité, vérification d\'identité, confirmation de présence et envoi de la notification de placement (e-mail / WhatsApp).',
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
  'nav-guide': {
    title: 'Guide utilisateur',
    description:
      'Documentation détaillée et visite guidée interactive de votre espace. Relancez le tour des onglets à tout moment depuis l\'onglet « Visite guidée ».',
    route: '/dashboard/guide?view=tour',
  },
  'nav-profile': {
    title: 'Mon compte',
    description:
      'Profil personnel (nom, e-mail, mot de passe). Si vous êtes manager ou propriétaire : onglets Équipe (inviter managers, protocoles, commerciaux) et Salles (plans 2D).',
    route: '/dashboard/profile',
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
