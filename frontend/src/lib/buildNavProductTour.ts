import type { CommercialGrantedPermissions, OrgAccess, PlanCapabilities, PlanQuotaInfo } from '@/context/AuthContext';
import type { UserGuideId } from '@/config/userGuides';
import { FINISH_STEP, NAV_TOUR_META, WELCOME_STEP } from '@/config/navTourMeta';
import type { ProductTourStep } from '@/config/productTours';
import { getWorkspaceModules, type WorkspaceModules } from '@/lib/planAccess';
import { LANDING_PLANS } from '@/config/landingPricing';
import { planDisplayName } from '@/lib/planCatalogDb';
import { interpolateRates } from '@/lib/platformRates';
import { buildDashboardNav, isVenuePlan, navTourTabs, type NavTourTab } from '@/lib/dashboardNav';

function tabStep(tourId: string, routeOverride?: string): ProductTourStep | null {
  const meta = NAV_TOUR_META[tourId];
  if (!meta) return null;
  return {
    id: tourId,
    title: meta.title,
    description: interpolateRates(meta.description),
    route: routeOverride ?? meta.route,
    target: tourId,
  };
}

function pushTab(steps: ProductTourStep[], tourId: string, routeOverride?: string) {
  const step = tabStep(tourId, routeOverride);
  if (step) steps.push(step);
}

function spaceCopy(planName?: string | null): { title: string; welcome: string; finish: string } | undefined {
  const space = planName?.trim();
  if (!space) return undefined;
  return {
    title: `Visite de votre espace ${space}`,
    welcome: `Cette visite parcourt les onglets de votre espace ${space} et explique leur rôle. Cliquez sur Suivant pour avancer — vous pourrez relancer la visite quand vous voulez.`,
    finish: `Vous avez parcouru les onglets de votre espace ${space}. Relancez cette visite à tout moment depuis Mon compte.`,
  };
}

function buildSteps(
  tabs: Array<{ tourId: string; route?: string }>,
  copy?: { title: string; welcome: string; finish: string },
): ProductTourStep[] {
  const steps: ProductTourStep[] = [
    {
      id: WELCOME_STEP.id,
      title: copy?.title ?? WELCOME_STEP.title,
      description: copy?.welcome ?? WELCOME_STEP.description,
      route: WELCOME_STEP.route,
    },
  ];

  for (const tab of tabs) {
    pushTab(steps, tab.tourId, tab.route);
  }

  steps.push({
    id: FINISH_STEP.id,
    title: FINISH_STEP.title,
    description: copy?.finish ?? FINISH_STEP.description,
    route: FINISH_STEP.route,
  });

  return steps;
}

function pathOf(href: string): string {
  const q = href.indexOf('?');
  return q >= 0 ? href.slice(0, q) : href;
}

/**
 * Adresse de l’étape : celle de la fiche d’aide quand elle mène au même écran que l’entrée,
 * sinon celle de l’entrée (ex. « Modèles » : /dashboard?tab=templates côté Super Admin,
 * /dashboard/templates côté organisation). Le guide ne change pas de page.
 */
function tabRoute(tab: NavTourTab): string | undefined {
  const metaRoute = NAV_TOUR_META[tab.tourId]?.route;
  if (metaRoute && pathOf(metaRoute) === pathOf(tab.href)) return undefined;
  return tab.href;
}

function guideRole(guideId: UserGuideId): string {
  if (guideId === 'super_admin') return 'SUPER_ADMIN';
  if (guideId === 'commercial_platform') return 'COMMERCIAL';
  return 'USER';
}

/** Onglets de la visite : même construction et même ordre que le menu de dashboard/layout.tsx. */
export function buildNavTourTabs(
  guideId: UserGuideId,
  access?: OrgAccess | null,
  opts?: NavTourOptions,
): Array<{ tourId: string; route?: string }> {
  const nav = opts?.nav;
  const workspace = opts?.workspace ?? getWorkspaceModules({ accountKind: nav?.accountKind, access });
  const sections = buildDashboardNav({
    role: guideRole(guideId),
    access,
    workspace,
    accountKind: nav?.accountKind,
    isClientAccount: nav?.isClientAccount ?? (guideId === 'client' || access?.level === 'client'),
    tenantPlan: nav?.tenantPlan,
    audience: nav?.audience,
    venuePlan: nav?.venuePlan,
    commercialPermissions: nav?.commercialPermissions,
    allStudiosBlocked: nav?.allStudiosBlocked,
  });
  return navTourTabs(sections).map((tab) => ({ tourId: tab.tourId, route: tabRoute(tab) }));
}

