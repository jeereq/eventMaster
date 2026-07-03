import type { UserGuideId } from '@/config/userGuides';

export interface ProductTourStep {
  id: string;
  title: string;
  description: string;
  /** Route Next.js (pathname + query) */
  route?: string;
  /** Valeur de l'attribut data-tour sur l'élément à mettre en avant */
  target?: string;
}

export const PRODUCT_TOURS: Record<Exclude<UserGuideId, 'guest'>, ProductTourStep[]> = {
  super_admin: [
    {
      id: 'welcome',
      title: 'Bienvenue, Super Admin',
      description:
        'Cette visite vous présente les zones clés de la plateforme. Vous pourrez la relancer à tout moment depuis l\'onglet « Visite guidée ».',
      route: '/dashboard/guide?view=tour',
    },
    {
      id: 'tenants',
      title: 'Organisations',
      description: 'Gérez les tenants, leurs plans, licences et administrateurs.',
      route: '/dashboard?tab=tenants',
      target: 'nav-tenants',
    },
    {
      id: 'templates',
      title: 'Modèles globaux',
      description: 'Créez et publiez des modèles d\'invitation visibles sur la landing page.',
      route: '/dashboard?tab=templates',
      target: 'nav-templates',
    },
    {
      id: 'analytics',
      title: 'Analyses & stats',
      description: 'Consultez l\'activité globale, les revenus et la répartition des forfaits.',
      route: '/dashboard?tab=analytics&section=overview',
      target: 'nav-analytics',
    },
    {
      id: 'subscriptions',
      title: 'Demandes d\'abonnement',
      description: 'Validez ou rejetez les demandes de changement de forfait.',
      route: '/dashboard?tab=subscription-requests',
      target: 'nav-subscription-requests',
    },
    {
      id: 'finish',
      title: 'Visite terminée',
      description:
        'Vous connaissez les bases. Revenez ici quand vous voulez relancer la visite ou consulter la documentation détaillée.',
      route: '/dashboard/guide?view=tour',
      target: 'nav-guide',
    },
  ],
  commercial_platform: [
    {
      id: 'welcome',
      title: 'Bienvenue, Commercial plateforme',
      description: 'Découvrez votre espace de suivi des parrainages et demandes d\'abonnement.',
      route: '/dashboard/guide?view=tour',
    },
    {
      id: 'tenants',
      title: 'Organisations parrainées',
      description: 'Liste des organisations liées à votre activité commerciale.',
      route: '/dashboard?tab=tenants',
      target: 'nav-tenants',
    },
    {
      id: 'requests',
      title: 'Demandes d\'abonnement',
      description: 'Suivez l\'état des demandes soumises par vos clients.',
      route: '/dashboard?tab=subscription-requests',
      target: 'nav-subscription-requests',
    },
    {
      id: 'commercial',
      title: 'Parrainage & commissions',
      description: 'Votre tableau de bord commercial : codes, commissions et statistiques.',
      route: '/dashboard/commercial',
      target: 'nav-commercial',
    },
    {
      id: 'finish',
      title: 'Visite terminée',
      description: 'Relancez cette visite à tout moment depuis le Guide utilisateur.',
      route: '/dashboard/guide?view=tour',
      target: 'nav-guide',
    },
  ],
  owner: [
    {
      id: 'welcome',
      title: 'Bienvenue dans votre organisation',
      description: 'En tant que propriétaire, vous avez accès à l\'ensemble des outils de gestion.',
      route: '/dashboard/guide?view=tour',
    },
    {
      id: 'dashboard',
      title: 'Tableau de bord',
      description: 'Vue d\'ensemble : quotas, événements récents et indicateurs clés.',
      route: '/dashboard',
      target: 'nav-dashboard',
    },
    {
      id: 'events',
      title: 'Événements',
      description: 'Créez des événements, gérez les invités, envoyez les invitations et configurez le protocole.',
      route: '/dashboard/events',
      target: 'nav-events',
    },
    {
      id: 'templates',
      title: 'Modèles',
      description: 'Personnalisez vos invitations visuelles avec le concepteur.',
      route: '/dashboard/templates',
      target: 'nav-templates',
    },
    {
      id: 'billing',
      title: 'Facturation & plan',
      description: 'Consultez votre forfait, vos quotas et soumettez une demande de changement.',
      route: '/dashboard/billing',
      target: 'nav-billing',
    },
    {
      id: 'finish',
      title: 'Visite terminée',
      description: 'Gérez aussi votre équipe et vos salles depuis Mon compte. Revenez ici pour relancer la visite.',
      route: '/dashboard/guide?view=tour',
      target: 'nav-guide',
    },
  ],
  org_manager: [
    {
      id: 'welcome',
      title: 'Bienvenue, Manager',
      description: 'Vous pilotez l\'organisation au quotidien : événements, équipe et salles.',
      route: '/dashboard/guide?view=tour',
    },
    {
      id: 'dashboard',
      title: 'Tableau de bord',
      description: 'Suivez l\'activité et les quotas de votre organisation.',
      route: '/dashboard',
      target: 'nav-dashboard',
    },
    {
      id: 'events',
      title: 'Événements',
      description: 'Créez et gérez vos événements, invités et plans de table.',
      route: '/dashboard/events',
      target: 'nav-events',
    },
    {
      id: 'profile',
      title: 'Mon compte — Équipe & Salles',
      description: 'Invitez des membres (protocole, managers) et configurez vos salles 2D.',
      route: '/dashboard/profile',
      target: 'nav-profile',
    },
    {
      id: 'finish',
      title: 'Visite terminée',
      description: 'Relancez cette visite quand vous le souhaitez.',
      route: '/dashboard/guide?view=tour',
      target: 'nav-guide',
    },
  ],
  org_protocol: [
    {
      id: 'welcome',
      title: 'Bienvenue, Protocole',
      description: 'Votre rôle : accueillir les invités, scanner les QR et suivre les présences.',
      route: '/dashboard/guide?view=tour',
    },
    {
      id: 'events',
      title: 'Événements',
      description: 'Accédez aux événements sur lesquels vous intervenez.',
      route: '/dashboard/events',
      target: 'nav-events',
    },
    {
      id: 'protocol',
      title: 'Mode Protocole',
      description: 'Lancez le scan caméra pour valider l\'entrée des invités.',
      route: '/dashboard/events?mode=protocol',
      target: 'nav-protocol',
    },
    {
      id: 'finish',
      title: 'Visite terminée',
      description: 'Relancez la visite depuis le Guide utilisateur à tout moment.',
      route: '/dashboard/guide?view=tour',
      target: 'nav-guide',
    },
  ],
  org_commercial: [
    {
      id: 'welcome',
      title: 'Bienvenue, Commercial organisation',
      description: 'Développez votre réseau en parrainant de nouvelles organisations.',
      route: '/dashboard/guide?view=tour',
    },
    {
      id: 'network',
      title: 'Réseau commercial',
      description: 'Votre code de parrainage, statistiques et organisations parrainées.',
      route: '/dashboard/org-commercial',
      target: 'nav-org-commercial',
    },
    {
      id: 'finish',
      title: 'Visite terminée',
      description: 'Partagez votre code à l\'inscription. Relancez la visite ici quand vous voulez.',
      route: '/dashboard/guide?view=tour',
      target: 'nav-guide',
    },
  ],
  staff_scope: [
    {
      id: 'welcome',
      title: 'Bienvenue',
      description: 'Vous êtes assigné à des salles ou événements précis — voici votre périmètre.',
      route: '/dashboard/guide?view=tour',
    },
    {
      id: 'events',
      title: 'Vos événements',
      description: 'Seuls les événements qui vous sont assignés apparaissent ici.',
      route: '/dashboard/events',
      target: 'nav-events',
    },
    {
      id: 'protocol',
      title: 'Protocole',
      description: 'Si vous êtes protocole, utilisez le scan QR depuis ce menu.',
      route: '/dashboard/events?mode=protocol',
      target: 'nav-protocol',
    },
    {
      id: 'finish',
      title: 'Visite terminée',
      description: 'Contactez votre manager pour élargir vos affectations. Relancez la visite ici.',
      route: '/dashboard/guide?view=tour',
      target: 'nav-guide',
    },
  ],
};

export function getProductTour(guideId: UserGuideId): ProductTourStep[] {
  if (guideId === 'guest') return [];
  return PRODUCT_TOURS[guideId] ?? PRODUCT_TOURS.org_manager;
}
