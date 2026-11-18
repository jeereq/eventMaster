import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { canAccessRoom, canManageRoom } from '../services/permissionsService';
import {
  PlanFeatureError,
  allowsRoomBlueprint,
  assertThemesFixturesForBlueprint,
  getTenantPlanSnapshot,
} from '../services/planFeaturesService';
import { isLayoutQuotaReached, maxSavedLayoutsForLevel } from '../config/venueLayoutQuota';
import { computeLayoutStats } from '../services/venueLayoutStats';
import {
  isBlueprintShape,
  isBlueprintTooLarge,
  normalizeLayoutOrder,
  parseLayoutName,
  parseThumbnailUrl,
} from '../services/venueLayoutInput';
import { findPublicLayoutBlueprint } from '../services/venueLayoutService';
import { canViewRestrictedListing } from './marketplaceController';

const LAYOUT_SUMMARY_SELECT = {
  id: true,
  name: true,
  sortOrder: true,
  capacityMax: true,
  areaM2: true,
  thumbnailUrl: true,
  isPublic: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.VenueLayoutSelect;

const ROOM_NOT_FOUND = 'Salle introuvable.';
const LAYOUT_NOT_FOUND = 'Disposition introuvable.';

type OrgContext = { tenantId: string; userId: string };

function resolveOrgContext(req: AuthenticatedRequest, res: Response): OrgContext | null {
  const tenantId = req.user?.tenantId;
  const userId = req.user?.id;
  if (!tenantId || !userId) {
    res.status(403).json({ error: 'Organisation non identifiée.' });
    return null;
  }
  return { tenantId, userId };
}

async function loadRoomForOrg(
  ctx: OrgContext,
  roomId: string,
  mode: 'read' | 'manage',
) {
  const allowed = mode === 'manage'
    ? await canManageRoom(ctx.userId, ctx.tenantId, roomId)
    : await canAccessRoom(ctx.userId, ctx.tenantId, roomId);
  if (!allowed) return null;
  return prisma.organizationRoom.findFirst({
    where: { id: roomId, tenantId: ctx.tenantId },
    select: { id: true, roomType: true, layoutBlueprint: true },
  });
}

/** Vérifie que le forfait autorise ce plan (type de salle, thèmes et accessoires). */
async function assertBlueprintAllowedByPlan(tenantId: string, roomType: string, blueprint: unknown) {
  const snapshot = await getTenantPlanSnapshot(tenantId);
  if (!snapshot) throw new PlanFeatureError('Organisation introuvable.');
  if (!allowsRoomBlueprint(snapshot.features, roomType)) {
    throw new PlanFeatureError(
      `Les plans de salle avancés ne sont pas inclus dans votre forfait ${snapshot.planName}.`,
    );
  }
  await assertThemesFixturesForBlueprint(tenantId, blueprint);
  return snapshot;
}

function handlePlanError(err: unknown, res: Response): boolean {
  if (err instanceof PlanFeatureError) {
    res.status(403).json({ error: err.message });
    return true;
  }
  return false;
}

function validateBlueprintInput(raw: unknown, res: Response): Record<string, unknown> | null {
  if (!isBlueprintShape(raw)) {
    res.status(400).json({ error: 'Plan de salle invalide.' });
    return null;
  }
  if (isBlueprintTooLarge(raw)) {
    res.status(413).json({ error: 'Le plan est trop volumineux pour être enregistré.' });
    return null;
  }
  return raw;
}

export async function listRoomLayouts(req: AuthenticatedRequest, res: Response) {
  try {
    const ctx = resolveOrgContext(req, res);
    if (!ctx) return;
    const roomId = String(req.params.roomId || '');
    const room = await loadRoomForOrg(ctx, roomId, 'read');
    if (!room) return res.status(404).json({ error: ROOM_NOT_FOUND });

    const [layouts, snapshot] = await Promise.all([
      prisma.venueLayout.findMany({
        where: { roomId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: LAYOUT_SUMMARY_SELECT,
      }),
      getTenantPlanSnapshot(ctx.tenantId),
    ]);
    return res.json({
      layouts,
      maxLayouts: maxSavedLayoutsForLevel(snapshot?.features.roomEditorLevel),
    });
  } catch (error) {
    console.error('listRoomLayouts:', error);
    return res.status(500).json({ error: 'Impossible de charger les dispositions.' });
  }
}

export async function getRoomLayout(req: AuthenticatedRequest, res: Response) {
  try {
    const ctx = resolveOrgContext(req, res);
    if (!ctx) return;
    const roomId = String(req.params.roomId || '');
    const room = await loadRoomForOrg(ctx, roomId, 'read');
    if (!room) return res.status(404).json({ error: ROOM_NOT_FOUND });

    const layout = await prisma.venueLayout.findFirst({
      where: { id: String(req.params.layoutId || ''), roomId },
      select: { ...LAYOUT_SUMMARY_SELECT, blueprint: true },
    });
    if (!layout) return res.status(404).json({ error: LAYOUT_NOT_FOUND });
    return res.json(layout);
  } catch (error) {
    console.error('getRoomLayout:', error);
    return res.status(500).json({ error: 'Impossible de charger la disposition.' });
  }
}

type CreateLayoutInput = {
  name: string;
  blueprint: Record<string, unknown>;
  thumbnailUrl: string | null;
  isPublic: boolean;
};

/**
 * Crée une disposition en verrouillant la salle pour que deux requêtes simultanées
 * ne dépassent pas le quota du forfait.
 */
async function createLayoutWithinQuota(
  roomId: string,
  tenantId: string,
  maxLayouts: number,
  input: CreateLayoutInput,
) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "OrganizationRoom" WHERE "id" = ${roomId} FOR UPDATE`;
    const existing = await tx.venueLayout.aggregate({
      where: { roomId },
      _count: { _all: true },
      _max: { sortOrder: true },
    });
    if (existing._count._all >= maxLayouts) return null;
    const stats = computeLayoutStats(input.blueprint);
    return tx.venueLayout.create({
      data: {
        roomId,
        tenantId,
        name: input.name,
        sortOrder: (existing._max.sortOrder ?? -1) + 1,
        blueprint: input.blueprint as Prisma.InputJsonValue,
        capacityMax: stats.capacityMax,
        areaM2: stats.areaM2,
        thumbnailUrl: input.thumbnailUrl,
        isPublic: input.isPublic,
      },
      select: LAYOUT_SUMMARY_SELECT,
    });
  });
}

export async function createRoomLayout(req: AuthenticatedRequest, res: Response) {
  try {
    const ctx = resolveOrgContext(req, res);
    if (!ctx) return;
    const roomId = String(req.params.roomId || '');
    const room = await loadRoomForOrg(ctx, roomId, 'manage');
    if (!room) return res.status(404).json({ error: ROOM_NOT_FOUND });

    const name = parseLayoutName(req.body?.name);
    if (!name) return res.status(400).json({ error: 'Le nom de la disposition est requis (80 caractères maximum).' });

    const blueprint = validateBlueprintInput(req.body?.blueprint ?? room.layoutBlueprint, res);
    if (!blueprint) return;

    let maxLayouts: number;
    try {
      const snapshot = await assertBlueprintAllowedByPlan(ctx.tenantId, room.roomType, blueprint);
      maxLayouts = maxSavedLayoutsForLevel(snapshot.features.roomEditorLevel);
    } catch (err) {
      if (handlePlanError(err, res)) return;
      throw err;
    }

    const created = await createLayoutWithinQuota(roomId, ctx.tenantId, maxLayouts, {
      name,
      blueprint,
      thumbnailUrl: parseThumbnailUrl(req.body?.thumbnailUrl),
      isPublic: req.body?.isPublic !== false,
    });
    if (!created) {
      return res.status(403).json({
        error: `Quota de dispositions atteint (${maxLayouts} par salle avec votre forfait). Passez à un forfait supérieur.`,
      });
    }
    return res.status(201).json(created);
  } catch (error) {
    console.error('createRoomLayout:', error);
    return res.status(500).json({ error: 'Impossible d’enregistrer la disposition.' });
  }
}

export async function updateRoomLayout(req: AuthenticatedRequest, res: Response) {
  try {
    const ctx = resolveOrgContext(req, res);
    if (!ctx) return;
    const roomId = String(req.params.roomId || '');
    const room = await loadRoomForOrg(ctx, roomId, 'manage');
    if (!room) return res.status(404).json({ error: ROOM_NOT_FOUND });

    const layoutId = String(req.params.layoutId || '');
    const existing = await prisma.venueLayout.findFirst({ where: { id: layoutId, roomId }, select: { id: true } });
    if (!existing) return res.status(404).json({ error: LAYOUT_NOT_FOUND });

    const data: Prisma.VenueLayoutUpdateInput = {};

    if (req.body?.name !== undefined) {
      const name = parseLayoutName(req.body.name);
      if (!name) return res.status(400).json({ error: 'Nom invalide (80 caractères maximum).' });
      data.name = name;
    }
    if (typeof req.body?.isPublic === 'boolean') data.isPublic = req.body.isPublic;
    if (req.body?.thumbnailUrl !== undefined) {
      const thumbnailUrl = req.body.thumbnailUrl === null ? null : parseThumbnailUrl(req.body.thumbnailUrl);
      if (req.body.thumbnailUrl !== null && !thumbnailUrl) {
        return res.status(400).json({ error: 'Vignette invalide : une URL https est requise.' });
      }
      data.thumbnailUrl = thumbnailUrl;
    }
    if (req.body?.capacityMax !== undefined) {
      const capacity = Number(req.body.capacityMax);
      if (!Number.isInteger(capacity) || capacity < 0) {
        return res.status(400).json({ error: 'Capacité invalide.' });
      }
      data.capacityMax = capacity;
    }
    if (req.body?.blueprint !== undefined) {
      const blueprint = validateBlueprintInput(req.body.blueprint, res);
      if (!blueprint) return;
      try {
        await assertBlueprintAllowedByPlan(ctx.tenantId, room.roomType, blueprint);
      } catch (err) {
        if (handlePlanError(err, res)) return;
        throw err;
      }
      const stats = computeLayoutStats(blueprint);
      data.blueprint = blueprint as Prisma.InputJsonValue;
      data.areaM2 = stats.areaM2;
      // Une capacité saisie à la main dans la même requête l'emporte sur le calcul automatique.
      if (data.capacityMax === undefined) data.capacityMax = stats.capacityMax;
    }

    const updated = await prisma.venueLayout.update({
      where: { id: layoutId },
      data,
      select: LAYOUT_SUMMARY_SELECT,
    });
    return res.json(updated);
  } catch (error) {
    console.error('updateRoomLayout:', error);
    return res.status(500).json({ error: 'Impossible de modifier la disposition.' });
  }
}

export async function deleteRoomLayout(req: AuthenticatedRequest, res: Response) {
  try {
    const ctx = resolveOrgContext(req, res);
    if (!ctx) return;
    const roomId = String(req.params.roomId || '');
    const room = await loadRoomForOrg(ctx, roomId, 'manage');
    if (!room) return res.status(404).json({ error: ROOM_NOT_FOUND });

    const layoutId = String(req.params.layoutId || '');
    const removed = await prisma.venueLayout.deleteMany({ where: { id: layoutId, roomId } });
    if (removed.count === 0) return res.status(404).json({ error: LAYOUT_NOT_FOUND });
    return res.json({ message: 'Disposition supprimée.' });
  } catch (error) {
    console.error('deleteRoomLayout:', error);
    return res.status(500).json({ error: 'Impossible de supprimer la disposition.' });
  }
}

export async function duplicateRoomLayout(req: AuthenticatedRequest, res: Response) {
  try {
    const ctx = resolveOrgContext(req, res);
    if (!ctx) return;
    const roomId = String(req.params.roomId || '');
    const room = await loadRoomForOrg(ctx, roomId, 'manage');
    if (!room) return res.status(404).json({ error: ROOM_NOT_FOUND });

    const source = await prisma.venueLayout.findFirst({
      where: { id: String(req.params.layoutId || ''), roomId },
      select: { name: true, blueprint: true, thumbnailUrl: true },
    });
    if (!source) return res.status(404).json({ error: LAYOUT_NOT_FOUND });

    let maxLayouts: number;
    try {
      const snapshot = await assertBlueprintAllowedByPlan(ctx.tenantId, room.roomType, source.blueprint);
      maxLayouts = maxSavedLayoutsForLevel(snapshot.features.roomEditorLevel);
    } catch (err) {
      if (handlePlanError(err, res)) return;
      throw err;
    }

    const copyName = parseLayoutName(`${source.name} (copie)`) ?? source.name.slice(0, 60);
    const created = await createLayoutWithinQuota(roomId, ctx.tenantId, maxLayouts, {
      name: copyName,
      blueprint: source.blueprint as Record<string, unknown>,
      thumbnailUrl: source.thumbnailUrl,
      isPublic: false,
    });
    if (!created) {
      return res.status(403).json({
        error: `Quota de dispositions atteint (${maxLayouts} par salle avec votre forfait). Passez à un forfait supérieur.`,
      });
    }
    return res.status(201).json(created);
  } catch (error) {
    console.error('duplicateRoomLayout:', error);
    return res.status(500).json({ error: 'Impossible de dupliquer la disposition.' });
  }
}

export async function reorderRoomLayouts(req: AuthenticatedRequest, res: Response) {
  try {
    const ctx = resolveOrgContext(req, res);
    if (!ctx) return;
    const roomId = String(req.params.roomId || '');
    const room = await loadRoomForOrg(ctx, roomId, 'manage');
    if (!room) return res.status(404).json({ error: ROOM_NOT_FOUND });

    const rows = await prisma.venueLayout.findMany({ where: { roomId }, select: { id: true } });
    const ordered = normalizeLayoutOrder(req.body?.ids, rows.map((row) => row.id));
    if (!ordered) return res.status(400).json({ error: 'Ordre invalide : indiquez toutes les dispositions une seule fois.' });

    await prisma.$transaction(
      ordered.map((id, index) => prisma.venueLayout.update({ where: { id }, data: { sortOrder: index } })),
    );
    return res.json({ ids: ordered });
  } catch (error) {
    console.error('reorderRoomLayouts:', error);
    return res.status(500).json({ error: 'Impossible de réordonner les dispositions.' });
  }
}

/** Plan nettoyé d'une disposition publique (même règles de visibilité que la fiche salle). */
export async function getPublicVenueLayout(req: Request, res: Response) {
  try {
    const slug = String(req.params.slug || '').trim();
    const layoutId = String(req.params.layoutId || '').trim();
    if (!slug || !layoutId) return res.status(400).json({ error: 'Paramètres requis.' });

    const listing = await prisma.venueListing.findFirst({
      where: { slug },
      select: {
        tenantId: true,
        isPublic: true,
        isBlockedByAdmin: true,
        room: { select: { id: true, layoutBlueprint: true } },
      },
    });
    const notFound = () => res.status(404).json({ error: 'Disposition introuvable ou non publiée.' });
    if (!listing) return notFound();

    const canStaffView = canViewRestrictedListing(req, listing.tenantId);
    if ((listing.isBlockedByAdmin || !listing.isPublic) && !canStaffView) return notFound();

    const blueprint = await findPublicLayoutBlueprint(listing.room, layoutId);
    if (!blueprint) return notFound();
    return res.json({ id: layoutId, blueprint });
  } catch (error) {
    console.error('getPublicVenueLayout:', error);
    return res.status(500).json({ error: 'Impossible de charger la disposition.' });
  }
}
