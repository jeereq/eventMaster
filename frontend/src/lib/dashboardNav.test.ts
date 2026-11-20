import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { OrgAccess } from '@/context/AuthContext';
import type { WorkspaceModules } from '@/lib/planAccess';
import {
  buildDashboardNav,
  navItemIsActive,
  navTourTabs,
  type DashboardNavInput,
  type NavItem,
  type NavSection,
} from './dashboardNav.ts';

const ALL_MODULES: WorkspaceModules = {
  showEvents: true,
  showRooms: true,
  showMarketplace: true,
  showBrowseCatalogue: true,
  showTemplates: true,
  showAnalytics: true,
  showProtocol: true,
  showTeam: true,
};

const OWNER: OrgAccess = {
  level: 'owner',
  orgRole: null,
  isOwner: true,
  canManageTeam: true,
  canManageRooms: true,
  canCreateEvents: true,
  canCreateRooms: true,
  canManageAllEvents: true,
  canProtocolAllEvents: true,
  canViewBilling: true,
  canViewInvoices: true,
  isProtocolOnly: false,
};

const PROFILES: Record<string, DashboardNavInput> = {
  superAdmin: { role: 'SUPER_ADMIN', workspace: ALL_MODULES, isClientAccount: false, adminCounts: { pendingRequests: 1, unpaidInvoices: 2, licensesExpiring: 3, saasPayoutsDue: 4 } },
  commercial: { role: 'COMMERCIAL', workspace: ALL_MODULES, isClientAccount: false },
  orgCommercial: { role: 'USER', access: { ...OWNER, level: 'commercial', isOwner: false, orgRole: 'COMMERCIAL' }, workspace: ALL_MODULES, isClientAccount: false },
  protocol: { role: 'USER', access: { ...OWNER, level: 'protocol', isOwner: false, orgRole: 'PROTOCOL', isProtocolOnly: true }, workspace: ALL_MODULES, isClientAccount: false },
  client: { role: 'USER', access: { ...OWNER, level: 'client', isOwner: false }, workspace: ALL_MODULES, isClientAccount: true },
  vendor: { role: 'USER', access: OWNER, workspace: ALL_MODULES, accountKind: 'VENDOR', isClientAccount: false, venuePlan: true },
  b2c: { role: 'USER', access: OWNER, workspace: ALL_MODULES, accountKind: 'ORGANIZER', tenantPlan: 'PERSONAL', isClientAccount: false },
  b2b: { role: 'USER', access: OWNER, workspace: ALL_MODULES, accountKind: 'ORGANIZER', tenantPlan: 'STANDARD', audience: 'B2B', isClientAccount: false },
  organizer: { role: 'USER', access: OWNER, workspace: ALL_MODULES, accountKind: 'ORGANIZER', tenantPlan: 'FREE', isClientAccount: false },
};

function items(sections: NavSection[]): NavItem[] {
  return sections.flatMap((section) => section.items);
}

function isActive(item: NavItem, url: string): boolean {
  const [pathname, search = ''] = url.split('?');
  const tab = new URLSearchParams(search).get('tab') || 'overview';
  return navItemIsActive(pathname, search, item, tab);
}

describe('menu du dashboard', () => {
  it('n’a plus d’entrée « Mon compte » : le pied profil porte nav-profile', () => {
    for (const [name, input] of Object.entries(PROFILES)) {
      const all = items(buildDashboardNav(input));
      assert.ok(!all.some((item) => item.tourId === 'nav-profile' || item.href === '/dashboard/profile'), name);
    }
  });

  it('n’a plus d’entrée « Guide utilisateur » : la visite se lance depuis Mon compte', () => {
    for (const [name, input] of Object.entries(PROFILES)) {
      const all = items(buildDashboardNav(input));
      assert.ok(!all.some((item) => item.tourId === 'nav-guide' || item.href === '/dashboard/guide'), name);
      assert.ok(!navTourTabs(buildDashboardNav(input)).some((tab) => tab.tourId === 'nav-guide'), name);
    }
  });

  it('regroupe Paiements, Versements, Dons et Jetons IA du Super Admin', () => {
    const all = items(buildDashboardNav(PROFILES.superAdmin));
    const payments = all.filter((item) => item.href.startsWith('/dashboard/admin/') && /payments|payouts|donations|ai-tokens/.test(item.href));
    assert.equal(payments.length, 1);
    const [entry] = payments;
    assert.equal(entry.name, 'Paiements');
    assert.equal(entry.href, '/dashboard/admin/payments');
    assert.equal(entry.tourId, 'nav-payments-admin');
    assert.equal(entry.badge, 4);
    for (const url of [
      '/dashboard/admin/payments',
      '/dashboard/admin/payouts',
      '/dashboard/admin/donations',
      '/dashboard/admin/ai-tokens',
      '/dashboard/admin/payouts/abc',
      '/dashboard/admin/ai-tokens/user/1',
    ]) {
      assert.ok(isActive(entry, url), url);
    }
    assert.ok(!isActive(entry, '/dashboard/admin/catalogue'));
    for (const id of ['nav-payouts', 'nav-donations-admin', 'nav-ai-tokens']) {
      assert.ok(!all.some((item) => item.tourId === id), id);
    }
    // La file Factures du Super Admin reste une entrée à part.
    assert.ok(all.some((item) => item.tourId === 'nav-invoices' && item.href === '/dashboard?tab=invoices'));
  });

  it('range les factures dans Forfait quand les deux droits sont accordés', () => {
    for (const name of ['vendor', 'b2c', 'b2b', 'organizer']) {
      const all = items(buildDashboardNav(PROFILES[name]));
      const billing = all.filter((item) => item.href === '/dashboard/billing' || item.href === '/dashboard/invoices');
      assert.equal(billing.length, 1, name);
      assert.equal(billing[0].name, 'Forfait');
      for (const url of ['/dashboard/billing', '/dashboard/billing?tab=invoices', '/dashboard/invoices']) {
        assert.ok(isActive(billing[0], url), `${name} ${url}`);
      }
    }
  });

  it('garde « Factures » seule quand seul le droit factures est accordé', () => {
    const all = items(buildDashboardNav({ ...PROFILES.b2b, access: { ...OWNER, canViewBilling: false } }));
    assert.ok(!all.some((item) => item.href === '/dashboard/billing'));
    const invoices = all.find((item) => item.href === '/dashboard/invoices');
    assert.equal(invoices?.name, 'Factures');
    assert.equal(invoices?.tourId, 'nav-invoices');
  });
});

describe('visite guidée du menu', () => {
  it('suit l’ordre du menu de chaque profil, puis le pied profil', () => {
    for (const [name, input] of Object.entries(PROFILES)) {
      const sections = buildDashboardNav(input);
      const menuOrder = [...new Set(items(sections).map((item) => item.tourId).filter(Boolean))];
      const tourOrder = navTourTabs(sections).map((tab) => tab.tourId);
      assert.deepEqual(tourOrder, [...menuOrder, 'nav-profile'], name);
    }
  });
});
