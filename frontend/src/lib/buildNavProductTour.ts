import type { OrgAccess, PlanCapabilities, PlanQuotaInfo } from '@/context/AuthContext';
import type { UserGuideId } from '@/config/userGuides';
import { FINISH_STEP, NAV_TOUR_META, WELCOME_STEP } from '@/config/navTourMeta';
import type { ProductTourStep } from '@/config/productTours';
import { getWorkspaceModules, type WorkspaceModules } from '@/lib/planAccess';
import { LANDING_PLANS } from '@/config/landingPricing';
import { interpolateRates } from '@/lib/platformRates';

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
    finish: `Vous avez parcouru les onglets de votre espace ${space}. Consultez la documentation pour plus de détails ou relancez cette visite à tout moment.`,
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
    target: FINISH_STEP.target,
  });

  return steps;
}

/** Même liste d’onglets que dashboard/layout.tsx (workspace + facturation). */
export function buildOrgNavTourIds(
  workspace?: WorkspaceModules | null,
  access?: OrgAccess | null,
): Array<{ tourId: string; route?: string }> {
  const tabs: Array<{ tourId: string; route?: string }> = [{ tourId: 'nav-dashboard' }];
  if (!workspace || workspace.showEvents) tabs.push({ tourId: 'nav-events' });
  if (workspace?.showBrowseCatalogue) tabs.push({ tourId: 'nav-catalogue' });
  if (!workspace || workspace.showEvents || workspace?.showBrowseCatalogue) {
    tabs.push({ tourId: 'nav-quotes' });
    tabs.push({ tourId: 'nav-reservations' });
  }
  if (workspace?.showRooms) tabs.push({ tourId: 'nav-rooms' });
  if (workspace?.showTeam) tabs.push({ tourId: 'nav-team' });
  if (workspace?.showMarketplace) tabs.push({ tourId: 'nav-marketplace' });
  if (workspace?.showProtocol) {
    tabs.push({ tourId: 'nav-protocol' });
  }
  if (workspace?.showAnalytics) tabs.push({ tourId: 'nav-analytics-org' });
  if (workspace?.showTemplates) tabs.push({ tourId: 'nav-templates', route: '/dashboard/templates' });
  if (access?.canViewBilling) tabs.push({ tourId: 'nav-billing' });
  if (access?.canViewBilling) tabs.push({ tourId: 'nav-org-payouts' });
  if (access?.canViewInvoices) tabs.push({ tourId: 'nav-invoices', route: '/dashboard/invoices' });
  tabs.push({ tourId: 'nav-guide' }, { tourId: 'nav-profile' });
  return tabs;
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

export interface NavTourOptions {
  workspace?: WorkspaceModules | null;
  planName?: string | null;
  /** `first-login` : parcours court après OTP. `nav` (défaut) : tous les onglets. */
  variant?: 'nav' | 'first-login';
}

export function buildNavTourOptions(input: {
  accountKind?: string | null;
  access?: OrgAccess | null;
  planQuota?: PlanQuotaInfo | null;
  planFeatures?: PlanCapabilities | null;
  planId?: string | null;
}): NavTourOptions {
  const landingName = LANDING_PLANS.find((p) => p.id === input.planId)?.ms365Name;
  return {
    workspace: getWorkspaceModules({
      accountKind: input.accountKind,
      access: input.access,
      planQuota: input.planQuota,
      planFeatures: input.planFeatures,
    }),
    planName: getTourSpaceLabel({
      planId: input.planId,
      audience: input.planFeatures?.audience,
      planName: landingName,
    }),
  };
}

function firstLoginHome(guideId: UserGuideId, access?: OrgAccess | null): string {
  if (guideId === 'client') return '/dashboard/catalogue';
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
    description: `${nextHint} Relancez la visite complète à tout moment depuis Guide utilisateur.`,
    route: home,
    target: 'nav-guide',
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
      push('nav-quotes');
      steps.push(firstLoginFinish(home, 'Ensuite : ouvrez un événement le jour J et testez le scan QR.'));
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
      } else {
        if (workspace.showRooms) push('nav-rooms');
        if (workspace.showMarketplace) push('nav-marketplace');
        if (access?.canViewBilling) push('nav-billing');
      }
      const nextHint = workspace && !workspace.showEvents
        ? 'Ensuite : publiez une fiche salle ou prestation, puis choisissez un forfait marketplace.'
        : 'Ensuite : créez votre premier événement, puis ajoutez un invité.';
      steps.push(firstLoginFinish(home, nextHint));
      return steps;
    }
  }
}

/** Ordre des onglets par profil — aligné sur dashboard/layout.tsx */
export function buildNavProductTour(
  guideId: UserGuideId,
  access?: OrgAccess | null,
  opts?: NavTourOptions,
): ProductTourStep[] {
  if (guideId === 'guest') return [];
  const copy = spaceCopy(opts?.planName);

  switch (guideId) {
    case 'super_admin':
      return buildSteps([
        { tourId: 'nav-overview' },
        { tourId: 'nav-tenants' },
        { tourId: 'nav-users' },
        { tourId: 'nav-events-admin' },
        { tourId: 'nav-guests' },
        { tourId: 'nav-templates' },
        { tourId: 'nav-message-templates' },
        { tourId: 'nav-catalog-admin' },
        { tourId: 'nav-analytics' },
        { tourId: 'nav-subscription-requests' },
        { tourId: 'nav-subscription-plans' },
        { tourId: 'nav-invoices' },
        { tourId: 'nav-payouts' },
        { tourId: 'nav-ai-tokens' },
        { tourId: 'nav-audit' },
        { tourId: 'nav-settings' },
        { tourId: 'nav-guide' },
        { tourId: 'nav-profile' },
      ]);

    case 'commercial_platform':
      return buildSteps([
        { tourId: 'nav-tenants' },
        { tourId: 'nav-subscription-requests' },
        { tourId: 'nav-invoices' },
        { tourId: 'nav-commercial' },
        { tourId: 'nav-guide' },
        { tourId: 'nav-profile' },
      ]);

    case 'org_commercial':
      return buildSteps([
        { tourId: 'nav-org-commercial' },
        { tourId: 'nav-guide' },
        { tourId: 'nav-profile' },
      ]);

    case 'org_protocol':
      return buildSteps([
        { tourId: 'nav-dashboard' },
        { tourId: 'nav-protocol' },
        { tourId: 'nav-catalogue' },
        { tourId: 'nav-quotes' },
        { tourId: 'nav-reservations' },
        { tourId: 'nav-guide' },
        { tourId: 'nav-profile' },
      ]);

    case 'staff_scope':
    case 'owner':
    case 'org_manager':
      return buildSteps(buildOrgNavTourIds(opts?.workspace, access), copy);

    case 'client':
      return buildSteps([
        { tourId: 'nav-catalogue' },
        { tourId: 'nav-agenda' },
        { tourId: 'nav-tickets' },
        { tourId: 'nav-quotes' },
        { tourId: 'nav-reservations' },
        { tourId: 'nav-guide' },
        { tourId: 'nav-profile' },
      ]);

    default:
      return buildSteps(buildOrgNavTourIds(opts?.workspace, access), copy);
  }
}

export function getProductTour(
  guideId: UserGuideId,
  access?: OrgAccess | null,
  opts?: NavTourOptions,
): ProductTourStep[] {
  if (opts?.variant === 'first-login') return buildFirstLoginTour(guideId, access, opts);
  return buildNavProductTour(guideId, access, opts);
}
