/** Réduction appliquée à la facturation annuelle (équivalent mensuel affiché). */
export const ANNUAL_DISCOUNT_PERCENT = 10;

export type PlanAudience = 'B2B' | 'B2C' | 'VENUE' | 'SERVICE' | 'CATALOG';

export type PlanTypeKey =
  | 'FREE'
  | 'PERSONAL_50'
  | 'PERSONAL_100'
  | 'PERSONAL_200'
  | 'PERSONAL_PLUS'
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
  'PERSONAL_50',
  'PERSONAL_100',
  'PERSONAL_200',
  'PERSONAL_PLUS',
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

export const B2C_PLAN_KEYS: PlanTypeKey[] = [
  'PERSONAL_50',
  'PERSONAL_100',
  'PERSONAL_200',
  'PERSONAL_PLUS',
];
export const VENDOR_PLAN_KEYS: PlanTypeKey[] = ['VENUE', 'SERVICE', 'CATALOG'];
export const B2B_PLAN_KEYS: PlanTypeKey[] = PLAN_KEYS.filter(
  (k) => !B2C_PLAN_KEYS.includes(k) && !VENDOR_PLAN_KEYS.includes(k),
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
  return { ...rest, maxServices: rest.maxServices ?? 0 };
}

function personalPlan(
  rest: Pick<PlanDefinition, 'name' | 'price' | 'monthlyPriceFc' | 'description' | 'maxGuests'>,
): PlanDefinition {
  return organizerPlan({
    ...rest,
    audience: 'B2C',
    maxEvents: 3,
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
  });
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
    PERSONAL_50: personalPlan({
      name: 'Particulier 50',
      price: '60.000 FC',
      monthlyPriceFc: 60000,
      description:
        'Fête privée jusqu’à 50 invités : organisation complète (QR, modèles, éditeur 2D), 3 événements, 2 salles de plan de table — sans catalogue. Facturation trimestrielle.',
      maxGuests: 50,
    }),
    PERSONAL_100: personalPlan({
      name: 'Particulier 100',
      price: '90.000 FC',
      monthlyPriceFc: 90000,
      description:
        'Fête privée jusqu’à 100 invités : organisation complète (QR, modèles, éditeur 2D), 3 événements, 2 salles de plan de table — sans catalogue. Facturation trimestrielle.',
      maxGuests: 100,
    }),
    PERSONAL_200: personalPlan({
      name: 'Particulier 200',
      price: '120.000 FC',
      monthlyPriceFc: 120000,
      description:
        'Fête privée jusqu’à 200 invités : organisation complète (QR, modèles, éditeur 2D), 3 événements, 2 salles de plan de table — sans catalogue. Facturation trimestrielle.',
      maxGuests: 200,
    }),
    PERSONAL_PLUS: personalPlan({
      name: 'Particulier +200',
      price: '180.000 FC',
      monthlyPriceFc: 180000,
      description:
        'Grande fête privée (plus de 200 invités) : organisation complète, invités illimités, 3 événements, 2 salles de plan de table — sans catalogue. Facturation trimestrielle.',
      maxGuests: 99999,
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
      description: 'B2B — agences événementielles avec réseau commercial (30 % puis 20 %).',
      audience: 'B2B',
      maxEvents: 70,
      maxGuests: 5000,
      maxTemplates: 30,
      maxRooms: 50,
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
      price: '14.900 FC',
      monthlyPriceFc: 14900,
      description:
        'Gestionnaire de salles : publiez jusqu’à 5 lieux, éditeur 2D complet (banquet, tente, custom) et protocole QR sur place — sans prestations marketplace.',
      audience: 'VENUE',
      maxEvents: 3,
      maxGuests: 100,
      maxTemplates: 2,
      maxRooms: 5,
      maxServices: 0,
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
      price: '9.900 FC',
      monthlyPriceFc: 9900,
      description:
        'Prestataire : fiches illimitées (traiteur, photo, DJ…) avec photos, vidéos, rayon d’intervention et calendrier, dès l’abonnement payé.',
      audience: 'SERVICE',
      maxEvents: 0,
      maxGuests: 0,
      maxTemplates: 0,
      maxRooms: 0,
      maxServices: 9999,
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
      price: '19.900 FC',
      monthlyPriceFc: 19900,
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
  if (override.price && override.monthlyPriceFc == null) {
    const digits = override.price.replace(/[^\d]/g, '');
    merged.monthlyPriceFc = digits ? parseInt(digits, 10) : base.monthlyPriceFc;
  }
  merged.price = formatPlanPriceFc(merged.monthlyPriceFc);
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
 * Quotas effectifs : un compte VENDOR (essai ou payant) n’organise pas d’événements.
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
  if (kind === 'VENDOR') {
    const isFree = planKey ? normalizePlanKey(planKey) === 'FREE' : false;
    return {
      ...plan,
      maxEvents: 0,
      maxGuests: 0,
      maxTemplates: 0,
      ...(isFree
        ? { description: 'Essai catalogue : 1 salle et 1 prestation, sans organisation d’événements.' }
        : {}),
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
      return [...B2C_PLAN_KEYS, ...VENDOR_PLAN_KEYS, ...B2B_PAID_KEYS];
    case 'ORGANIZER':
    default:
      return [...B2C_PLAN_KEYS, ...B2B_PAID_KEYS];
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
  if (B2C_PLAN_KEYS.includes(normalized)) return 'ORGANIZER';
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
    PERSONAL: 'PERSONAL_200',
  };
  if (legacy[planKey]) return legacy[planKey];
  if (PLAN_KEYS.includes(planKey as PlanTypeKey)) return planKey as PlanTypeKey;
  return 'FREE';
}

export const MONTH_DURATION_DAYS = 30;
export const QUARTER_DURATION_DAYS = 90;
export const YEAR_DURATION_DAYS = 365;

export function isB2cPlanKey(planKey: string): boolean {
  const normalized = normalizePlanKey(planKey);
  return B2C_PLAN_KEYS.includes(normalized);
}

/** Durée de licence / facture : trimestre B2C, mois sinon — ou durée demandée (ex. annuel 365 j, −10 %). */
export function resolveDurationDaysForPlan(planKey: string, requested?: number | null): number {
  if (requested != null && Number.isFinite(requested) && requested > 0) return requested;
  if (isB2cPlanKey(planKey)) return QUARTER_DURATION_DAYS;
  return MONTH_DURATION_DAYS;
}
