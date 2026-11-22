/**
 * Construction du menu du dashboard (sections, entrées, état actif), partagée entre
 * dashboard/layout.tsx et la visite guidée (buildNavProductTour.ts) pour qu'ils suivent
 * le même ordre. Module sans React : les icônes sont désignées par leur nom.
 */
import type { CommercialGrantedPermissions, OrgAccess } from '@/context/AuthContext';
import type { WorkspaceModules } from '@/lib/planAccess';
import type { AdminPendingCounts } from '@/components/admin/useAdminPendingCounts';
import { isB2cPlanId } from '../config/landingPricing.ts';

export type NavIconName =
 | 'LayoutDashboard' | 'BarChart3' | 'Calendar' | 'Ticket' | 'ScanLine' | 'Mail' | 'Store'
 | 'Sparkles' | 'Inbox' | 'CalendarCheck' | 'Building2' | 'Briefcase' | 'Rss' | 'Users'
 | 'CreditCard' | 'FileText' | 'Bell' | 'Clock' | 'Heart' | 'LayoutGrid'
 | 'MessageSquare' | 'Key' | 'ScrollText';

export interface NavItem {
 name: string;
 href: string;
 tab?: string;
 tourId?: string;
 /** Texte d’aide pour l’infobulle */
 description?: string;
 icon: NavIconName;
 /** Pastille « à traiter » (ex. demandes en attente) */
 badge?: number;
 /** Autres adresses (et leurs sous-chemins) regroupées sous cette entrée. */
 activePaths?: string[];
}

export interface NavSection {
 label?: string;
 items: NavItem[];
}

