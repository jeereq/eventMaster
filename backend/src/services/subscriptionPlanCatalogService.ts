import { PlanType, type SubscriptionPlan } from '@prisma/client';
import { prisma } from '../db';
import {
  getDefaultPlans,
  PLAN_KEYS,
  type PlanDefinition,
  type PlanTypeKey,
  type PlansConfiguration,
  mergePlan,
  setPlansCache,
  getCachedPlansConfiguration,
} from '../config/plansConfig';

const PLAN_SORT_ORDER: Record<PlanTypeKey, number> = {
  FREE: 0,
  STANDARD: 1,
  PREMIUM_1: 2,
  PREMIUM_2: 3,
  ENTERPRISE_1: 4,
  ENTERPRISE_2: 5,
  ENTERPRISE_3: 6,
};

export function rowToPlanDefinition(row: SubscriptionPlan): PlanDefinition {
  return {
    name: row.name,
    price: row.price,
    monthlyPriceFc: row.monthlyPriceFc,
    promoActive: row.promoActive,
    promoPrice: row.promoPrice ?? undefined,
    promoMonthlyPriceFc: row.promoMonthlyPriceFc ?? undefined,
    promoLabel: row.promoLabel ?? undefined,
    description: row.description,
    maxEvents: row.maxEvents,
    maxGuests: row.maxGuests,
    maxTemplates: row.maxTemplates,
    maxRooms: row.maxRooms,
    maxOrgManagers: row.maxOrgManagers,
    customTemplates: row.customTemplates,
    mockupOcr: row.mockupOcr,
    protocolQr: row.protocolQr,
    seatNotifications: row.seatNotifications,
    roomThemesFixtures: row.roomThemesFixtures,
    adminReports: row.adminReports,
    roomEditorLevel: row.roomEditorLevel as PlanDefinition['roomEditorLevel'],
    commercialNetwork: row.commercialNetwork,
    supportLevel: row.supportLevel as PlanDefinition['supportLevel'],
  };
}

export function planDefinitionToDbData(key: PlanTypeKey, def: PlanDefinition) {
  return {
    name: def.name,
    price: def.price,
    monthlyPriceFc: def.monthlyPriceFc,
    promoActive: Boolean(def.promoActive),
    promoPrice: def.promoPrice ?? null,
    promoMonthlyPriceFc: def.promoMonthlyPriceFc ?? null,
    promoLabel: def.promoLabel ?? null,
    description: def.description,
    maxEvents: def.maxEvents,
    maxGuests: def.maxGuests,
    maxTemplates: def.maxTemplates,
    maxRooms: def.maxRooms,
    maxOrgManagers: def.maxOrgManagers,
    customTemplates: def.customTemplates,
    mockupOcr: def.mockupOcr,
    protocolQr: def.protocolQr,
    seatNotifications: def.seatNotifications,
    roomThemesFixtures: def.roomThemesFixtures,
    adminReports: def.adminReports,
    roomEditorLevel: def.roomEditorLevel,
    commercialNetwork: def.commercialNetwork,
    supportLevel: def.supportLevel,
    sortOrder: PLAN_SORT_ORDER[key],
    isActive: true,
  };
}

function rowsToConfiguration(rows: SubscriptionPlan[]): PlansConfiguration {
  const defaults = getDefaultPlans();
  const result = { ...defaults };

  for (const row of rows) {
    const key = row.id as PlanTypeKey;
    if (!PLAN_KEYS.includes(key)) continue;
    result[key] = rowToPlanDefinition(row);
  }

  return result;
}

/** Charge le catalogue depuis la BD (ou seed des défauts si vide) et met à jour le cache. */
export async function loadSubscriptionPlansFromDb(): Promise<PlansConfiguration> {
  const count = await prisma.subscriptionPlan.count();
  if (count === 0) {
    console.log('[SubscriptionPlan] Catalogue vide — seed des forfaits par défaut…');
    await seedDefaultSubscriptionPlans();
  }

  const rows = await prisma.subscriptionPlan.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  const config = rowsToConfiguration(rows);
  setPlansCache(config);
  console.log(`[SubscriptionPlan] ${rows.length} forfait(s) chargés depuis la base.`);
  return config;
}

export async function seedDefaultSubscriptionPlans(): Promise<void> {
  const defaults = getDefaultPlans();
  for (const key of PLAN_KEYS) {
    const data = planDefinitionToDbData(key, defaults[key]);
    await prisma.subscriptionPlan.upsert({
      where: { id: key as PlanType },
      create: { id: key as PlanType, ...data },
      update: {},
    });
  }
}

/** Persiste un catalogue complet (admin) et rafraîchit le cache. */
export async function saveSubscriptionPlansToDb(
  incoming: Partial<Record<PlanTypeKey, Partial<PlanDefinition>>>,
): Promise<PlansConfiguration> {
  const defaults = getDefaultPlans();
  const current = getCachedPlansConfiguration();
  const merged: PlansConfiguration = { ...current };

  for (const key of PLAN_KEYS) {
    merged[key] = mergePlan(defaults[key], {
      ...current[key],
      ...(incoming[key] || {}),
    });

    const data = planDefinitionToDbData(key, merged[key]);
    await prisma.subscriptionPlan.upsert({
      where: { id: key as PlanType },
      create: { id: key as PlanType, ...data },
      update: data,
    });
  }

  setPlansCache(merged);
  return merged;
}
