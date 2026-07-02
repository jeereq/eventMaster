import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { resolveOrgAccess, canManageRoom, canAccessRoom } from '../services/permissionsService';
import {
  generateRoomBlueprint,
  calculateBlueprintCapacity,
  blueprintToTablePlan,
  RoomType,
  LayoutParams,
} from '../services/roomLayoutService';

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
    const blueprint = resolveRoomLayout(resolvedType, layoutParams, layoutBlueprint);
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
    let nextBlueprint = existing.layoutBlueprint;
    if (layoutBlueprint !== undefined) {
      nextBlueprint = layoutBlueprint;
    } else if (layoutParams !== undefined || (roomType !== undefined && roomType !== existing.roomType)) {
      nextBlueprint = resolveRoomLayout(nextType, layoutParams, null) as typeof existing.layoutBlueprint;
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