export function navItemIsActive(pathname: string, search: string, item: NavItem, currentTab: string) {
 if (item.tab) return pathname === '/dashboard' && currentTab === item.tab;
 if (item.activePaths?.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
 const qIndex = item.href.indexOf('?');
 const path = qIndex >= 0 ? item.href.slice(0, qIndex) : item.href;
 const query = qIndex >= 0 ? item.href.slice(qIndex + 1) : '';
 const have = new URLSearchParams(search);
 const protocolDeskActive =
  pathname === '/dashboard/protocol'
  || ((pathname === '/dashboard/events' || pathname.startsWith('/dashboard/events/'))
    && have.get('mode') === 'protocol');

 // Entrée dédiée /dashboard/protocol + desk events?mode=protocol
 if (path === '/dashboard/protocol' || (path === '/dashboard/events' && new URLSearchParams(query).get('mode') === 'protocol')) {
  return protocolDeskActive;
 }

 const pathMatch = pathname === path || (path !== '/dashboard' && pathname.startsWith(`${path}/`)) || pathname.startsWith(`${path}?`);
 // /dashboard/events et /dashboard/events/:id
 const eventsPathMatch =
  path === '/dashboard/events' &&
  (pathname === '/dashboard/events' || pathname.startsWith('/dashboard/events/'));
 const effectivePathMatch = path === '/dashboard/events' ? eventsPathMatch : pathMatch;
 if (!effectivePathMatch) return false;
 if (item.href === '/dashboard/billing' && pathname.startsWith('/dashboard/billing/')) return false;
 if (query) {
  const want = new URLSearchParams(query);
  for (const [key, value] of want.entries()) {
   if (key === 'tab' && path === '/dashboard/bookings') continue;
   if (have.get(key) !== value) return false;
  }
  // Réservations vs packs/favoris (même path /dashboard/bookings)
  if (path === '/dashboard/bookings' && want.has('tab')) {
   const haveTab = have.get('tab') || 'bookings';
   if (haveTab !== want.get('tab')) return false;
  }
  // Onglets Catalogue (hub=plan vs tab=plan)
  if (path === '/dashboard/catalogue' && (want.has('tab') || want.has('hub'))) {
   const wantTab = want.get('hub') || want.get('tab');
   const haveTab = have.get('hub') || have.get('tab') || 'explore';
   if (haveTab !== wantTab) return false;
   return true;
  }
  return pathname === path || (path === '/dashboard/events' && eventsPathMatch);
 }
 // « Événements » (sans mode) : pas actif quand on est en desk protocole
 if (path === '/dashboard/events' && !query) {
  if (have.get('mode') === 'protocol') return false;
 }
 if (path === '/dashboard/bookings' && pathname === '/dashboard/bookings') {
  return true;
 }
 if (path === '/dashboard/catalogue' && pathname === '/dashboard/catalogue') {
  if (have.get('kind') === 'event') return false;
  const currentTab = have.get('hub') || have.get('tab') || 'explore';
  if (currentTab !== 'explore') return false;
  return true;
 }
 return true;
}

function navSection(label: string | undefined, items: NavItem[]): NavSection | null {
 return items.length ? { label, items } : null;
}

function buildNavSections(...sections: Array<NavSection | null>): NavSection[] {
 return sections.filter((section): section is NavSection => Boolean(section?.items.length));
}

/**
 * Forfait et factures : réservés aux profils qui y ont accès, rangés avec les paramètres du compte.
 * Avec les deux droits, une seule entrée « Forfait » : les factures sont un onglet de la page Forfait.
 */
function billingNavItems(access?: OrgAccess | null): NavItem[] {
 if (access?.canViewBilling && access?.canViewInvoices) {
  return [{ name: 'Forfait', href: '/dashboard/billing', tourId: 'nav-billing', icon: 'CreditCard' as const, activePaths: ['/dashboard/invoices'] }];
 }
 return [
  ...(access?.canViewBilling
   ? [{ name: 'Forfait', href: '/dashboard/billing', tourId: 'nav-billing', icon: 'CreditCard' as const }]
   : []),
  ...(access?.canViewInvoices
   ? [{ name: 'Factures', href: '/dashboard/invoices', tourId: 'nav-invoices', icon: 'FileText' as const }]
   : []),
 ];
}

function compteNavItems(extra: NavItem[] = []): NavItem[] {
 return [
  ...extra,
  { name: 'Notifications', href: '/dashboard/notifications', tourId: 'nav-notifications', icon: 'Bell' as const },
 ];
}

/**
 * Organisateur B2B (forfaits Business, Premium, Entreprise) : menu rangé par métier,
 * du pilotage au jour J, puis achats, vitrine et administration de l’organisation.
 */
function buildB2bOrganizerNav(opts: {
 access?: OrgAccess | null;
 workspace: WorkspaceModules;
 allStudiosBlocked?: boolean;
}): NavSection[] {
 const { access, workspace, allStudiosBlocked } = opts;
 return buildNavSections(
  navSection('Pilotage', [
   { name: 'Tableau de bord', href: '/dashboard', tourId: 'nav-dashboard', icon: 'LayoutDashboard' as const, description: 'À traiter, indicateurs et agenda de l’organisation' },
   ...(workspace.showAnalytics
    ? [{ name: 'Statistiques', href: '/dashboard/analytics', tourId: 'nav-analytics-org', icon: 'BarChart3' as const, description: 'Réponses, présences et check-in par événement' }]
    : []),
  ]),
  navSection('Événements', [
   ...(workspace.showEvents
    ? [
      { name: 'Événements', href: '/dashboard/events', tourId: 'nav-events', icon: 'Calendar' as const, description: 'Créer, suivre et gérer les invités' },
      { name: 'Billetterie', href: '/dashboard/tickets', tourId: 'nav-tickets-org', icon: 'Ticket' as const, description: 'Commandes, recettes et contrôle d’accès' },
     ]
    : []),
   ...(workspace.showProtocol
    ? [{ name: 'Protocole', href: '/dashboard/protocol', tourId: 'nav-protocol', icon: 'ScanLine' as const, description: 'Scan QR et accueil le jour J' }]
    : []),
   ...(workspace.showTemplates
    ? [{ name: 'Modèles', href: '/dashboard/templates', tourId: 'nav-templates', icon: 'Mail' as const, description: 'Invitations et faire-part' }]
    : []),
  ]),
  navSection('Achats & prestataires', [
   { name: 'Explorer', href: '/dashboard/catalogue', tourId: 'nav-catalogue', icon: 'Store' as const, description: 'Salles, prestataires, matériel & équipements' },
   ...(!allStudiosBlocked
    ? [{ name: 'Simulateur', href: '/dashboard/catalogue?tab=plan&planView=ai', tourId: 'nav-simulator-org', icon: 'Sparkles' as const, description: 'Budget IA, formules clés en main et devis' }]
    : []),
   { name: 'Demandes de devis', href: '/dashboard/quotes', tourId: 'nav-quotes', icon: 'Inbox' as const, description: 'Devis demandés et reçus' },
   { name: 'Réservations', href: '/dashboard/bookings?tab=bookings', tourId: 'nav-reservations', icon: 'CalendarCheck' as const, description: 'Réservations de salles et prestations' },
  ]),
  navSection('Vitrine', [
   ...(workspace.showRooms
    ? [{ name: 'Salles', href: '/dashboard/rooms', tourId: 'nav-rooms', icon: 'Building2' as const, description: 'Plans 2D / 3D et publication au catalogue' }]
    : []),
   ...(workspace.showMarketplace
    ? [{ name: 'Mes offres', href: '/dashboard/marketplace', tourId: 'nav-marketplace', icon: 'Briefcase' as const, description: 'Fiches vendeur publiées au catalogue' }]
    : []),
   { name: 'Réalisations', href: '/dashboard/publications', tourId: 'nav-publications', icon: 'Rss' as const, description: 'Photos et actualités de vos événements' },
  ]),
  navSection('Organisation', [
   ...(workspace.showTeam
    ? [{ name: 'Équipe', href: '/dashboard/team', tourId: 'nav-team', icon: 'Users' as const, description: 'Managers, protocole et droits d’accès' }]
    : []),
  ]),
  navSection('Paramètres', compteNavItems(billingNavItems(access))),
 );
}

export interface DashboardNavInput {
 role?: string;
 access?: OrgAccess | null;
 workspace: WorkspaceModules;
 accountKind?: string | null;
 isClientAccount: boolean;
 commercialNetwork?: boolean;
 tenantPlan?: string | null;
 audience?: string | null;
 commercialPermissions?: CommercialGrantedPermissions | null;
 allStudiosBlocked?: boolean;
 adminCounts?: AdminPendingCounts;
 /** Le forfait inclut des salles (indépendamment des droits du membre connecté). */
 venuePlan?: boolean;
}

/** Le forfait inclut des salles : audience salle / catalogue, ou quota de salles (modules en secours tant que les quotas ne sont pas chargés). */
export function isVenuePlan(opts: {
 audience?: string | null;
 maxRooms?: number | null;
 quotaLoaded: boolean;
 workspace: WorkspaceModules;
}): boolean {
 return opts.audience === 'VENUE'
  || opts.audience === 'CATALOG'
  || (opts.quotaLoaded ? (opts.maxRooms ?? 0) > 0 : opts.workspace.showRooms);
}

export function buildDashboardNav(opts: DashboardNavInput): NavSection[] {
 const { role, access, workspace, accountKind, isClientAccount, tenantPlan, audience, commercialPermissions, allStudiosBlocked, adminCounts, venuePlan } = opts;
 const vendorOnly = accountKind === 'VENDOR';
 // Le type salle / prestataire dépend du forfait, pas des droits du membre : un membre
 // d'un compte Salle sans droit de gestion reste dans un espace « salle ».
 const isServiceProvider =
  tenantPlan === 'SERVICE' ||
  audience === 'SERVICE' ||
  (vendorOnly && !venuePlan);

 if (role === 'SUPER_ADMIN') {
  return buildNavSections(
   navSection('Pilotage', [
    { name: 'Accueil', href: '/dashboard?tab=overview', tab: 'overview', tourId: 'nav-overview', icon: 'LayoutDashboard' as const, description: 'Ce qui attend une action aujourd’hui' },
    { name: 'Analyses', href: '/dashboard?tab=analytics&section=overview', tab: 'analytics', tourId: 'nav-analytics', icon: 'BarChart3' as const },
   ]),
   navSection('Organisations', [
    { name: 'Organisations', href: '/dashboard?tab=tenants', tab: 'tenants', tourId: 'nav-tenants', icon: 'Building2' as const, badge: adminCounts?.licensesExpiring },
    { name: 'Utilisateurs', href: '/dashboard?tab=users', tab: 'users', tourId: 'nav-users', icon: 'Users' as const },
    { name: 'Événements', href: '/dashboard/admin/events', tourId: 'nav-events-admin', icon: 'Calendar' as const, description: 'Événements de toutes les organisations' },
    { name: 'Invités', href: '/dashboard/admin/guests', tourId: 'nav-guests', icon: 'Users' as const, description: 'Invités de toutes les organisations' },
   ]),
   navSection('Facturation', [
    { name: 'Demandes abonnement', href: '/dashboard?tab=subscription-requests', tab: 'subscription-requests', tourId: 'nav-subscription-requests', icon: 'Clock' as const, badge: adminCounts?.pendingRequests },
    { name: 'Factures', href: '/dashboard?tab=invoices', tab: 'invoices', tourId: 'nav-invoices', icon: 'FileText' as const, badge: adminCounts?.unpaidInvoices },
    {
     name: 'Paiements',
     href: '/dashboard/admin/payments',
     tourId: 'nav-payments-admin',
     icon: 'CreditCard' as const,
     badge: adminCounts?.saasPayoutsDue,
     activePaths: ['/dashboard/admin/payouts', '/dashboard/admin/donations', '/dashboard/admin/ai-tokens'],
    },
    { name: 'Forfaits & tarifs', href: '/dashboard?tab=subscription-plans', tab: 'subscription-plans', tourId: 'nav-subscription-plans', icon: 'CreditCard' as const },
   ]),
   navSection('Contenu & vitrine', [
    { name: 'Modèles invitation', href: '/dashboard?tab=templates', tab: 'templates', tourId: 'nav-templates', icon: 'FileText' as const },
    { name: 'Plans 2D / 3D vitrine', href: '/plans-3d', tourId: 'nav-showcase-plans', icon: 'LayoutGrid' as const, description: 'Gestion et édition des plans 2D/3D affichés en vitrine' },
    { name: 'Messages automatiques', href: '/dashboard?tab=message-templates', tab: 'message-templates', tourId: 'nav-message-templates', icon: 'MessageSquare' as const },
    { name: 'Catalogue', href: '/dashboard/admin/catalogue', tourId: 'nav-catalog-admin', icon: 'Store' as const },
    { name: 'Prix du marché', href: '/dashboard/admin/market-prices', tourId: 'nav-market-prices', icon: 'BarChart3' as const, description: 'Prix hors marketplace utilisés par le simulateur de budget' },
   ]),
   navSection('Système', [
    { name: 'Réglages plateforme', href: '/dashboard?tab=settings', tab: 'settings', tourId: 'nav-settings', icon: 'Key' as const },
    { name: 'Journal d’audit', href: '/dashboard/audit', tourId: 'nav-audit', icon: 'ScrollText' as const },
   ]),
   navSection('Compte', compteNavItems()),
  );
 }

 if (role === 'COMMERCIAL') {
  const delegatedItems: NavItem[] = [];
  if (commercialPermissions?.canManageTemplates) {
   delegatedItems.push({
    name: 'Modèles invitation',
    href: '/dashboard?tab=templates',
    tab: 'templates',
    tourId: 'nav-templates',
    icon: 'FileText' as const,
    description: 'Conception et modification des modèles d’invitation',
   });
  }
  if (commercialPermissions?.canManageMessageTemplates) {
   delegatedItems.push({
    name: 'Messages automatiques',
    href: '/dashboard?tab=message-templates',
    tab: 'message-templates',
    tourId: 'nav-message-templates',
    icon: 'MessageSquare' as const,
    description: 'Modèles WhatsApp et e-mail de rappel',
   });
  }
  if (commercialPermissions?.canManageCatalog) {
   delegatedItems.push({
    name: 'Catalogue plateforme',
    href: '/dashboard/admin/catalogue',
    tourId: 'nav-catalog-admin',
    icon: 'Store' as const,
    description: 'Modération des prestataires et offres',
   });
  }
  if (commercialPermissions?.canManageEvents) {
   delegatedItems.push({
    name: 'Événements plateforme',
    href: '/dashboard/admin/events',
    tourId: 'nav-events-admin',
    icon: 'Calendar' as const,
    description: 'Supervision des événements créés',
   });
  }
  if (commercialPermissions?.canManageGuests) {
   delegatedItems.push({
    name: 'Invités plateforme',
    href: '/dashboard/admin/guests',
    tourId: 'nav-guests',
    icon: 'Users' as const,
    description: 'Supervision des listes d’invités',
   });
  }
  if (commercialPermissions?.canManageShowcasePlans) {
   delegatedItems.push({
    name: 'Plans 2D / 3D vitrine',
    href: '/plans-3d',
    tourId: 'nav-showcase-plans',
    icon: 'LayoutGrid' as const,
    description: 'Gestion, édition et sélection des plans 2D/3D vitrine',
   });
  }

  return buildNavSections(
   navSection('Portefeuille', [
    { name: 'Organisations', href: '/dashboard?tab=tenants', tab: 'tenants', tourId: 'nav-tenants', icon: 'Building2' as const },
    { name: 'Demandes abonnement', href: '/dashboard?tab=subscription-requests', tab: 'subscription-requests', tourId: 'nav-subscription-requests', icon: 'Clock' as const },
    { name: 'Factures', href: '/dashboard?tab=invoices', tab: 'invoices', tourId: 'nav-invoices', icon: 'FileText' as const },
   ]),
   delegatedItems.length ? navSection('Accès réservés délégués', delegatedItems) : null,
   navSection('Gains', [
    { name: 'Parrainage & commissions', href: '/dashboard/commercial', tourId: 'nav-commercial', icon: 'Briefcase' as const },
   ]),
   navSection('Compte', compteNavItems()),
  );
 }

 if (access?.level === 'commercial') {
  return buildNavSections(
   navSection('Réseau', [
    { name: 'Réseau commercial', href: '/dashboard/org-commercial', tourId: 'nav-org-commercial', icon: 'Briefcase' as const },
   ]),
   navSection('Compte', compteNavItems()),
  );
 }

 if (access?.isProtocolOnly) {
  return buildNavSections(
   navSection('Accueil', [
    { name: 'Tableau de bord', href: '/dashboard', tourId: 'nav-dashboard', icon: 'LayoutDashboard' as const, description: 'Accueils du jour, check-in et tâches' },
   ]),
   navSection('Jour J', [
    { name: 'Protocole', href: '/dashboard/protocol', tourId: 'nav-protocol', icon: 'ScanLine' as const, description: 'Accueil QR, événements et tâches du jour' },
   ]),
   navSection('Marketplace', [
    { name: 'Explorer', href: '/dashboard/catalogue', tourId: 'nav-catalogue', icon: 'Store' as const, description: 'Salles, prestataires et matériel & équipements — comme le catalogue client' },
    { name: 'Réalisations', href: '/dashboard/publications', tourId: 'nav-publications', icon: 'Rss' as const, description: 'Photos et actualités des salles et prestations' },
    { name: 'Demandes de devis', href: '/dashboard/quotes', tourId: 'nav-quotes', icon: 'Inbox' as const },
    { name: 'Réservations', href: '/dashboard/bookings?tab=bookings', tourId: 'nav-reservations', icon: 'CalendarCheck' as const },
   ]),
   navSection('Suivi', [
    { name: 'Statistiques', href: '/dashboard/analytics', tourId: 'nav-analytics-org', icon: 'BarChart3' as const },
   ]),
   navSection('Compte', compteNavItems()),
  );
 }

 if (isClientAccount) {
  return buildNavSections(
   navSection('Mon Espace', [
    { name: 'Accueil', href: '/dashboard', tourId: 'nav-client-dashboard', icon: 'LayoutDashboard' as const, description: 'Ce qui vous attend, vos activités et la recherche rapide' },
    { name: 'Explorer', href: '/dashboard/catalogue', tourId: 'nav-catalogue', icon: 'Store' as const, description: 'Salles, prestataires, matériel & équipements et fiches publiques' },
    { name: 'Événements', href: '/dashboard/catalogue?kind=event', tourId: 'nav-agenda', icon: 'Calendar' as const, description: 'Événements publics du marketplace — inscriptions et billets' },
    ...(!allStudiosBlocked ? [{ name: 'Simulateur', href: '/dashboard/catalogue?tab=plan&planView=ai', tourId: 'nav-simulator', icon: 'Sparkles' as const, description: 'Simulateur budget IA, assemblage de packs et devis groupés' }] : []),
   ]),
   navSection('Mes activités', [
    { name: 'Demandes de devis', href: '/dashboard/quotes', tourId: 'nav-quotes', icon: 'Inbox' as const, description: 'Devis reçus et échanges avec les prestataires' },
    { name: 'Réservations', href: '/dashboard/bookings?tab=bookings', tourId: 'nav-reservations', icon: 'CalendarCheck' as const, description: 'Dates confirmées et acomptes' },
    { name: 'Mes billets', href: '/dashboard/tickets', tourId: 'nav-tickets', icon: 'Ticket' as const, description: 'Inscriptions, filtres, vue grille/liste et badges QR' },
    { name: 'Mes favoris', href: '/dashboard/catalogue?tab=favorites', tourId: 'nav-favorites', icon: 'Heart' as const, description: 'Salles et prestataires mis de côté' },
    { name: 'Réalisations', href: '/dashboard/publications', tourId: 'nav-publications', icon: 'Rss' as const, description: 'Fil des réalisations des salles et prestations' },
   ]),
   navSection('Compte', compteNavItems()),
  );
 }

	if (isServiceProvider || vendorOnly) {
		// Salle ou prestataire : le travail du jour d’abord (devis, réservations),
		// puis la vitrine, le suivi, le réseau ; l’abonnement passe en bas.
		const venue = !isServiceProvider && workspace.showRooms;
		const activityItems: NavItem[] = [
			{
				name: 'Demandes de devis',
				href: '/dashboard/quotes',
				tourId: 'nav-quotes',
				icon: 'Inbox' as const,
				description: 'Demandes reçues des clients et organisateurs : répondre, chiffrer',
			},
			{
				name: 'Réservations & planning',
				href: '/dashboard/bookings?tab=bookings',
				tourId: 'nav-reservations',
				icon: 'CalendarCheck' as const,
				description: 'Dates confirmées, acomptes et disponibilités',
			},
		];

		const showcaseItems: NavItem[] = [
			...(venue
				? [{ name: 'Mes salles', href: '/dashboard/rooms', tourId: 'nav-rooms', icon: 'Building2' as const, description: 'Fiches catalogue, plans 2D/3D et staff de vos salles' }]
				: []),
			...((workspace.showMarketplace || isServiceProvider) && access?.canManageRooms
				? [{
					name: venue ? 'Mes offres' : 'Mes prestations',
					href: '/dashboard/marketplace',
					tourId: 'nav-marketplace',
					icon: 'Briefcase' as const,
					description: 'Publier et gérer vos fiches vendeur (traiteur, déco, DJ, photo, matériel…)',
				}]
				: []),
			{
				name: 'Réalisations',
				href: '/dashboard/publications',
				tourId: 'nav-publications',
				icon: 'Rss' as const,
				description: 'Photos de vos derniers événements, visibles dans le catalogue',
			},
		];

		const eventItems: NavItem[] = [
			...(workspace.showEvents
				? [
					{ name: 'Événements', href: '/dashboard/events', tourId: 'nav-events', icon: 'Calendar' as const },
					{ name: 'Billetterie', href: '/dashboard/tickets', tourId: 'nav-tickets-org', icon: 'Ticket' as const },
				]
				: []),
			...(workspace.showProtocol
				? [{ name: 'Protocole', href: '/dashboard/protocol', tourId: 'nav-protocol', icon: 'ScanLine' as const }]
				: []),
			...(workspace.showTemplates
				? [{ name: 'Modèles', href: '/dashboard/templates', tourId: 'nav-templates', icon: 'Mail' as const }]
				: []),
		];

		const networkItems: NavItem[] = [
			{
				name: 'Explorer le catalogue',
				href: '/dashboard/catalogue',
				tourId: 'nav-catalogue',
				icon: 'Store' as const,
				description: 'Salles, confrères et équipements du réseau',
			},
			...(!allStudiosBlocked ? [{
				name: 'Simulateur IA',
				href: '/dashboard/catalogue?tab=plan&planView=ai',
				tourId: 'nav-simulator-org',
				icon: 'Sparkles' as const,
				description: 'Simulateur budget IA et packs 3 formules',
			}] : []),
		];

		return buildNavSections(
			navSection('Accueil', [
				{ name: 'Tableau de bord', href: '/dashboard', tourId: 'nav-dashboard', icon: 'LayoutDashboard' as const, description: 'Ce qui attend une réponse aujourd’hui' },
			]),
			navSection('Activité', activityItems),
			navSection('Ma vitrine', showcaseItems),
			navSection('Mes événements', eventItems),
			navSection('Réseau', networkItems),
			navSection('Organisation', [
				...(workspace.showTeam ? [{ name: 'Équipe', href: '/dashboard/team', tourId: 'nav-team', icon: 'Users' as const }] : []),
			]),
			navSection('Paramètres', compteNavItems(billingNavItems(access))),
		);
	}

	// Particulier (B2C) : menu rangé dans l’ordre de préparation d’une fête, sans jargon pro.
	if (!vendorOnly && ((tenantPlan && isB2cPlanId(tenantPlan)) || audience === 'B2C')) {
		return buildNavSections(
			navSection('Accueil', [
				{ name: 'Ma fête', href: '/dashboard', tourId: 'nav-dashboard', icon: 'LayoutDashboard' as const, description: 'Prochaine fête, réponses des invités et étape suivante' },
			]),
			navSection('Préparer', [
				...(workspace.showEvents
					? [{ name: 'Mes fêtes', href: '/dashboard/events', tourId: 'nav-events', icon: 'Calendar' as const, description: 'Invités, faire-part, plan de table et tâches' }]
					: []),
				...(workspace.showRooms
					? [{ name: 'Plans de salle', href: '/dashboard/rooms', tourId: 'nav-rooms', icon: 'Building2' as const, description: 'Tables, allées et décor en 2D / 3D' }]
					: []),
				...(workspace.showTemplates
					? [{ name: 'Faire-part', href: '/dashboard/templates', tourId: 'nav-templates', icon: 'Mail' as const, description: 'Modèles d’invitation' }]
					: []),
				...(workspace.showProtocol
					? [{ name: 'Accueil jour J', href: '/dashboard/protocol', tourId: 'nav-protocol', icon: 'ScanLine' as const, description: 'Scan des QR à l’entrée' }]
					: []),
			]),
			navSection('Prestataires', [
				{ name: 'Salles & prestataires', href: '/dashboard/catalogue', tourId: 'nav-catalogue', icon: 'Store' as const, description: 'Traiteur, déco, DJ, photo, salles' },
				...(!allStudiosBlocked ? [{ name: 'Budget IA', href: '/dashboard/catalogue?tab=plan&planView=ai', tourId: 'nav-simulator-org', icon: 'Sparkles' as const, description: 'Simulateur budget IA et 3 formules' }] : []),
				{ name: 'Demandes de devis', href: '/dashboard/quotes', tourId: 'nav-quotes', icon: 'Inbox' as const },
				{ name: 'Réservations', href: '/dashboard/bookings?tab=bookings', tourId: 'nav-reservations', icon: 'CalendarCheck' as const },
			]),
			navSection('Plus d’outils', [
				...(workspace.showEvents
					? [{ name: 'Billetterie & dons', href: '/dashboard/tickets', tourId: 'nav-tickets-org', icon: 'Ticket' as const, description: 'Entrées payantes et cagnotte' }]
					: []),
				...(workspace.showAnalytics
					? [{ name: 'Statistiques', href: '/dashboard/analytics', tourId: 'nav-analytics-org', icon: 'BarChart3' as const }]
					: []),
				{ name: 'Réalisations', href: '/dashboard/publications', tourId: 'nav-publications', icon: 'Rss' as const, description: 'Photos des salles et prestataires' },
				...(workspace.showTeam
					? [{ name: 'Co-organisateurs', href: '/dashboard/team', tourId: 'nav-team', icon: 'Users' as const, description: 'Famille ou amis qui vous aident' }]
					: []),
			]),
			navSection('Paramètres', compteNavItems(billingNavItems(access))),
		);
	}

	if (audience === 'B2B' && tenantPlan && tenantPlan !== 'FREE' && !vendorOnly && workspace.showEvents) {
		return buildB2bOrganizerNav({ access, workspace, allStudiosBlocked });
	}

	const primarySectionLabel =
		workspace.showEvents && workspace.showRooms
			? 'Événements & Salles'
			: workspace.showEvents
				? 'Événements'
				: workspace.showRooms
					? 'Salles & Espaces'
					: 'Espaces & Activités';

	const primaryItems: NavItem[] = [
		...(workspace.showEvents
			? [{ name: 'Événements', href: '/dashboard/events', tourId: 'nav-events', icon: 'Calendar' as const }]
			: []),
		...(workspace.showRooms
			? [{ name: 'Salles', href: '/dashboard/rooms', tourId: 'nav-rooms', icon: 'Building2' as const }]
			: []),
		...(workspace.showEvents || workspace.showProtocol || access?.isProtocolOnly
			? [
					{
						name: 'Billetterie',
						href: '/dashboard/tickets',
						tourId: 'nav-tickets-org',
						icon: 'Ticket' as const,
						description: 'Commandes, entrées, ventes par zone et contrôle d’accès',
					},
				]
			: []),
		...(workspace.showProtocol
			? [{ name: 'Protocole', href: '/dashboard/protocol', tourId: 'nav-protocol', icon: 'ScanLine' as const }]
			: []),
		...(workspace.showTemplates
			? [{ name: 'Modèles', href: '/dashboard/templates', tourId: 'nav-templates', icon: 'Mail' as const }]
			: []),
		...(workspace.showAnalytics
			? [{ name: 'Statistiques', href: '/dashboard/analytics', tourId: 'nav-analytics-org', icon: 'BarChart3' as const }]
			: []),
	];

	const marketItems: NavItem[] = [
		...(workspace.showBrowseCatalogue
			? [
					{ name: 'Explorer', href: '/dashboard/catalogue', tourId: 'nav-catalogue', icon: 'Store' as const, description: 'Catalogue acheteur : salles, prestataires, matériel & équipements (comme le client)' },
					...(!allStudiosBlocked ? [{ name: 'Simulateur', href: '/dashboard/catalogue?tab=plan&planView=ai', tourId: 'nav-simulator-org', icon: 'Sparkles' as const, description: 'Simulateur budget IA, 3 formules clés en main et devis' }] : []),
					{ name: 'Réalisations', href: '/dashboard/publications', tourId: 'nav-publications', icon: 'Rss' as const, description: 'Grille de réalisations et création de posts liés aux salles / prestations' },
				]
			: []),
		...(workspace.showEvents || workspace.showBrowseCatalogue || vendorOnly
			? [
					{ name: 'Demandes de devis', href: '/dashboard/quotes', tourId: 'nav-quotes', icon: 'Inbox' as const },
					{ name: 'Réservations', href: '/dashboard/bookings?tab=bookings', tourId: 'nav-reservations', icon: 'CalendarCheck' as const },
				]
			: []),
		...(workspace.showMarketplace
			? [{ name: 'Mes offres', href: '/dashboard/marketplace', tourId: 'nav-marketplace', icon: 'Briefcase' as const, description: 'Publier et gérer vos fiches vendeur (salle / prestataire / matériel & équipements)' }]
			: []),
	];

	return buildNavSections(
		navSection('Accueil', [
			{ name: 'Tableau de bord', href: '/dashboard', tourId: 'nav-dashboard', icon: 'LayoutDashboard' as const },
		]),
		navSection(primarySectionLabel, primaryItems),
		navSection(vendorOnly ? 'Offres & Marketplace' : 'Marketplace', marketItems),
		navSection('Organisation', workspace.showTeam
			? [{ name: 'Équipe', href: '/dashboard/team', tourId: 'nav-team', icon: 'Users' as const }]
			: []),
		navSection('Paramètres', compteNavItems(billingNavItems(access))),
	);
}

/** Entrée de visite : identifiant data-tour et adresse de l’entrée du menu qui le porte. */
export interface NavTourTab {
 tourId: string;
 href: string;
}

/**
 * Étapes de la visite guidée, dans l’ordre exact du menu, puis le pied profil
 * (« Mon compte », data-tour nav-profile) qui clôt le menu latéral et le panneau mobile.
 */
export function navTourTabs(sections: NavSection[]): NavTourTab[] {
 const seen = new Set<string>();
 const tabs: NavTourTab[] = [];
 for (const section of sections) {
  for (const item of section.items) {
   if (!item.tourId || seen.has(item.tourId)) continue;
   seen.add(item.tourId);
   tabs.push({ tourId: item.tourId, href: item.href });
  }
 }
 if (!seen.has('nav-profile')) tabs.push({ tourId: 'nav-profile', href: '/dashboard/profile' });
 return tabs;
}
