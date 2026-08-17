/** Réduction appliquée à la facturation annuelle (équivalent mensuel affiché). */
export const ANNUAL_DISCOUNT_PERCENT = 10;

export type PlanAudience = 'B2B' | 'B2C' | 'VENUE' | 'SERVICE' | 'CATALOG';

export type PlanTypeKey =
  | 'FREE'
  | 'PERSONAL'
  | 'STANDARD'
  | 'PREMIUM_1'
  | 'PREMIUM_2'
  | 'ENTERPRISE_1'
  | 'ENTERPRISE_2'
  | 'ENTERPRISE_3'
  | 'VENUE'
  | 'SERVICE'
  | 'CATALOG';

export interface PlanDefinition {
  name: string;
  price: string;
  monthlyPriceFc: number;
  /** Promotion active — prix réduit affiché sur la landing et appliqué par défaut à la facturation. */
  promoActive?: boolean;
  promoPrice?: string;
  promoMonthlyPriceFc?: number;
  promoLabel?: string;
  description: string;
  /** B2B = organisations. B2C = particuliers. VENUE / SERVICE / CATALOG = catalogue salles & prestas. */
  audience: PlanAudience;
  maxEvents: number;
  maxGuests: number;
  maxTemplates: number;
  maxRooms: number;
  maxServices: number;
  maxOrgManagers: number;
  customTemplates: boolean;
  mockupOcr: boolean;
  protocolQr: boolean;
  seatNotifications: boolean;
  roomThemesFixtures: boolean;
  adminReports: boolean;
  roomEditorLevel: 'basic' | 'standard' | 'advanced' | 'complete';
  commercialNetwork: boolean;
  supportLevel: 'community' | 'email' | 'priority' | 'dedicated' | 'sla247';
}

export type PlansConfiguration = Record<PlanTypeKey, PlanDefinition>;

export const PLAN_KEYS: PlanTypeKey[] = [
  'FREE',
  'PERSONAL',
  'STANDARD',
  'PREMIUM_1',
  'PREMIUM_2',
  'ENTERPRISE_1',
  'ENTERPRISE_2',
  'ENTERPRISE_3',
  'VENUE',
  'SERVICE',
  'CATALOG',
];

export const B2C_PLAN_KEYS: PlanTypeKey[] = ['PERSONAL'];
export const VENDOR_PLAN_KEYS: PlanTypeKey[] = ['VENUE', 'SERVICE', 'CATALOG'];
export const B2B_PLAN_KEYS: PlanTypeKey[] = PLAN_KEYS.filter(
  (k) => k !== 'PERSONAL' && !VENDOR_PLAN_KEYS.includes(k),
);

export const PAID_PLAN_KEYS: PlanTypeKey[] = PLAN_KEYS.filter((k) => k !== 'FREE');

/** Cache hydraté depuis la table SubscriptionPlan (démarrage serveur / save admin). */
let plansCache: PlansConfiguration | null = null;

export function setPlansCache(plans: PlansConfiguration): void {
  plansCache = plans;
}

export function getCachedPlansConfiguration(): PlansConfiguration {
  return plansCache ?? getDefaultPlans();
}

export function parsePlanAudience(raw?: string | null): PlanAudience {
  if (raw === 'B2C' || raw === 'VENUE' || raw === 'SERVICE' || raw === 'CATALOG') return raw;
  return 'B2B';
}

