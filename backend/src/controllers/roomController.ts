import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { MarketplaceBookingStatus } from '@prisma/client';
import { resolveOrgAccess, canManageRoom, canAccessRoom } from '../services/permissionsService';
import {
  assertRoomQuota,
  assertRoomTypeForPlan,
  assertPlanFeature,
  allowsRoomBlueprint,
  PlanFeatureError,
} from '../services/planFeaturesService';
import {
  generateRoomBlueprint,
  calculateBlueprintCapacity,
  blueprintToTablePlan,
  RoomType,
  LayoutParams,
} from '../services/roomLayoutService';
import {
  consumeAiSimulationCredit,
  requireAiSimulationCredit,
  AI_ROOM_PLAN_TOKEN_COST,
} from '../services/aiSimulationWalletService';
import {
  analyzeRoomPlanPhoto,
  composeRoomPlanAi,
  normalizeRoomPlanImageUrl,
  rateLimitRoomPlanAi,
} from '../services/roomPlanAiService';
import {
  saveAiRoomPlanComposeRun,
  listAiRoomPlanComposeRuns,
  getAiRoomPlanComposeRun,
  claimDeviceRoomPlanComposeRuns,
  type AiRoomPlanComposeSource,
  type RoomPlanComposeDraft,
} from '../services/aiRoomPlanComposeHistoryService';

async function persistRoomPlanCompose(opts: {
  userId?: string | null;
  deviceId?: string | null;
  source: AiRoomPlanComposeSource;
  prompt?: string | null;
  imageUrl?: string | null;
  roomType?: string | null;
  widthM?: number | null;
  heightM?: number | null;
  draft: RoomPlanComposeDraft;
}) {
  try {
    const saved = await saveAiRoomPlanComposeRun(opts);
    return saved?.id || null;
  } catch (err) {
    console.error('[AiRoomPlanCompose] persist:', err);
    return null;
  }
}

const HOLD_BOOKING_STATUSES: MarketplaceBookingStatus[] = ['REQUESTED', 'ACCEPTED', 'CONFIRMED'];

function blueprintUsesThemesOrFixtures(blueprint: unknown): boolean {
  if (!blueprint || typeof blueprint !== 'object') return false;
  const bp = blueprint as {
    fixtures?: unknown[];
    metadata?: {
      roomThemeId?: string;
      customThemes?: unknown[];
      floorImageUrl?: string | null;
    };
  };
  const themeId = bp.metadata?.roomThemeId;
  if (themeId && themeId !== 'classic') return true;
  if (Array.isArray(bp.metadata?.customThemes) && bp.metadata.customThemes.length > 0) return true;
  if (bp.metadata?.floorImageUrl) return true;
  if (Array.isArray(bp.fixtures) && bp.fixtures.length > 0) return true;
  return false;
}

async function assertThemesFixturesForBlueprint(tenantId: string, blueprint: unknown) {
  if (!blueprintUsesThemesOrFixtures(blueprint)) return;
  await assertPlanFeature(tenantId, 'roomThemesFixtures');
}

function resolveRoomLayout(roomType: string | undefined, layoutParams: LayoutParams | undefined, layoutBlueprint: unknown) {
  const type = (roomType || 'SIMPLE') as RoomType;
  if (layoutBlueprint && typeof layoutBlueprint === 'object') {
    return layoutBlueprint;
  }
  if (type !== 'SIMPLE' && type !== 'CUSTOM') {
    return generateRoomBlueprint(type, layoutParams || {});
  }
  return null;
}

export async function getRooms(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    const access = await resolveOrgAccess(userId, tenantId);
    if (access.level === 'none') {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    const rooms = await prisma.organizationRoom.findMany({
      where: { tenantId },
      include: {
        staff: {
          include: {
            user: { select: { id: true, name: true, email: true, orgRole: true } },
          },
        },
        venueListing: {
          include: {
            bookings: {
              where: { status: { in: HOLD_BOOKING_STATUSES } },
              select: { eventDate: true, eventEndDate: true },
            },
          },
        },
        _count: { select: { events: true } },
      },
      orderBy: { name: 'asc' },
    });

    if (access.canManageRooms) {
      return res.json({ rooms, canManage: true });
    }

    const filtered = [];
    for (const room of rooms) {
      if (await canAccessRoom(userId, tenantId, room.id)) {
        filtered.push(room);
      }
    }

    return res.json({ rooms: filtered, canManage: false });
  } catch (error) {
    console.error('Erreur getRooms:', error);
    return res.status(500).json({ error: 'Impossible de charger les salles.' });
  }
}