export function getTourSpaceLabel(opts: {
  planId?: string | null;
  audience?: string | null;
  planName?: string | null;
}): string {
  if (opts.planName?.trim()) return opts.planName.trim();
  const audience = opts.audience;
  const id = opts.planId || '';
  if (audience === 'VENUE' || id === 'VENUE') return 'Salle';
  if (audience === 'SERVICE' || id === 'SERVICE') return 'Prestataire';
  if (audience === 'CATALOG' || id === 'CATALOG') return 'Salle & presta';
  if (audience === 'B2C' || id.startsWith('PERSONAL')) return 'Particulier';
  if (id === 'FREE') return 'Essai';
  return 'organisation';
}

/** Contexte du compte nécessaire pour reconstruire le menu (voir buildDashboardNav). */
export interface NavTourMenuContext {
  accountKind?: string | null;
  isClientAccount?: boolean;
  tenantPlan?: string | null;
  audience?: string | null;
  venuePlan?: boolean;
  commercialPermissions?: CommercialGrantedPermissions | null;
  allStudiosBlocked?: boolean;
}

export interface NavTourOptions {
  workspace?: WorkspaceModules | null;
  planName?: string | null;
  nav?: NavTourMenuContext;
  /** `first-login` : parcours court après OTP. `nav` (défaut) : tous les onglets. */
  variant?: 'nav' | 'first-login';
}

export function buildNavTourOptions(input: {
  accountKind?: string | null;
  access?: OrgAccess | null;
  planQuota?: PlanQuotaInfo | null;
  planFeatures?: PlanCapabilities | null;
  planId?: string | null;
  /** Nom du forfait en base (useAuth().planName) ; libellé marketing en secours. */
  planName?: string | null;
}): NavTourOptions {
  const ms365Name = LANDING_PLANS.find((p) => p.id === input.planId)?.ms365Name;
  const landingName =
    input.planName || (ms365Name ? planDisplayName(input.planId, null, ms365Name) : null);
  const workspace = getWorkspaceModules({
    accountKind: input.accountKind,
    access: input.access,
    planQuota: input.planQuota,
    planFeatures: input.planFeatures,
  });
  return {
    workspace,
    nav: {
      accountKind: input.accountKind,
      isClientAccount: input.accountKind === 'CLIENT' || input.access?.level === 'client',
      tenantPlan: input.planId,
      audience: input.planFeatures?.audience,
      venuePlan: isVenuePlan({
        audience: input.planFeatures?.audience,
        maxRooms: input.planQuota?.limits.maxRooms,
        quotaLoaded: Boolean(input.planQuota),
        workspace,
      }),
    },
    planName: getTourSpaceLabel({
      planId: input.planId,
      audience: input.planFeatures?.audience,
      planName: landingName,
    }),
  };
}

function firstLoginHome(guideId: UserGuideId, access?: OrgAccess | null): string {
  if (guideId === 'client') return '/dashboard';
  if (guideId === 'org_protocol' || access?.isProtocolOnly) return '/dashboard';
  if (guideId === 'org_commercial') return '/dashboard/org-commercial';
  if (guideId === 'commercial_platform') return '/dashboard?tab=tenants';
  if (guideId === 'super_admin') return '/dashboard?tab=overview';
  return '/dashboard';
}

function firstLoginFinish(home: string, nextHint: string): ProductTourStep {
  return {
    id: 'first-finish',
    title: 'Vous êtes lancé',
    description: `${nextHint} Relancez la visite complète à tout moment depuis Mon compte.`,
    route: home,
  };
}

