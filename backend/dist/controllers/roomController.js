"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRooms = getRooms;
exports.createRoom = createRoom;
exports.updateRoom = updateRoom;
exports.deleteRoom = deleteRoom;
exports.assignRoomStaff = assignRoomStaff;
exports.previewRoomLayout = previewRoomLayout;
exports.removeRoomStaff = removeRoomStaff;
exports.analyzeRoomPlanFromPhoto = analyzeRoomPlanFromPhoto;
exports.composeRoomPlan = composeRoomPlan;
exports.publicComposeRoomPlan = publicComposeRoomPlan;
exports.listPublicAiRoomPlanComposes = listPublicAiRoomPlanComposes;
exports.listAiRoomPlanComposes = listAiRoomPlanComposes;
exports.getPublicAiRoomPlanCompose = getPublicAiRoomPlanCompose;
exports.claimPublicAiRoomPlanComposes = claimPublicAiRoomPlanComposes;
const db_1 = require("../db");
const permissionsService_1 = require("../services/permissionsService");
const planFeaturesService_1 = require("../services/planFeaturesService");
const roomLayoutService_1 = require("../services/roomLayoutService");
const aiSimulationWalletService_1 = require("../services/aiSimulationWalletService");
const roomPlanAiService_1 = require("../services/roomPlanAiService");
const aiRoomPlanComposeHistoryService_1 = require("../services/aiRoomPlanComposeHistoryService");
async function persistRoomPlanCompose(opts) {
    try {
        const saved = await (0, aiRoomPlanComposeHistoryService_1.saveAiRoomPlanComposeRun)(opts);
        return saved?.id || null;
    }
    catch (err) {
        console.error('[AiRoomPlanCompose] persist:', err);
        return null;
    }
}
const HOLD_BOOKING_STATUSES = ['REQUESTED', 'ACCEPTED', 'CONFIRMED'];
function blueprintUsesThemesOrFixtures(blueprint) {
    if (!blueprint || typeof blueprint !== 'object')
        return false;
    const bp = blueprint;
    const themeId = bp.metadata?.roomThemeId;
    if (themeId && themeId !== 'classic')
        return true;
    if (Array.isArray(bp.metadata?.customThemes) && bp.metadata.customThemes.length > 0)
        return true;
    if (bp.metadata?.floorImageUrl)
        return true;
    if (Array.isArray(bp.fixtures) && bp.fixtures.length > 0)
        return true;
    return false;
}
async function assertThemesFixturesForBlueprint(tenantId, blueprint) {
    if (!blueprintUsesThemesOrFixtures(blueprint))
        return;
    await (0, planFeaturesService_1.assertPlanFeature)(tenantId, 'roomThemesFixtures');
}
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
        try {
            await assertThemesFixturesForBlueprint(tenantId, blueprint);
        }
        catch (err) {
            if (err instanceof planFeaturesService_1.PlanFeatureError) {
                return res.status(403).json({ error: err.message });
            }
            throw err;
        }
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
        const layoutChanging = layoutBlueprint !== undefined ||
            layoutParams !== undefined ||
            (roomType !== undefined && roomType !== existing.roomType);
        if (layoutBlueprint !== undefined) {
            nextBlueprint = layoutBlueprint;
        }
        else if (layoutParams !== undefined || (roomType !== undefined && roomType !== existing.roomType)) {
            nextBlueprint = resolveRoomLayout(nextType, layoutParams, null);
        }
        if (layoutChanging) {
            try {
                await assertThemesFixturesForBlueprint(tenantId, nextBlueprint);
            }
            catch (err) {
                if (err instanceof planFeaturesService_1.PlanFeatureError) {
                    return res.status(403).json({ error: err.message });
                }
                throw err;
            }
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
async function analyzeRoomPlanFromPhoto(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        const access = await (0, permissionsService_1.resolveOrgAccess)(userId, tenantId);
        if (!access.canManageRooms) {
            return res.status(403).json({ error: 'Accès refusé pour analyser un plan de salle.' });
        }
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
        if (!deviceId) {
            return res.status(400).json({ error: 'Identifiant d’appareil manquant pour consommer les jetons IA.' });
        }
        const imageUrl = (0, roomPlanAiService_1.normalizeRoomPlanImageUrl)(body.imageUrl);
        const widthM = typeof body.widthM === 'number' && Number.isFinite(body.widthM) ? body.widthM : 20;
        const heightM = typeof body.heightM === 'number' && Number.isFinite(body.heightM) ? body.heightM : 15;
        const roomType = typeof body.roomType === 'string' ? body.roomType : undefined;
        const brief = typeof body.brief === 'string' ? body.brief : undefined;
        (0, roomPlanAiService_1.rateLimitRoomPlanAi)(userId);
        const unlimited = (0, aiSimulationWalletService_1.isUnlimitedAiTokenUser)(req.user);
        await (0, aiSimulationWalletService_1.requireAiSimulationCredit)(deviceId, userId, aiSimulationWalletService_1.AI_ROOM_PLAN_TOKEN_COST, { unlimited });
        const draft = await (0, roomPlanAiService_1.analyzeRoomPlanPhoto)({
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
        const allowance = await (0, aiSimulationWalletService_1.consumeAiSimulationCredit)(deviceId, userId, aiSimulationWalletService_1.AI_ROOM_PLAN_TOKEN_COST, {
            action: 'room_plan_from_photo',
            source: unlimited && req.user?.impersonatedBy ? 'support' : 'dashboard',
            relatedId: historyId,
            unlimited,
        });
        return res.json({
            draft,
            historyId,
            remaining: allowance.totalRemaining,
            allowance,
            tokenCost: aiSimulationWalletService_1.AI_ROOM_PLAN_TOKEN_COST,
        });
    }
    catch (error) {
        const err = error;
        if (err?.status) {
            return res.status(err.status).json({ error: err.message || 'Erreur IA' });
        }
        console.error('analyzeRoomPlanFromPhoto:', error);
        return res.status(500).json({ error: 'Impossible de lire le plan depuis la photo.' });
    }
}
function readRoomPlanComposeBody(body) {
    const imageRaw = typeof body.imageUrl === 'string' && body.imageUrl.trim()
        ? body.imageUrl
        : typeof body.imageDataUrl === 'string' && body.imageDataUrl.trim()
            ? body.imageDataUrl
            : undefined;
    const imageUrl = imageRaw ? (0, roomPlanAiService_1.normalizeRoomPlanImageUrl)(imageRaw) : undefined;
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
async function composeRoomPlan(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        const access = await (0, permissionsService_1.resolveOrgAccess)(userId, tenantId);
        if (!access.canManageRooms) {
            return res.status(403).json({ error: 'Accès refusé pour composer un plan de salle.' });
        }
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
        if (!deviceId) {
            return res.status(400).json({ error: 'Identifiant d’appareil manquant pour consommer les jetons IA.' });
        }
        const input = readRoomPlanComposeBody(body);
        if (!input.imageUrl && input.brief.trim().length < 8) {
            return res.status(400).json({ error: 'Décrivez la salle, ou ajoutez une photo.' });
        }
        (0, roomPlanAiService_1.rateLimitRoomPlanAi)(userId);
        const unlimited = (0, aiSimulationWalletService_1.isUnlimitedAiTokenUser)(req.user);
        await (0, aiSimulationWalletService_1.requireAiSimulationCredit)(deviceId, userId, aiSimulationWalletService_1.AI_ROOM_PLAN_TOKEN_COST, { unlimited });
        const draft = await (0, roomPlanAiService_1.composeRoomPlanAi)(input);
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
        const allowance = await (0, aiSimulationWalletService_1.consumeAiSimulationCredit)(deviceId, userId, aiSimulationWalletService_1.AI_ROOM_PLAN_TOKEN_COST, {
            action: 'room_plan_from_photo',
            source: unlimited && req.user?.impersonatedBy ? 'support' : 'studio',
            relatedId: historyId,
            unlimited,
        });
        return res.json({
            draft,
            historyId,
            remaining: allowance.totalRemaining,
            allowance,
            tokenCost: aiSimulationWalletService_1.AI_ROOM_PLAN_TOKEN_COST,
        });
    }
    catch (error) {
        const err = error;
        if (err?.status) {
            return res.status(err.status).json({ error: err.message || 'Erreur IA' });
        }
        console.error('composeRoomPlan:', error);
        return res.status(500).json({ error: 'Impossible de composer le plan de salle.' });
    }
}
async function publicComposeRoomPlan(req, res) {
    try {
        const user = req.user;
        if (user?.id && user.tenantId) {
            const denied = await (0, permissionsService_1.protocolCreativeDeniedMessage)(user.id, user.tenantId);
            if (denied)
                return res.status(403).json({ error: denied });
        }
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
        if (!deviceId) {
            return res.status(400).json({ error: 'Identifiant d’appareil manquant pour consommer les jetons IA.' });
        }
        const input = readRoomPlanComposeBody(body);
        if (!input.imageUrl && input.brief.trim().length < 8) {
            return res.status(400).json({ error: 'Décrivez la salle, ou ajoutez une photo.' });
        }
        const rateKey = user?.id || deviceId;
        (0, roomPlanAiService_1.rateLimitRoomPlanAi)(rateKey);
        const unlimited = (0, aiSimulationWalletService_1.isUnlimitedAiTokenUser)(user);
        await (0, aiSimulationWalletService_1.requireAiSimulationCredit)(deviceId, user?.id || null, aiSimulationWalletService_1.AI_ROOM_PLAN_TOKEN_COST, { unlimited });
        const draft = await (0, roomPlanAiService_1.composeRoomPlanAi)(input);
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
        const allowance = await (0, aiSimulationWalletService_1.consumeAiSimulationCredit)(deviceId, user?.id || null, aiSimulationWalletService_1.AI_ROOM_PLAN_TOKEN_COST, {
            action: 'room_plan_from_photo',
            source: unlimited && user?.impersonatedBy ? 'support' : user?.id ? 'studio' : 'landing',
            relatedId: historyId,
            unlimited,
        });
        return res.json({
            draft,
            historyId,
            remaining: allowance.totalRemaining,
            allowance,
            tokenCost: aiSimulationWalletService_1.AI_ROOM_PLAN_TOKEN_COST,
        });
    }
    catch (error) {
        const err = error;
        if (err?.status) {
            return res.status(err.status).json({ error: err.message || 'Erreur IA' });
        }
        console.error('publicComposeRoomPlan:', error);
        return res.status(500).json({ error: 'Impossible de composer le plan de salle.' });
    }
}
/** GET /public/rooms/ai/history?deviceId= — historique générations plan de salle */
async function listPublicAiRoomPlanComposes(req, res) {
    try {
        const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : '';
        const userId = req.user?.id || null;
        const items = await (0, aiRoomPlanComposeHistoryService_1.listAiRoomPlanComposeRuns)({ userId, deviceId, limit: 20 });
        return res.json({ items });
    }
    catch (error) {
        console.error('listPublicAiRoomPlanComposes:', error);
        return res.status(500).json({ error: 'Impossible de charger l’historique des plans.' });
    }
}
/** GET /rooms/ai/history — studio authentifié */
async function listAiRoomPlanComposes(req, res) {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Non authentifié.' });
        const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : '';
        const items = await (0, aiRoomPlanComposeHistoryService_1.listAiRoomPlanComposeRuns)({
            userId: req.user.id,
            deviceId,
            limit: 20,
        });
        return res.json({ items });
    }
    catch (error) {
        console.error('listAiRoomPlanComposes:', error);
        return res.status(500).json({ error: 'Impossible de charger l’historique des plans.' });
    }
}
/** GET /public/rooms/ai/history/:id */
async function getPublicAiRoomPlanCompose(req, res) {
    try {
        const id = typeof req.params.id === 'string' ? req.params.id : '';
        const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : '';
        const userId = req.user?.id || null;
        const item = await (0, aiRoomPlanComposeHistoryService_1.getAiRoomPlanComposeRun)({ id, userId, deviceId });
        if (!item)
            return res.status(404).json({ error: 'Génération introuvable.' });
        return res.json({ item });
    }
    catch (error) {
        console.error('getPublicAiRoomPlanCompose:', error);
        return res.status(500).json({ error: 'Impossible de charger cette génération.' });
    }
}
/** POST /public/rooms/ai/history/claim — rattache l’historique device au compte */
async function claimPublicAiRoomPlanComposes(req, res) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ error: 'Non authentifié.' });
        }
        const deviceId = typeof req.body?.deviceId === 'string' ? req.body.deviceId : '';
        const result = await (0, aiRoomPlanComposeHistoryService_1.claimDeviceRoomPlanComposeRuns)(req.user.id, deviceId);
        const items = await (0, aiRoomPlanComposeHistoryService_1.listAiRoomPlanComposeRuns)({
            userId: req.user.id,
            deviceId,
            limit: 20,
        });
        return res.json({ ...result, items });
    }
    catch (error) {
        console.error('claimPublicAiRoomPlanComposes:', error);
        return res.status(500).json({ error: 'Impossible de rattacher l’historique à votre compte.' });
    }
}