export function formatPlanPriceFc(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FC`;
}

export function annualMonthlyEquivalent(monthlyFc: number): string {
  const discounted = Math.round(monthlyFc * (1 - ANNUAL_DISCOUNT_PERCENT / 100));
  return formatPlanPriceFc(discounted);
}

function organizerPlan(
  rest: Omit<PlanDefinition, 'maxServices'> & { maxServices?: number },
): PlanDefinition {
  return { ...rest, maxServices: rest.maxServices ?? 9999 };
}

export function getDefaultPlans(): PlansConfiguration {
  return {
    FREE: organizerPlan({
      name: 'Essentials',
      price: '0 FC',
      monthlyPriceFc: 0,
      description: 'Découverte : tester EventMaster (organisation ou 1 salle / 1 prestation).',
      audience: 'B2B',
      maxEvents: 3,
      maxGuests: 50,
      maxTemplates: 2,
      maxRooms: 1,
      maxServices: 1,
      maxOrgManagers: 1,
      customTemplates: false,
      mockupOcr: false,
      protocolQr: false,
      seatNotifications: false,
      roomThemesFixtures: false,
      adminReports: false,
      roomEditorLevel: 'basic',
      commercialNetwork: false,
      supportLevel: 'community',
    }),
    PERSONAL: organizerPlan({
      name: 'Particulier',
      price: '20.000 FC',
      monthlyPriceFc: 20000,
      description:
        'Abonnement B2C : mariage, anniversaire ou fête privée. Organisation complète (QR, modèles, éditeur 2D), 3 événements, 200 invités, 2 salles de plan de table — sans publication catalogue.',
      audience: 'B2C',
      maxEvents: 3,
      maxGuests: 200,
      maxTemplates: 9999,
      maxRooms: 2,
      maxServices: 0,
      maxOrgManagers: 1,
      customTemplates: true,
      mockupOcr: true,
      protocolQr: true,
      seatNotifications: true,
      roomThemesFixtures: true,
      adminReports: true,
      roomEditorLevel: 'complete',
      commercialNetwork: false,
      supportLevel: 'email',
    }),
    STANDARD: organizerPlan({
      name: 'Business',
      price: '30.000 FC',
      monthlyPriceFc: 30000,
      description: 'B2B — équipes qui gèrent plusieurs réceptions par an avec protocole QR.',
      audience: 'B2B',
      maxEvents: 8,
      maxGuests: 150,
      maxTemplates: 5,
      maxRooms: 3,
      maxServices: 3,
      maxOrgManagers: 3,
      customTemplates: false,
      mockupOcr: false,
      protocolQr: true,
      seatNotifications: false,
      roomThemesFixtures: true,
      adminReports: false,
      roomEditorLevel: 'standard',
      commercialNetwork: false,
      supportLevel: 'email',
    }),
    PREMIUM_1: organizerPlan({
      name: 'Business Premium 1',
      price: '55.000 FC',
      monthlyPriceFc: 55000,
      description: 'B2B — salles 2D avancées, modèles personnalisés et équipe élargie.',
      audience: 'B2B',
      maxEvents: 12,
      maxGuests: 500,
      maxTemplates: 8,
      maxRooms: 5,
      maxServices: 5,
      maxOrgManagers: 5,
      customTemplates: true,
      mockupOcr: false,
      protocolQr: true,
      seatNotifications: true,
      roomThemesFixtures: true,
      adminReports: false,
      roomEditorLevel: 'advanced',
      commercialNetwork: false,
      supportLevel: 'email',
    }),
    PREMIUM_2: organizerPlan({
      name: 'Business Premium 2',
      price: '85.000 FC',
      monthlyPriceFc: 85000,
      description: 'B2B — protocole complet, notifications siège et gestion multi-salles.',
      audience: 'B2B',
      maxEvents: 20,
      maxGuests: 1000,
      maxTemplates: 10,
      maxRooms: 10,
      maxServices: 8,
      maxOrgManagers: 10,
      customTemplates: true,
      mockupOcr: true,
      protocolQr: true,
      seatNotifications: true,
      roomThemesFixtures: true,
      adminReports: false,
      roomEditorLevel: 'advanced',
      commercialNetwork: false,
      supportLevel: 'priority',
    }),
    ENTERPRISE_1: organizerPlan({
      name: 'Business Enterprise 1',
      price: '350.000 FC',
      monthlyPriceFc: 350000,
      description: 'B2B — grandes organisations : volume élevé, rapports et support prioritaire.',
      audience: 'B2B',
      maxEvents: 40,
      maxGuests: 3500,
      maxTemplates: 18,
      maxRooms: 25,
      maxServices: 15,
      maxOrgManagers: 18,
      customTemplates: true,
      mockupOcr: true,
      protocolQr: true,
      seatNotifications: true,
      roomThemesFixtures: true,
      adminReports: true,
      roomEditorLevel: 'complete',
      commercialNetwork: false,
      supportLevel: 'priority',
    }),
    ENTERPRISE_2: organizerPlan({
      name: 'Business Enterprise 2',
      price: '525.000 FC',
      monthlyPriceFc: 525000,
      description: 'B2B — agences événementielles avec réseau commercial et commissions 30 %.',
      audience: 'B2B',
      maxEvents: 70,
      maxGuests: 5000,
      maxTemplates: 30,
      maxRooms: 50,
      maxServices: 30,
      maxOrgManagers: 30,
      customTemplates: true,
      mockupOcr: true,
      protocolQr: true,
      seatNotifications: true,
      roomThemesFixtures: true,
      adminReports: true,
      roomEditorLevel: 'complete',
      commercialNetwork: true,
      supportLevel: 'dedicated',
    }),
    ENTERPRISE_3: organizerPlan({
      name: 'Business Enterprise 3',
      price: '700.000 FC',
      monthlyPriceFc: 700000,
      description: 'B2B — illimité, multi-agences, SLA 24/7 et onboarding dédié.',
      audience: 'B2B',
      maxEvents: 9999,
      maxGuests: 99999,
      maxTemplates: 9999,
      maxRooms: 9999,
      maxServices: 9999,
      maxOrgManagers: 9999,
      customTemplates: true,
      mockupOcr: true,
      protocolQr: true,
      seatNotifications: true,
      roomThemesFixtures: true,
      adminReports: true,
      roomEditorLevel: 'complete',
      commercialNetwork: true,
      supportLevel: 'sla247',
    }),
    VENUE: {
      name: 'Salle',
      price: '25.000 FC',
      monthlyPriceFc: 25000,
      description:
        'Gestionnaire de salles : publiez jusqu’à 5 lieux, éditeur 2D complet (banquet, tente, custom) et protocole QR sur place.',
      audience: 'VENUE',
      maxEvents: 3,
      maxGuests: 100,
      maxTemplates: 2,
      maxRooms: 5,
      maxServices: 1,
      maxOrgManagers: 3,
      customTemplates: false,
      mockupOcr: false,
      protocolQr: true,
      seatNotifications: true,
      roomThemesFixtures: true,
      adminReports: false,
      roomEditorLevel: 'complete',
      commercialNetwork: false,
      supportLevel: 'email',
    },
    SERVICE: {
      name: 'Prestataire',
      price: '18.000 FC',
      monthlyPriceFc: 18000,
      description:
        'Prestataire : jusqu’à 5 fiches (traiteur, photo, DJ…) avec photos, vidéos, rayon d’intervention et calendrier.',
      audience: 'SERVICE',
      maxEvents: 0,
      maxGuests: 0,
      maxTemplates: 0,
      maxRooms: 0,
      maxServices: 5,
      maxOrgManagers: 2,
      customTemplates: false,
      mockupOcr: false,
      protocolQr: false,
      seatNotifications: false,
      roomThemesFixtures: false,
      adminReports: false,
      roomEditorLevel: 'basic',
      commercialNetwork: false,
      supportLevel: 'email',
    },
    CATALOG: {
      name: 'Salle & presta',
      price: '35.000 FC',
      monthlyPriceFc: 35000,
      description:
        'Les deux : 5 salles (éditeur complet) et 5 prestations, pour les lieux qui proposent aussi un service.',
      audience: 'CATALOG',
      maxEvents: 3,
      maxGuests: 100,
      maxTemplates: 2,
      maxRooms: 5,
      maxServices: 5,
      maxOrgManagers: 3,
      customTemplates: false,
      mockupOcr: false,
      protocolQr: true,
      seatNotifications: true,
      roomThemesFixtures: true,
      adminReports: false,
      roomEditorLevel: 'complete',
      commercialNetwork: false,
      supportLevel: 'email',
    },
  };
}

export function mergePlan(base: PlanDefinition, override?: Partial<PlanDefinition>): PlanDefinition {
  if (!override) return { ...base };
  const merged = {
    name: override.name ?? base.name,
    price: override.price ?? base.price,
    monthlyPriceFc: override.monthlyPriceFc ?? base.monthlyPriceFc,
    promoActive: override.promoActive ?? base.promoActive ?? false,
    promoPrice: override.promoPrice ?? base.promoPrice,
    promoMonthlyPriceFc: override.promoMonthlyPriceFc ?? base.promoMonthlyPriceFc,
    promoLabel: override.promoLabel ?? base.promoLabel,
    description: override.description ?? base.description,
    audience: override.audience ?? base.audience,
    maxEvents: override.maxEvents ?? base.maxEvents,
    maxGuests: override.maxGuests ?? base.maxGuests,
    maxTemplates: override.maxTemplates ?? base.maxTemplates,
    maxRooms: override.maxRooms ?? base.maxRooms,
    maxServices: override.maxServices ?? base.maxServices,
    maxOrgManagers: override.maxOrgManagers ?? base.maxOrgManagers,
    customTemplates: override.customTemplates ?? base.customTemplates,
    mockupOcr: override.mockupOcr ?? base.mockupOcr,
    protocolQr: override.protocolQr ?? base.protocolQr,
    seatNotifications: override.seatNotifications ?? base.seatNotifications,
    roomThemesFixtures: override.roomThemesFixtures ?? base.roomThemesFixtures,
    adminReports: override.adminReports ?? base.adminReports,
    roomEditorLevel: override.roomEditorLevel ?? base.roomEditorLevel,
    commercialNetwork: override.commercialNetwork ?? base.commercialNetwork,
    supportLevel: override.supportLevel ?? base.supportLevel,
  };
  if (override.price && !override.monthlyPriceFc) {
    const digits = override.price.replace(/[^\d]/g, '');
    merged.monthlyPriceFc = digits ? parseInt(digits, 10) : base.monthlyPriceFc;
  }
  if (override.promoPrice && override.promoMonthlyPriceFc === undefined) {
    const digits = override.promoPrice.replace(/[^\d]/g, '');
    merged.promoMonthlyPriceFc = digits ? parseInt(digits, 10) : base.promoMonthlyPriceFc;
  }
  return merged;
}

export function getCatalogMonthlyPriceFc(planKey: string): number {
  return getPlanLimits(planKey).monthlyPriceFc;
}

export function getEffectiveMonthlyPriceFc(planKey: string): number {
  const plan = getPlanLimits(planKey);
  if (plan.promoActive && plan.promoMonthlyPriceFc != null && plan.promoMonthlyPriceFc >= 0) {
    return plan.promoMonthlyPriceFc;
  }
  return plan.monthlyPriceFc;
}

export function getPlansConfiguration(): PlansConfiguration {
  // Source de vérité runtime : cache BD. Fallback : défauts code.
  return getCachedPlansConfiguration();
}

export function getPlanLimits(planKey: string): PlanDefinition {
  const plans = getPlansConfiguration();
  const normalized = normalizePlanKey(planKey);
  return plans[normalized] || plans.FREE;
}

/**
 * Quotas effectifs : l’essai FREE d’un vendeur n’ouvre pas l’organisation d’événements.
 * Un compte client n’a aucun quota SaaS.
 */
export function applyAccountKindToPlan(
  plan: PlanDefinition,
  kind?: string | null,
  planKey?: string,
): PlanDefinition {
  if (kind === 'CLIENT') {
    return {
      ...plan,
      maxEvents: 0,
      maxGuests: 0,
      maxTemplates: 0,
      maxRooms: 0,
      maxServices: 0,
      maxOrgManagers: 0,
    };
  }
  if (kind === 'VENDOR' && planKey && normalizePlanKey(planKey) === 'FREE') {
    return {
      ...plan,
      maxEvents: 0,
      maxGuests: 0,
      maxTemplates: 0,
      description: 'Essai catalogue : 1 salle et 1 prestation, sans organisation d’événements.',
    };
  }
  return plan;
}

export function getPlanLimitsForTenant(planKey: string, accountKind?: string | null): PlanDefinition {
  const normalized = normalizePlanKey(planKey);
  return applyAccountKindToPlan(getPlanLimits(normalized), accountKind, normalized);
}

export function mergePlansForSave(
  incomingPlans: Partial<Record<PlanTypeKey, Partial<PlanDefinition>>>,
): PlansConfiguration {
  const defaults = getDefaultPlans();
  const current = getPlansConfiguration();
  const merged = { ...current };

  for (const key of PLAN_KEYS) {
    merged[key] = mergePlan(defaults[key], {
      ...current[key],
      ...(incomingPlans[key] || {}),
    });
  }

  return merged;
}

export function isPaidPlan(planKey: string): boolean {
  return planKey !== 'FREE' && PLAN_KEYS.includes(planKey as PlanTypeKey);
}

const B2B_PAID_KEYS: PlanTypeKey[] = B2B_PLAN_KEYS.filter((k) => k !== 'FREE');

/** Forfaits payants proposés selon le type de compte (essai FREE exclu). */
export function paidPlanKeysForAccountKind(kind?: string | null): PlanTypeKey[] {
  switch (kind) {
    case 'CLIENT':
      return [];
    case 'VENDOR':
      return [...VENDOR_PLAN_KEYS];
    case 'BOTH':
      return ['PERSONAL', ...VENDOR_PLAN_KEYS, ...B2B_PAID_KEYS];
    case 'ORGANIZER':
    default:
      return ['PERSONAL', ...B2B_PAID_KEYS];
  }
}

export function isPlanAllowedForAccountKind(planKey: string, kind?: string | null): boolean {
  const normalized = normalizePlanKey(planKey);
  if (normalized === 'FREE') return true;
  return paidPlanKeysForAccountKind(kind).includes(normalized);
}

/** Type de compte à poser quand un admin assigne un forfait. */
export function accountKindForPlanAssignment(
  planKey: string,
  currentKind?: string | null,
): 'ORGANIZER' | 'VENDOR' | 'BOTH' | 'CLIENT' {
  const normalized = normalizePlanKey(planKey);
  if (currentKind === 'CLIENT' && normalized === 'FREE') return 'CLIENT';
  if (currentKind && isPlanAllowedForAccountKind(normalized, currentKind)) {
    return currentKind as 'ORGANIZER' | 'VENDOR' | 'BOTH' | 'CLIENT';
  }
  if (normalized === 'VENUE' || normalized === 'SERVICE') return 'VENDOR';
  if (normalized === 'CATALOG') return 'BOTH';
  if (normalized === 'PERSONAL') return 'ORGANIZER';
  if (currentKind === 'VENDOR' || currentKind === 'BOTH') return 'BOTH';
  return 'ORGANIZER';
}

export function planAudienceMismatchMessage(planKey: string, kind?: string | null): string {
  if (kind === 'CLIENT') {
    return 'Un compte client ne souscrit pas d’abonnement SaaS. Passez organisateur ou prestataire dans Mon compte, puis choisissez un forfait.';
  }
  const plan = getPlanLimits(planKey);
  if (kind === 'VENDOR') {
    return `Le forfait ${plan.name} n’est pas destiné aux comptes catalogue. Choisissez Salle, Prestataire ou Salle & presta.`;
  }
  return `Le forfait ${plan.name} n’est pas destiné à ce type de compte. Choisissez un forfait adapté (organisation ou catalogue).`;
}

/** Rétrocompatibilité : anciens identifiants Prisma */
export function normalizePlanKey(planKey: string): PlanTypeKey {
  const legacy: Record<string, PlanTypeKey> = {
    PREMIUM: 'PREMIUM_2',
    ENTERPRISE: 'ENTERPRISE_2',
  };
  if (legacy[planKey]) return legacy[planKey];
  if (PLAN_KEYS.includes(planKey as PlanTypeKey)) return planKey as PlanTypeKey;
  return 'FREE';
}