/** Parcours court après la première connexion — 4 à 6 étapes, pas tout le menu. */
export function buildFirstLoginTour(
  guideId: UserGuideId,
  access?: OrgAccess | null,
  opts?: NavTourOptions,
): ProductTourStep[] {
  if (guideId === 'guest') return [];
  const home = firstLoginHome(guideId, access);
  const workspace = opts?.workspace;
  const steps: ProductTourStep[] = [];

  const push = (tourId: string, route?: string) => pushTab(steps, tourId, route);

  switch (guideId) {
    case 'client':
      push('nav-client-dashboard', home);
      push('nav-catalogue');
      push('nav-quotes');
      push('nav-reservations');
      push('nav-tickets');
      steps.push(
        firstLoginFinish(home, 'Ensuite : ouvrez une fiche, enregistrez un favori ou demandez un devis.'),
      );
      return steps;

    case 'org_protocol':
      push('nav-dashboard');
      push('nav-protocol');
      push('nav-catalogue');
      push('nav-publications');
      push('nav-quotes');
      steps.push(firstLoginFinish(home, 'Ensuite : ouvrez un événement le jour J et testez le scan QR.'));
      return steps;

    case 'org_manager':
      push('nav-dashboard', home);
      if (!workspace || workspace.showEvents) push('nav-events');
      if (!workspace || workspace.showBrowseCatalogue) {
        push('nav-catalogue');
        push('nav-publications');
      }
      push('nav-quotes');
      if (!workspace || workspace.showTeam) push('nav-team');
      steps.push(
        firstLoginFinish(
          home,
          'Ensuite : créez un événement, publiez une réalisation ou lancez une simulation IA.',
        ),
      );
      return steps;

    case 'vendor':
      push('nav-dashboard', home);
      push('nav-quotes');
      push('nav-reservations');
      if (workspace?.showRooms) push('nav-rooms');
      if (access?.canManageRooms) push('nav-marketplace');
      steps.push(
        firstLoginFinish(home, 'Ensuite : complétez une fiche avec des photos et un prix pour recevoir vos premiers devis.'),
      );
      return steps;

    case 'org_commercial':
      push('nav-org-commercial');
      steps.push(firstLoginFinish(home, 'Ensuite : partagez votre lien de parrainage.'));
      return steps;

    case 'commercial_platform':
      push('nav-tenants');
      push('nav-subscription-requests');
      push('nav-commercial');
      steps.push(firstLoginFinish(home, 'Ensuite : suivez une organisation ou une demande d’abonnement.'));
      return steps;

    case 'super_admin':
      push('nav-overview');
      push('nav-tenants');
      steps.push(firstLoginFinish(home, 'Ensuite : traitez la file du jour.'));
      return steps;

    default: {
      push('nav-dashboard', home);
      if (!workspace || workspace.showEvents) {
        push('nav-events');
        if (workspace?.showBrowseCatalogue) push('nav-catalogue');
        push('nav-quotes');
        push('nav-reservations');
        if (workspace?.showMarketplace) push('nav-marketplace');
      } else {
        if (workspace.showRooms) push('nav-rooms');
        if (workspace.showMarketplace) push('nav-marketplace');
      }
      if (access?.canViewBilling) push('nav-billing');
      const nextHint = workspace && !workspace.showEvents
        ? 'Ensuite : publiez une fiche salle ou prestation, puis choisissez un forfait marketplace.'
        : workspace?.showMarketplace
          ? 'Ensuite : créez un événement, puis publiez une offre sur Mes offres.'
          : 'Ensuite : créez votre premier événement, puis ajoutez un invité.';
      steps.push(firstLoginFinish(home, nextHint));
      return steps;
    }
  }
}

/** Profils dont la visite garde l’accueil générique (pas de nom de forfait). */
const GENERIC_COPY_GUIDES: UserGuideId[] = ['super_admin', 'commercial_platform', 'org_commercial', 'org_protocol', 'client'];

/** Visite complète : un arrêt par entrée du menu, dans l’ordre du menu du profil, puis le profil. */
export function buildNavProductTour(
  guideId: UserGuideId,
  access?: OrgAccess | null,
  opts?: NavTourOptions,
): ProductTourStep[] {
  if (guideId === 'guest') return [];
  const copy = GENERIC_COPY_GUIDES.includes(guideId) ? undefined : spaceCopy(opts?.planName);
  return buildSteps(buildNavTourTabs(guideId, access, opts), copy);
}

export function getProductTour(
  guideId: UserGuideId,
  access?: OrgAccess | null,
  opts?: NavTourOptions,
): ProductTourStep[] {
  if (opts?.variant === 'first-login') return buildFirstLoginTour(guideId, access, opts);
  return buildNavProductTour(guideId, access, opts);
}
