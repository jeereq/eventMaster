import fs from 'fs';
import path from 'path';

/** Réduction appliquée à la facturation annuelle (équivalent mensuel affiché). */
export const ANNUAL_DISCOUNT_PERCENT = 10;

export type PlanTypeKey =
  | 'FREE'
  | 'STANDARD'
  | 'PREMIUM_1'
  | 'PREMIUM_2'
  | 'ENTERPRISE_1'
  | 'ENTERPRISE_2'
  | 'ENTERPRISE_3';

export interface PlanDefinition {
  name: string;
  price: string;
  monthlyPriceFc: number;
  description: string;
  maxEvents: number;
  maxGuests: number;
  maxTemplates: number;
  maxRooms: number;
  maxOrgManagers: number;
  customTemplates: boolean;
  protocolQr: boolean;
  roomEditorLevel: 'basic' | 'standard' | 'advanced' | 'complete';
  commercialNetwork: boolean;
  supportLevel: 'community' | 'email' | 'priority' | 'dedicated' | 'sla247';
}

export type PlansConfiguration = Record<PlanTypeKey, PlanDefinition>;

export const PLAN_KEYS: PlanTypeKey[] = [
  'FREE',
  'STANDARD',
  'PREMIUM_1',
  'PREMIUM_2',
  'ENTERPRISE_1',
  'ENTERPRISE_2',
  'ENTERPRISE_3',
];

export const PAID_PLAN_KEYS: PlanTypeKey[] = PLAN_KEYS.filter((k) => k !== 'FREE');

const settingsFilePath = path.join(__dirname, 'settings.json');

