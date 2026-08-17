import type { OrgAccess } from '@/context/AuthContext';
import type { UserGuideId } from '@/config/userGuides';
import { FINISH_STEP, NAV_TOUR_META, WELCOME_STEP } from '@/config/navTourMeta';
import type { ProductTourStep } from '@/config/productTours';

function tabStep(tourId: string, routeOverride?: string): ProductTourStep | null {
  const meta = NAV_TOUR_META[tourId];
  if (!meta) return null;
  return {
    id: tourId,
    title: meta.title,
    description: meta.description,
    route: routeOverride ?? meta.route,
    target: tourId,
  };
}

function pushTab(steps: ProductTourStep[], tourId: string, routeOverride?: string) {
  const step = tabStep(tourId, routeOverride);
  if (step) steps.push(step);
}

function buildSteps(tabs: Array<{ tourId: string; route?: string }>): ProductTourStep[] {
  const steps: ProductTourStep[] = [
    {
      id: WELCOME_STEP.id,
      title: WELCOME_STEP.title,
      description: WELCOME_STEP.description,
      route: WELCOME_STEP.route,
    },
  ];

  for (const tab of tabs) {
    pushTab(steps, tab.tourId, tab.route);
  }

  steps.push({
    id: FINISH_STEP.id,
    title: FINISH_STEP.title,
    description: FINISH_STEP.description,
    route: FINISH_STEP.route,
    target: FINISH_STEP.target,
  });

  return steps;
}

/** Ordre des onglets par profil — aligné sur dashboard/layout.tsx */
export function buildNavProductTour(
  guideId: UserGuideId,
  access?: OrgAccess | null,
): ProductTourStep[] {
  if (guideId === 'guest') return [];

  switch (guideId) {
    case 'super_admin':
      return buildSteps([
        { tourId: 'nav-tenants' },
        { tourId: 'nav-users' },
        { tourId: 'nav-events-admin' },
        { tourId: 'nav-guests' },
        { tourId: 'nav-templates' },
        { tourId: 'nav-message-templates' },
        { tourId: 'nav-analytics' },
        { tourId: 'nav-subscription-requests' },
        { tourId: 'nav-subscription-plans' },
        { tourId: 'nav-invoices' },
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
        { tourId: 'nav-events' },
        { tourId: 'nav-protocol' },
        { tourId: 'nav-guide' },
        { tourId: 'nav-profile' },
      ]);

    case 'staff_scope': {
      const tabs: Array<{ tourId: string; route?: string }> = [{ tourId: 'nav-events' }];
      if (access?.canProtocolAllEvents || access?.level === 'staff') {
        tabs.push({ tourId: 'nav-protocol' });
      }
      tabs.push({ tourId: 'nav-guide' }, { tourId: 'nav-profile' });
      return buildSteps(tabs);
    }

    case 'client':
      return buildSteps([
        { tourId: 'nav-catalogue' },
        { tourId: 'nav-bookings' },
        { tourId: 'nav-guide' },
        { tourId: 'nav-profile' },
      ]);

    case 'owner': {
      const tabs: Array<{ tourId: string; route?: string }> = [
        { tourId: 'nav-dashboard' },
        { tourId: 'nav-events' },
      ];
      if (access?.canProtocolAllEvents) tabs.push({ tourId: 'nav-protocol' });
      tabs.push(
        { tourId: 'nav-analytics-org' },
        { tourId: 'nav-templates', route: '/dashboard/templates' },
      );
      if (access?.canViewBilling) tabs.push({ tourId: 'nav-billing' });
      if (access?.canViewInvoices) tabs.push({ tourId: 'nav-invoices', route: '/dashboard/invoices' });
      tabs.push({ tourId: 'nav-guide' }, { tourId: 'nav-profile' });
      return buildSteps(tabs);
    }

    case 'org_manager':
    default: {
      const tabs: Array<{ tourId: string; route?: string }> = [
        { tourId: 'nav-dashboard' },
        { tourId: 'nav-events' },
      ];
      if (access?.canProtocolAllEvents) tabs.push({ tourId: 'nav-protocol' });
      tabs.push(
        { tourId: 'nav-analytics-org' },
        { tourId: 'nav-templates', route: '/dashboard/templates' },
      );
      if (access?.canViewInvoices) tabs.push({ tourId: 'nav-invoices', route: '/dashboard/invoices' });
      tabs.push({ tourId: 'nav-guide' }, { tourId: 'nav-profile' });
      return buildSteps(tabs);
    }
  }
}

export function getProductTour(
  guideId: UserGuideId,
  access?: OrgAccess | null,
): ProductTourStep[] {
  return buildNavProductTour(guideId, access);
}
