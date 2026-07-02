"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventStaff = getEventStaff;
exports.assignEventStaff = assignEventStaff;
exports.removeEventStaff = removeEventStaff;
const db_1 = require("../db");
const permissionsService_1 = require("../services/permissionsService");
const tenantAccess_1 = require("../utils/tenantAccess");
async function getEventStaff(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const eventId = req.params.eventId;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        const event = await (0, tenantAccess_1.verifyEventBelongsToTenant)(eventId, tenantId);
        if (!event)
            return res.status(404).json({ error: 'Événement introuvable.' });
        if (!(await (0, permissionsService_1.canAccessEvent)(userId, tenantId, eventId))) {
            return res.status(403).json({ error: 'Accès refusé à cet événement.' });
        }
        const staff = await db_1.prisma.eventStaff.findMany({
            where: { eventId },
            include: {
                user: { select: { id: true, name: true, email: true, orgRole: true } },
            },
            orderBy: { createdAt: 'asc' },
        });
        const access = await (0, permissionsService_1.resolveOrgAccess)(userId, tenantId);
        return res.json({
            staff,
            canManage: access.canManageAllEvents || (await (0, permissionsService_1.canManageEvent)(userId, tenantId, eventId)),
        });
    }
    catch (error) {
        console.error('Erreur getEventStaff:', error);
        return res.status(500).json({ error: 'Impossible de charger l\'équipe événement.' });
    }
}
async function assignEventStaff(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const eventId = req.params.eventId;
        const { userId: targetUserId, staffRole } = req.body;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        if (!targetUserId || !staffRole || !['MANAGER', 'PROTOCOL'].includes(staffRole)) {
            return res.status(400).json({ error: 'userId et staffRole (MANAGER|PROTOCOL) requis.' });
        }
        const event = await (0, tenantAccess_1.verifyEventBelongsToTenant)(eventId, tenantId);
        if (!event)
            return res.status(404).json({ error: 'Événement introuvable.' });
        const access = await (0, permissionsService_1.resolveOrgAccess)(userId, tenantId);
        if (!access.canManageAllEvents && !(await (0, permissionsService_1.canManageEvent)(userId, tenantId, eventId))) {
            return res.status(403).json({ error: 'Accès refusé pour gérer l\'équipe de cet événement.' });
        }
        const targetUser = await db_1.prisma.user.findFirst({ where: { id: targetUserId, tenantId, role: 'USER' } });
        if (!targetUser)
            return res.status(404).json({ error: 'Utilisateur introuvable dans l\'organisation.' });
        const tenant = await db_1.prisma.tenant.findUnique({ where: { id: tenantId }, select: { managerId: true } });
        if (tenant?.managerId === targetUserId) {
            return res.status(400).json({ error: 'Le propriétaire a déjà tous les accès.' });
        }
        const assignment = await db_1.prisma.eventStaff.upsert({
            where: { eventId_userId: { eventId, userId: targetUserId } },
            update: { staffRole },
            create: { eventId, userId: targetUserId, staffRole },
            include: {
                user: { select: { id: true, name: true, email: true, orgRole: true } },
            },
        });
        return res.status(201).json(assignment);
    }
    catch (error) {
        console.error('Erreur assignEventStaff:', error);
        return res.status(500).json({ error: 'Impossible d\'assigner le staff.' });
    }
}
async function removeEventStaff(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const eventId = req.params.eventId;
        const targetUserId = req.params.userId;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        const access = await (0, permissionsService_1.resolveOrgAccess)(userId, tenantId);
        if (!access.canManageAllEvents && !(await (0, permissionsService_1.canManageEvent)(userId, tenantId, eventId))) {
            return res.status(403).json({ error: 'Accès refusé.' });
        }
        await db_1.prisma.eventStaff.deleteMany({ where: { eventId, userId: targetUserId } });
        return res.json({ message: 'Staff retiré de l\'événement.' });
    }
    catch (error) {
        console.error('Erreur removeEventStaff:', error);
        return res.status(500).json({ error: 'Impossible de retirer le staff.' });
    }
}