export async function createRoom(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canCreateRooms) {
      return res.status(403).json({ error: 'Seuls le propriétaire et les managers org. peuvent créer des salles.' });
    }

    const { name, description, capacity, floor, location, roomType, layoutParams, layoutBlueprint } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Le nom de la salle est requis.' });
    }

    const resolvedType = (roomType || 'SIMPLE') as RoomType;

    try {
      const plan = await assertRoomTypeForPlan(tenantId, resolvedType);
      await assertRoomQuota(tenantId);
      if (layoutBlueprint && !allowsRoomBlueprint(plan, resolvedType)) {
        return res.status(403).json({
          error: `Les plans de salle avancés ne sont pas inclus dans votre forfait ${plan.name}.`,
        });
      }
    } catch (err) {
      if (err instanceof PlanFeatureError) {
        return res.status(403).json({ error: err.message });
      }
      throw err;
    }

    const blueprint = resolveRoomLayout(resolvedType, layoutParams, layoutBlueprint);

    try {
      await assertThemesFixturesForBlueprint(tenantId, blueprint);
    } catch (err) {
      if (err instanceof PlanFeatureError) {
        return res.status(403).json({ error: err.message });
      }
      throw err;
    }
    const computedCapacity = blueprint
      ? calculateBlueprintCapacity(blueprint as any)
      : capacity
        ? parseInt(capacity, 10)
        : null;

    const room = await prisma.organizationRoom.create({
      data: {
        tenantId,
        name: name.trim(),
        description: description || null,
        capacity: computedCapacity,
        floor: floor || null,
        location: location || null,
        roomType: resolvedType,
        layoutBlueprint: blueprint ?? undefined,
      },
    });

    return res.status(201).json(room);
  } catch (error) {
    console.error('Erreur createRoom:', error);
    return res.status(500).json({ error: 'Impossible de créer la salle.' });
  }
}

export async function updateRoom(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const roomId = req.params.roomId as string;
    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    if (!(await canManageRoom(userId, tenantId, roomId))) {
      return res.status(403).json({ error: 'Accès refusé pour modifier cette salle.' });
    }

    const existing = await prisma.organizationRoom.findFirst({ where: { id: roomId, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: 'Salle introuvable.' });
    }

    const { name, description, capacity, floor, location, roomType, layoutParams, layoutBlueprint } = req.body;

    const nextType = roomType !== undefined ? (roomType as RoomType) : (existing.roomType as RoomType);

    try {
      const plan = await assertRoomTypeForPlan(tenantId, nextType);
      if (layoutBlueprint !== undefined && layoutBlueprint && !allowsRoomBlueprint(plan, nextType)) {
        return res.status(403).json({
          error: `Les plans de salle avancés ne sont pas inclus dans votre forfait ${plan.name}.`,
        });
      }
    } catch (err) {
      if (err instanceof PlanFeatureError) {
        return res.status(403).json({ error: err.message });
      }
      throw err;
    }

    let nextBlueprint = existing.layoutBlueprint;
    const layoutChanging =
      layoutBlueprint !== undefined ||
      layoutParams !== undefined ||
      (roomType !== undefined && roomType !== existing.roomType);

    if (layoutBlueprint !== undefined) {
      nextBlueprint = layoutBlueprint;
    } else if (layoutParams !== undefined || (roomType !== undefined && roomType !== existing.roomType)) {
      nextBlueprint = resolveRoomLayout(nextType, layoutParams, null) as typeof existing.layoutBlueprint;
    }

    if (layoutChanging) {
      try {
        await assertThemesFixturesForBlueprint(tenantId, nextBlueprint);
      } catch (err) {
        if (err instanceof PlanFeatureError) {
          return res.status(403).json({ error: err.message });
        }
        throw err;
      }
    }

    const computedCapacity =
      nextBlueprint && typeof nextBlueprint === 'object'
        ? calculateBlueprintCapacity(nextBlueprint as any)
        : capacity !== undefined
          ? capacity
            ? parseInt(capacity, 10)
            : null
          : existing.capacity;

    const room = await prisma.organizationRoom.update({
      where: { id: roomId },
      data: {
        name: name !== undefined ? name : existing.name,
        description: description !== undefined ? description : existing.description,
        capacity: computedCapacity,
        floor: floor !== undefined ? floor : existing.floor,
        location: location !== undefined ? location : existing.location,
        roomType: nextType,
        layoutBlueprint: nextBlueprint === null ? undefined : nextBlueprint,
      },
    });

    return res.json(room);
  } catch (error) {
    console.error('Erreur updateRoom:', error);
    return res.status(500).json({ error: 'Impossible de mettre à jour la salle.' });
  }
}

