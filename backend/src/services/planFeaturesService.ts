import { prisma } from '../db';
import { getPlanLimits, PlanDefinition, formatPlanPriceFc } from '../config/plansConfig';

export type PlanFeatureKey =
  | 'protocolQr'
  | 'seatNotifications'
  | 'customTemplates'
  | 'roomThemesFixtures'
  | 'commercialNetwork'
  | 'adminReports';

const ROOM_TYPES_BY_LEVEL: Record<PlanDefinition['roomEditorLevel'], string[]> = {
  basic: ['SIMPLE'],
  standard: ['SIMPLE', 'BANQUET', 'CONFERENCE'],
  advanced: ['SIMPLE', 'BANQUET', 'CONFERENCE', 'AMPHITHEATER', 'TENT'],
  complete: ['SIMPLE', 'BANQUET', 'CONFERENCE', 'AMPHITHEATER', 'TENT', 'CUSTOM'],
};

export interface TenantPlanSnapshot {
  plan: string;
  planName: string;
  features: PlanDefinition;
  usage: {
    events: number;
    guests: number;
    templates: number;
    rooms: number;
    orgManagers: number;
  };
}

export function planHasFeature(plan: PlanDefinition, feature: PlanFeatureKey): boolean {
  return Boolean(plan[feature]);
}

export function isRoomTypeAllowed(plan: PlanDefinition, roomType: string): boolean {
  const allowed = ROOM_TYPES_BY_LEVEL[plan.roomEditorLevel] || ROOM_TYPES_BY_LEVEL.basic;
  return allowed.includes(roomType);
}

export function allowsRoomBlueprint(plan: PlanDefinition, roomType: string): boolean {
  if (roomType === 'SIMPLE') return false;
  if (roomType === 'CUSTOM') return plan.roomEditorLevel === 'complete';
  return plan.roomEditorLevel !== 'basic';
}

export async function getTenantPlanSnapshot(tenantId: string): Promise<TenantPlanSnapshot | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      _count: { select: { events: true, templates: true, rooms: true } },
    },
  });

  if (!tenant) return null;

  const features = getPlanLimits(tenant.plan);

  const guestCount = await prisma.guest.count({
    where: { event: { tenantId } },
  });

  const orgManagers = await prisma.user.count({
    where: { tenantId, role: 'USER', orgRole: 'MANAGER' },
  });

  return {
    plan: tenant.plan,
    planName: features.name,
    features,
    usage: {
      events: tenant._count.events,
      guests: guestCount,
      templates: tenant._count.templates,
      rooms: tenant._count.rooms,
      orgManagers: orgManagers + (tenant.managerId ? 1 : 0),
    },
  };
}

export class PlanFeatureError extends Error {
  statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'PlanFeatureError';
  }
}

export async function assertPlanFeature(tenantId: string, feature: PlanFeatureKey): Promise<PlanDefinition> {
  const snapshot = await getTenantPlanSnapshot(tenantId);
  if (!snapshot) throw new PlanFeatureError('Organisation introuvable.');
  if (!planHasFeature(snapshot.features, feature)) {
    throw new PlanFeatureError(
      `Fonctionnalité non incluse dans votre forfait ${snapshot.planName}. Passez à un forfait supérieur.`,
    );
  }
  return snapshot.features;
}

export async function assertRoomQuota(tenantId: string): Promise<void> {
  const snapshot = await getTenantPlanSnapshot(tenantId);
  if (!snapshot) throw new PlanFeatureError('Organisation introuvable.');
  const max = snapshot.features.maxRooms;
  if (max >= 9999) return;
  if (snapshot.usage.rooms >= max) {
    throw new PlanFeatureError(
      `Quota de salles atteint (${max} max pour ${snapshot.planName}). Passez à un forfait supérieur.`,
    );
  }
}

export async function assertOrgManagerQuota(tenantId: string, addingManager = true): Promise<void> {
  if (!addingManager) return;
  const snapshot = await getTenantPlanSnapshot(tenantId);
  if (!snapshot) throw new PlanFeatureError('Organisation introuvable.');
  const max = snapshot.features.maxOrgManagers;
  if (max >= 9999) return;
  if (snapshot.usage.orgManagers >= max) {
    throw new PlanFeatureError(
      `Quota de managers organisation atteint (${max} max pour ${snapshot.planName}). Passez à un forfait supérieur.`,
    );
  }
}

export async function assertRoomTypeForPlan(tenantId: string, roomType: string): Promise<PlanDefinition> {
  const snapshot = await getTenantPlanSnapshot(tenantId);
  if (!snapshot) throw new PlanFeatureError('Organisation introuvable.');
  if (!isRoomTypeAllowed(snapshot.features, roomType)) {
    throw new PlanFeatureError(
      `Le type de salle « ${roomType} » n'est pas disponible avec le forfait ${snapshot.planName}.`,
    );
  }
  return snapshot.features;
}

export function formatPlanFeaturesResponse(snapshot: TenantPlanSnapshot) {
  const f = snapshot.features;
  return {
    plan: snapshot.plan,
    planName: snapshot.planName,
    price: f.price,
    description: f.description,
    usage: snapshot.usage,
    limits: {
      maxEvents: f.maxEvents,
      maxGuests: f.maxGuests,
      maxTemplates: f.maxTemplates,
      maxRooms: f.maxRooms,
      maxOrgManagers: f.maxOrgManagers,
    },
    capabilities: {
      protocolQr: f.protocolQr,
      seatNotifications: f.seatNotifications,
      customTemplates: f.customTemplates,
      roomThemesFixtures: f.roomThemesFixtures,
      commercialNetwork: f.commercialNetwork,
      adminReports: f.adminReports,
      roomEditorLevel: f.roomEditorLevel,
      allowedRoomTypes: ROOM_TYPES_BY_LEVEL[f.roomEditorLevel],
      supportLevel: f.supportLevel,
    },
    formattedLimits: {
      maxEvents: f.maxEvents >= 9999 ? 'Illimité' : String(f.maxEvents),
      maxGuests: f.maxGuests >= 99999 ? 'Illimité' : String(f.maxGuests),
      maxTemplates: f.maxTemplates >= 9999 ? 'Illimité' : String(f.maxTemplates),
      maxRooms: f.maxRooms >= 9999 ? 'Illimité' : String(f.maxRooms),
      maxOrgManagers: f.maxOrgManagers >= 9999 ? 'Illimité' : String(f.maxOrgManagers),
      price: formatPlanPriceFc(f.monthlyPriceFc),
    },
  };
}
