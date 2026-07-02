import fs from 'fs';
import path from 'path';

export type PlanTypeKey = 'FREE' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';

export interface PlanDefinition {
  name: string;
  price: string;
  description: string;
  maxEvents: number;
  maxGuests: number;
  maxTemplates: number;
  customTemplates: boolean;
}

export type PlansConfiguration = Record<PlanTypeKey, PlanDefinition>;

export const PLAN_KEYS: PlanTypeKey[] = ['FREE', 'STANDARD', 'PREMIUM', 'ENTERPRISE'];

const settingsFilePath = path.join(__dirname, 'settings.json');

export function getDefaultPlans(): PlansConfiguration {
  return {
    FREE: {
      name: 'Plan Gratuit',
      price: '0 FC',
      description: "Parfait pour tester l'application ou organiser un petit événement.",
      maxEvents: 3,
      maxGuests: 50,
      maxTemplates: 2,
      customTemplates: false,
    },
    STANDARD: {
      name: 'Plan Standard',
      price: '30.000 FC',
      description: 'Idéal pour les événements de taille moyenne.',
      maxEvents: 8,
      maxGuests: 150,
      maxTemplates: 5,
      customTemplates: false,
    },
    PREMIUM: {
      name: 'Plan Premium',
      price: '80.000 FC',
      description: "Conçu pour les organisateurs réguliers d'événements.",
      maxEvents: 20,
      maxGuests: 500,
      maxTemplates: 10,
      customTemplates: true,
    },
    ENTERPRISE: {
      name: 'Plan Enterprise',
      price: '275.000 FC',
      description: 'Pour les grandes agences événementielles ou besoins sur-mesure.',
      maxEvents: 9999,
      maxGuests: 99999,
      maxTemplates: 9999,
      customTemplates: true,
    },
  };
}

function mergePlan(base: PlanDefinition, override?: Partial<PlanDefinition>): PlanDefinition {
  if (!override) return { ...base };
  return {
    name: override.name ?? base.name,
    price: override.price ?? base.price,
    description: override.description ?? base.description,
    maxEvents: override.maxEvents ?? base.maxEvents,
    maxGuests: override.maxGuests ?? base.maxGuests,
    maxTemplates: override.maxTemplates ?? base.maxTemplates,
    customTemplates: override.customTemplates ?? base.customTemplates,
  };
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
  return plans[planKey as PlanTypeKey] || plans.FREE;
}

export function mergePlansForSave(incomingPlans: Partial<Record<PlanTypeKey, Partial<PlanDefinition>>>): PlansConfiguration {
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