export async function deleteRoom(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const roomId = req.params.roomId as string;
    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageRooms) {
      return res.status(403).json({ error: 'Seuls le propriétaire et les managers peuvent supprimer des salles.' });
    }

    const existing = await prisma.organizationRoom.findFirst({ where: { id: roomId, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: 'Salle introuvable.' });
    }

    await prisma.organizationRoom.delete({ where: { id: roomId } });
    return res.json({ message: 'Salle supprimée.' });
  } catch (error) {
    console.error('Erreur deleteRoom:', error);
    return res.status(500).json({ error: 'Impossible de supprimer la salle.' });
  }
}

export async function assignRoomStaff(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const roomId = req.params.roomId as string;
    const { userId: targetUserId, staffRole } = req.body;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }
    if (!targetUserId || !staffRole || !['MANAGER', 'PROTOCOL'].includes(staffRole)) {
      return res.status(400).json({ error: 'userId et staffRole (MANAGER|PROTOCOL) requis.' });
    }

    if (!(await canManageRoom(userId, tenantId, roomId))) {
      return res.status(403).json({ error: 'Accès refusé pour gérer le staff de cette salle.' });
    }

    const room = await prisma.organizationRoom.findFirst({ where: { id: roomId, tenantId } });
    if (!room) return res.status(404).json({ error: 'Salle introuvable.' });

    const targetUser = await prisma.user.findFirst({ where: { id: targetUserId, tenantId, role: 'USER' } });
    if (!targetUser) return res.status(404).json({ error: 'Utilisateur introuvable dans l\'organisation.' });

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { managerId: true } });
    if (tenant?.managerId === targetUserId) {
      return res.status(400).json({ error: 'Le propriétaire a déjà tous les accès.' });
    }

    const assignment = await prisma.roomStaff.upsert({
      where: { roomId_userId: { roomId, userId: targetUserId } },
      update: { staffRole },
      create: { roomId, userId: targetUserId, staffRole },
      include: {
        user: { select: { id: true, name: true, email: true, orgRole: true } },
      },
    });

    return res.status(201).json(assignment);
  } catch (error) {
    console.error('Erreur assignRoomStaff:', error);
    return res.status(500).json({ error: 'Impossible d\'assigner le staff.' });
  }
}

export async function previewRoomLayout(req: AuthenticatedRequest, res: Response) {
  try {
    const { roomType, layoutParams } = req.body;
    const type = (roomType || 'SIMPLE') as RoomType;
    const blueprint = generateRoomBlueprint(type, layoutParams || {});
    return res.json({ blueprint, capacity: calculateBlueprintCapacity(blueprint) });
  } catch (error) {
    console.error('Erreur previewRoomLayout:', error);
    return res.status(500).json({ error: 'Impossible de générer l\'aperçu.' });
  }
}

export async function removeRoomStaff(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const roomId = req.params.roomId as string;
    const targetUserId = req.params.userId as string;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    if (!(await canManageRoom(userId, tenantId, roomId))) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    await prisma.roomStaff.deleteMany({ where: { roomId, userId: targetUserId } });
    return res.json({ message: 'Staff retiré de la salle.' });
  } catch (error) {
    console.error('Erreur removeRoomStaff:', error);
    return res.status(500).json({ error: 'Impossible de retirer le staff.' });
  }
}