export function formatPlanPriceFc(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FC`;
}

export function annualMonthlyEquivalent(monthlyFc: number): string {
  const discounted = Math.round(monthlyFc * (1 - ANNUAL_DISCOUNT_PERCENT / 100));
  return formatPlanPriceFc(discounted);
}

export function getDefaultPlans(): PlansConfiguration {
  return {
    FREE: {
      name: 'Essentials',
      price: '0 FC',
      monthlyPriceFc: 0,
      description: "Découvrir EventMaster et organiser un premier événement.",
      maxEvents: 3,
      maxGuests: 50,
      maxTemplates: 2,
      maxRooms: 1,
      maxOrgManagers: 1,
      customTemplates: false,
      protocolQr: false,
      roomEditorLevel: 'basic',
      commercialNetwork: false,
      supportLevel: 'community',
    },
    STANDARD: {
      name: 'Business',
      price: '30.000 FC',
      monthlyPriceFc: 30000,
      description: 'Équipes qui gèrent plusieurs réceptions par an avec protocole QR.',
      maxEvents: 8,
      maxGuests: 150,
      maxTemplates: 5,
      maxRooms: 3,
      maxOrgManagers: 3,
      customTemplates: false,
      protocolQr: true,
      roomEditorLevel: 'standard',
      commercialNetwork: false,
      supportLevel: 'email',
    },
    PREMIUM_1: {
      name: 'Business Premium 1',
      price: '55.000 FC',
      monthlyPriceFc: 55000,
      description: 'Salles 2D avancées, modèles personnalisés et équipe élargie.',
      maxEvents: 12,
      maxGuests: 300,
      maxTemplates: 8,
      maxRooms: 5,
      maxOrgManagers: 5,
      customTemplates: true,
      protocolQr: true,
      roomEditorLevel: 'advanced',
      commercialNetwork: false,
      supportLevel: 'email',
    },
    PREMIUM_2: {
      name: 'Business Premium 2',
      price: '85.000 FC',
      monthlyPriceFc: 85000,
      description: 'Protocole complet, notifications siège et gestion multi-salles.',
      maxEvents: 20,
      maxGuests: 500,
      maxTemplates: 10,
      maxRooms: 10,
      maxOrgManagers: 10,
      customTemplates: true,
      protocolQr: true,
      roomEditorLevel: 'advanced',
      commercialNetwork: false,
      supportLevel: 'priority',
    },
    ENTERPRISE_1: {
      name: 'Business Enterprise 1',
      price: '175.000 FC',
      monthlyPriceFc: 175000,
      description: 'Grandes organisations : volume, rapports et support prioritaire.',
      maxEvents: 35,
      maxGuests: 1200,
      maxTemplates: 15,
      maxRooms: 20,
      maxOrgManagers: 15,
      customTemplates: true,
      protocolQr: true,
      roomEditorLevel: 'complete',
      commercialNetwork: false,
      supportLevel: 'priority',
    },
    ENTERPRISE_2: {
      name: 'Business Enterprise 2',
      price: '275.000 FC',
      monthlyPriceFc: 275000,
      description: 'Agences événementielles avec réseau commercial et commissions 20 %.',
      maxEvents: 60,
      maxGuests: 2500,
      maxTemplates: 25,
      maxRooms: 40,
      maxOrgManagers: 25,
      customTemplates: true,
      protocolQr: true,
      roomEditorLevel: 'complete',
      commercialNetwork: true,
      supportLevel: 'dedicated',
    },
    ENTERPRISE_3: {
      name: 'Business Enterprise 3',
      price: '425.000 FC',
      monthlyPriceFc: 425000,
      description: 'Illimité, multi-agences, SLA 24/7 et onboarding dédié.',
      maxEvents: 9999,
      maxGuests: 99999,
      maxTemplates: 9999,
      maxRooms: 9999,
      maxOrgManagers: 9999,
      customTemplates: true,
      protocolQr: true,
      roomEditorLevel: 'complete',
      commercialNetwork: true,
      supportLevel: 'sla247',
    },
  };
}

function mergePlan(base: PlanDefinition, override?: Partial<PlanDefinition>): PlanDefinition {
  if (!override) return { ...base };
  const merged = {
    name: override.name ?? base.name,
    price: override.price ?? base.price,
    monthlyPriceFc: override.monthlyPriceFc ?? base.monthlyPriceFc,
    description: override.description ?? base.description,
    maxEvents: override.maxEvents ?? base.maxEvents,
    maxGuests: override.maxGuests ?? base.maxGuests,
    maxTemplates: override.maxTemplates ?? base.maxTemplates,
    maxRooms: override.maxRooms ?? base.maxRooms,
    maxOrgManagers: override.maxOrgManagers ?? base.maxOrgManagers,
    customTemplates: override.customTemplates ?? base.customTemplates,
    protocolQr: override.protocolQr ?? base.protocolQr,
    roomEditorLevel: override.roomEditorLevel ?? base.roomEditorLevel,
    commercialNetwork: override.commercialNetwork ?? base.commercialNetwork,
    supportLevel: override.supportLevel ?? base.supportLevel,
  };
  if (override.price && !override.monthlyPriceFc) {
    const digits = override.price.replace(/[^\d]/g, '');
    merged.monthlyPriceFc = digits ? parseInt(digits, 10) : base.monthlyPriceFc;
  }
  return merged;
}

export function getPlansConfiguration(): PlansConfiguration {
  const defaults = getDefaultPlans();

  try {
    if (fs.existsSync(settingsFilePath)) {
      const settings = JSON.parse(fs.readFileSync(settingsFilePath, 'utf-8'));
      if (settings.plans && typeof settings.plans === 'object') {
        const merged = { ...defaults };
        for (const key of PLAN_KEYS) {
          merged[key] = mergePlan(defaults[key], settings.plans[key]);
        }
        return merged;
      }
    }
  } catch (error) {
    console.error('[Plans Config] Erreur de lecture settings.json:', error);
  }

  return defaults;
}

export function getPlanLimits(planKey: string): PlanDefinition {
  const plans = getPlansConfiguration();
  const normalized = normalizePlanKey(planKey);
  return plans[normalized] || plans.FREE;
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
