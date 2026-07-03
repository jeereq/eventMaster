"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRooms = getRooms;
exports.createRoom = createRoom;
exports.updateRoom = updateRoom;
exports.deleteRoom = deleteRoom;
exports.assignRoomStaff = assignRoomStaff;
exports.previewRoomLayout = previewRoomLayout;
exports.removeRoomStaff = removeRoomStaff;
const db_1 = require("../db");
const permissionsService_1 = require("../services/permissionsService");
const planFeaturesService_1 = require("../services/planFeaturesService");
const roomLayoutService_1 = require("../services/roomLayoutService");
function resolveRoomLayout(roomType, layoutParams, layoutBlueprint) {
    const type = (roomType || 'SIMPLE');
    if (layoutBlueprint && typeof layoutBlueprint === 'object') {
        return layoutBlueprint;
    }
    if (type !== 'SIMPLE' && type !== 'CUSTOM') {
        return (0, roomLayoutService_1.generateRoomBlueprint)(type, layoutParams || {});
    }
    return null;
}
async function getRooms(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        const access = await (0, permissionsService_1.resolveOrgAccess)(userId, tenantId);
        if (access.level === 'none') {
            return res.status(403).json({ error: 'Accès refusé.' });
        }
        const rooms = await db_1.prisma.organizationRoom.findMany({
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
            if (await (0, permissionsService_1.canAccessRoom)(userId, tenantId, room.id)) {
                filtered.push(room);
            }
        }
        return res.json({ rooms: filtered, canManage: false });
    }
    catch (error) {
        console.error('Erreur getRooms:', error);
        return res.status(500).json({ error: 'Impossible de charger les salles.' });
    }
}
async function createRoom(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        const access = await (0, permissionsService_1.resolveOrgAccess)(userId, tenantId);
        if (!access.canCreateRooms) {
            return res.status(403).json({ error: 'Seuls le propriétaire et les managers org. peuvent créer des salles.' });
        }
        const { name, description, capacity, floor, location, roomType, layoutParams, layoutBlueprint } = req.body;
        if (!name?.trim()) {
            return res.status(400).json({ error: 'Le nom de la salle est requis.' });
        }
        const resolvedType = (roomType || 'SIMPLE');
        try {
            const plan = await (0, planFeaturesService_1.assertRoomTypeForPlan)(tenantId, resolvedType);
            await (0, planFeaturesService_1.assertRoomQuota)(tenantId);
            if (layoutBlueprint && !(0, planFeaturesService_1.allowsRoomBlueprint)(plan, resolvedType)) {
                return res.status(403).json({
                    error: `Les plans de salle avancés ne sont pas inclus dans votre forfait ${plan.name}.`,
                });
            }
        }
        catch (err) {
            if (err instanceof planFeaturesService_1.PlanFeatureError) {
                return res.status(403).json({ error: err.message });
            }
            throw err;
        }
        const blueprint = resolveRoomLayout(resolvedType, layoutParams, layoutBlueprint);
        const computedCapacity = blueprint
            ? (0, roomLayoutService_1.calculateBlueprintCapacity)(blueprint)
            : capacity
                ? parseInt(capacity, 10)
                : null;
        const room = await db_1.prisma.organizationRoom.create({
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
    }
    catch (error) {
        console.error('Erreur createRoom:', error);
        return res.status(500).json({ error: 'Impossible de créer la salle.' });
    }
}
async function updateRoom(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const roomId = req.params.roomId;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        if (!(await (0, permissionsService_1.canManageRoom)(userId, tenantId, roomId))) {
            return res.status(403).json({ error: 'Accès refusé pour modifier cette salle.' });
        }
        const existing = await db_1.prisma.organizationRoom.findFirst({ where: { id: roomId, tenantId } });
        if (!existing) {
            return res.status(404).json({ error: 'Salle introuvable.' });
        }
        const { name, description, capacity, floor, location, roomType, layoutParams, layoutBlueprint } = req.body;
        const nextType = roomType !== undefined ? roomType : existing.roomType;
        try {
            const plan = await (0, planFeaturesService_1.assertRoomTypeForPlan)(tenantId, nextType);
            if (layoutBlueprint !== undefined && layoutBlueprint && !(0, planFeaturesService_1.allowsRoomBlueprint)(plan, nextType)) {
                return res.status(403).json({
                    error: `Les plans de salle avancés ne sont pas inclus dans votre forfait ${plan.name}.`,
                });
            }
        }
        catch (err) {
            if (err instanceof planFeaturesService_1.PlanFeatureError) {
                return res.status(403).json({ error: err.message });
            }
            throw err;
        }
        let nextBlueprint = existing.layoutBlueprint;
        if (layoutBlueprint !== undefined) {
            nextBlueprint = layoutBlueprint;
        }
        else if (layoutParams !== undefined || (roomType !== undefined && roomType !== existing.roomType)) {
            nextBlueprint = resolveRoomLayout(nextType, layoutParams, null);
        }
        const computedCapacity = nextBlueprint && typeof nextBlueprint === 'object'
            ? (0, roomLayoutService_1.calculateBlueprintCapacity)(nextBlueprint)
            : capacity !== undefined
                ? capacity
                    ? parseInt(capacity, 10)
                    : null
                : existing.capacity;
        const room = await db_1.prisma.organizationRoom.update({
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
    }
    catch (error) {
        console.error('Erreur updateRoom:', error);
        return res.status(500).json({ error: 'Impossible de mettre à jour la salle.' });
    }
}
async function deleteRoom(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const roomId = req.params.roomId;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        const access = await (0, permissionsService_1.resolveOrgAccess)(userId, tenantId);
        if (!access.canManageRooms) {
            return res.status(403).json({ error: 'Seuls le propriétaire et les managers peuvent supprimer des salles.' });
        }
        const existing = await db_1.prisma.organizationRoom.findFirst({ where: { id: roomId, tenantId } });
        if (!existing) {
            return res.status(404).json({ error: 'Salle introuvable.' });
        }
        await db_1.prisma.organizationRoom.delete({ where: { id: roomId } });
        return res.json({ message: 'Salle supprimée.' });
    }
    catch (error) {
        console.error('Erreur deleteRoom:', error);
        return res.status(500).json({ error: 'Impossible de supprimer la salle.' });
    }
}
async function assignRoomStaff(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const roomId = req.params.roomId;
        const { userId: targetUserId, staffRole } = req.body;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        if (!targetUserId || !staffRole || !['MANAGER', 'PROTOCOL'].includes(staffRole)) {
            return res.status(400).json({ error: 'userId et staffRole (MANAGER|PROTOCOL) requis.' });
        }
        if (!(await (0, permissionsService_1.canManageRoom)(userId, tenantId, roomId))) {
            return res.status(403).json({ error: 'Accès refusé pour gérer le staff de cette salle.' });
        }
        const room = await db_1.prisma.organizationRoom.findFirst({ where: { id: roomId, tenantId } });
        if (!room)
            return res.status(404).json({ error: 'Salle introuvable.' });
        const targetUser = await db_1.prisma.user.findFirst({ where: { id: targetUserId, tenantId, role: 'USER' } });
        if (!targetUser)
            return res.status(404).json({ error: 'Utilisateur introuvable dans l\'organisation.' });
        const tenant = await db_1.prisma.tenant.findUnique({ where: { id: tenantId }, select: { managerId: true } });
        if (tenant?.managerId === targetUserId) {
            return res.status(400).json({ error: 'Le propriétaire a déjà tous les accès.' });
        }
        const assignment = await db_1.prisma.roomStaff.upsert({
            where: { roomId_userId: { roomId, userId: targetUserId } },
            update: { staffRole },
            create: { roomId, userId: targetUserId, staffRole },
            include: {
                user: { select: { id: true, name: true, email: true, orgRole: true } },
            },
        });
        return res.status(201).json(assignment);
    }
    catch (error) {
        console.error('Erreur assignRoomStaff:', error);
        return res.status(500).json({ error: 'Impossible d\'assigner le staff.' });
    }
}
async function previewRoomLayout(req, res) {
    try {
        const { roomType, layoutParams } = req.body;
        const type = (roomType || 'SIMPLE');
        const blueprint = (0, roomLayoutService_1.generateRoomBlueprint)(type, layoutParams || {});
        return res.json({ blueprint, capacity: (0, roomLayoutService_1.calculateBlueprintCapacity)(blueprint) });
    }
    catch (error) {
        console.error('Erreur previewRoomLayout:', error);
        return res.status(500).json({ error: 'Impossible de générer l\'aperçu.' });
    }
}
async function removeRoomStaff(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const roomId = req.params.roomId;
        const targetUserId = req.params.userId;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        if (!(await (0, permissionsService_1.canManageRoom)(userId, tenantId, roomId))) {
            return res.status(403).json({ error: 'Accès refusé.' });
        }
        await db_1.prisma.roomStaff.deleteMany({ where: { roomId, userId: targetUserId } });
        return res.json({ message: 'Staff retiré de la salle.' });
    }
    catch (error) {
        console.error('Erreur removeRoomStaff:', error);
        return res.status(500).json({ error: 'Impossible de retirer le staff.' });
    }
}