export async function analyzeRoomPlanFromPhoto(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageRooms) {
      return res.status(403).json({ error: 'Accès refusé pour analyser un plan de salle.' });
    }

    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
    if (!deviceId) {
      return res.status(400).json({ error: 'Identifiant d’appareil manquant pour consommer les jetons IA.' });
    }

    const imageUrl = normalizeRoomPlanImageUrl(body.imageUrl);
    const widthM = typeof body.widthM === 'number' && Number.isFinite(body.widthM) ? body.widthM : 20;
    const heightM = typeof body.heightM === 'number' && Number.isFinite(body.heightM) ? body.heightM : 15;
    const roomType = typeof body.roomType === 'string' ? body.roomType : undefined;
    const brief = typeof body.brief === 'string' ? body.brief : undefined;

    rateLimitRoomPlanAi(userId);
    await requireAiSimulationCredit(deviceId, userId, AI_ROOM_PLAN_TOKEN_COST);
    const draft = await analyzeRoomPlanPhoto({
      imageUrl,
      roomType,
      widthM,
      heightM,
      brief,
    });
    const historyId = await persistRoomPlanCompose({
      userId,
      deviceId,
      source: 'studio',
      prompt: brief,
      imageUrl,
      roomType,
      widthM,
      heightM,
      draft,
    });
    const allowance = await consumeAiSimulationCredit(deviceId, userId, AI_ROOM_PLAN_TOKEN_COST, {
      action: 'room_plan_from_photo',
      source: 'dashboard',
      relatedId: historyId,
    });

    return res.json({
      draft,
      historyId,
      remaining: allowance.totalRemaining,
      allowance,
      tokenCost: AI_ROOM_PLAN_TOKEN_COST,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err?.status) {
      return res.status(err.status).json({ error: err.message || 'Erreur IA' });
    }
    console.error('analyzeRoomPlanFromPhoto:', error);
    return res.status(500).json({ error: 'Impossible de lire le plan depuis la photo.' });
  }
}

function readRoomPlanComposeBody(body: Record<string, unknown>) {
  const imageRaw = typeof body.imageUrl === 'string' && body.imageUrl.trim()
    ? body.imageUrl
    : typeof body.imageDataUrl === 'string' && body.imageDataUrl.trim()
      ? body.imageDataUrl
      : undefined;
  const imageUrl = imageRaw ? normalizeRoomPlanImageUrl(imageRaw) : undefined;
  const brief = typeof body.brief === 'string'
    ? body.brief
    : typeof body.prompt === 'string'
      ? body.prompt
      : '';
  return {
    brief,
    imageUrl,
    widthM: typeof body.widthM === 'number' && Number.isFinite(body.widthM) ? body.widthM : 20,
    heightM: typeof body.heightM === 'number' && Number.isFinite(body.heightM) ? body.heightM : 16,
    roomType: typeof body.roomType === 'string' ? body.roomType : undefined,
  };
}

export async function composeRoomPlan(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageRooms) {
      return res.status(403).json({ error: 'Accès refusé pour composer un plan de salle.' });
    }

    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
    if (!deviceId) {
      return res.status(400).json({ error: 'Identifiant d’appareil manquant pour consommer les jetons IA.' });
    }

    const input = readRoomPlanComposeBody(body);
    if (!input.imageUrl && input.brief.trim().length < 8) {
      return res.status(400).json({ error: 'Décrivez la salle, ou ajoutez une photo.' });
    }

    rateLimitRoomPlanAi(userId);
    await requireAiSimulationCredit(deviceId, userId, AI_ROOM_PLAN_TOKEN_COST);
    const draft = await composeRoomPlanAi(input);
    const historyId = await persistRoomPlanCompose({
      userId,
      deviceId,
      source: 'studio',
      prompt: input.brief,
      imageUrl: input.imageUrl,
      roomType: input.roomType,
      widthM: input.widthM,
      heightM: input.heightM,
      draft,
    });
    const allowance = await consumeAiSimulationCredit(deviceId, userId, AI_ROOM_PLAN_TOKEN_COST, {
      action: 'room_plan_from_photo',
      source: 'studio',
      relatedId: historyId,
    });

    return res.json({
      draft,
      historyId,
      remaining: allowance.totalRemaining,
      allowance,
      tokenCost: AI_ROOM_PLAN_TOKEN_COST,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err?.status) {
      return res.status(err.status).json({ error: err.message || 'Erreur IA' });
    }
    console.error('composeRoomPlan:', error);
    return res.status(500).json({ error: 'Impossible de composer le plan de salle.' });
  }
}

export async function publicComposeRoomPlan(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
    if (!deviceId) {
      return res.status(400).json({ error: 'Identifiant d’appareil manquant pour consommer les jetons IA.' });
    }

    const input = readRoomPlanComposeBody(body);
    if (!input.imageUrl && input.brief.trim().length < 8) {
      return res.status(400).json({ error: 'Décrivez la salle, ou ajoutez une photo.' });
    }

    const rateKey = user?.id || deviceId;
    rateLimitRoomPlanAi(rateKey);
    await requireAiSimulationCredit(deviceId, user?.id || null, AI_ROOM_PLAN_TOKEN_COST);
    const draft = await composeRoomPlanAi(input);
    const historyId = await persistRoomPlanCompose({
      userId: user?.id || null,
      deviceId,
      source: user?.id ? 'studio' : 'landing',
      prompt: input.brief,
      imageUrl: input.imageUrl,
      roomType: input.roomType,
      widthM: input.widthM,
      heightM: input.heightM,
      draft,
    });
    const allowance = await consumeAiSimulationCredit(deviceId, user?.id || null, AI_ROOM_PLAN_TOKEN_COST, {
      action: 'room_plan_from_photo',
      source: user?.id ? 'studio' : 'landing',
      relatedId: historyId,
    });

    return res.json({
      draft,
      historyId,
      remaining: allowance.totalRemaining,
      allowance,
      tokenCost: AI_ROOM_PLAN_TOKEN_COST,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err?.status) {
      return res.status(err.status).json({ error: err.message || 'Erreur IA' });
    }
    console.error('publicComposeRoomPlan:', error);
    return res.status(500).json({ error: 'Impossible de composer le plan de salle.' });
  }
}

/** GET /public/rooms/ai/history?deviceId= — historique générations plan de salle */
export async function listPublicAiRoomPlanComposes(req: Request, res: Response) {
  try {
    const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : '';
    const userId = (req as AuthenticatedRequest).user?.id || null;
    const items = await listAiRoomPlanComposeRuns({ userId, deviceId, limit: 20 });
    return res.json({ items });
  } catch (error: unknown) {
    console.error('listPublicAiRoomPlanComposes:', error);
    return res.status(500).json({ error: 'Impossible de charger l’historique des plans.' });
  }
}

/** GET /rooms/ai/history — studio authentifié */
export async function listAiRoomPlanComposes(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : '';
    const items = await listAiRoomPlanComposeRuns({
      userId: req.user.id,
      deviceId,
      limit: 20,
    });
    return res.json({ items });
  } catch (error: unknown) {
    console.error('listAiRoomPlanComposes:', error);
    return res.status(500).json({ error: 'Impossible de charger l’historique des plans.' });
  }
}

/** GET /public/rooms/ai/history/:id */
export async function getPublicAiRoomPlanCompose(req: Request, res: Response) {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : '';
    const userId = (req as AuthenticatedRequest).user?.id || null;
    const item = await getAiRoomPlanComposeRun({ id, userId, deviceId });
    if (!item) return res.status(404).json({ error: 'Génération introuvable.' });
    return res.json({ item });
  } catch (error: unknown) {
    console.error('getPublicAiRoomPlanCompose:', error);
    return res.status(500).json({ error: 'Impossible de charger cette génération.' });
  }
}

/** POST /public/rooms/ai/history/claim — rattache l’historique device au compte */
export async function claimPublicAiRoomPlanComposes(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }
    const deviceId = typeof req.body?.deviceId === 'string' ? req.body.deviceId : '';
    const result = await claimDeviceRoomPlanComposeRuns(req.user.id, deviceId);
    const items = await listAiRoomPlanComposeRuns({
      userId: req.user.id,
      deviceId,
      limit: 20,
    });
    return res.json({ ...result, items });
  } catch (error: unknown) {
    console.error('claimPublicAiRoomPlanComposes:', error);
    return res.status(500).json({ error: 'Impossible de rattacher l’historique à votre compte.' });
  }
}
