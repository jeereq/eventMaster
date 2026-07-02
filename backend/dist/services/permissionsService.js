"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveOrgAccess = resolveOrgAccess;
exports.getAccessibleEventIds = getAccessibleEventIds;
exports.canManageEvent = canManageEvent;
exports.canAccessEvent = canAccessEvent;
exports.canManageRoom = canManageRoom;
exports.canAccessRoom = canAccessRoom;
exports.isValidStaffRole = isValidStaffRole;
exports.isValidOrgRole = isValidOrgRole;
const db_1 = require("../db");
const tenantAccess_1 = require("../utils/tenantAccess");
async function resolveOrgAccess(userId, tenantId) {
    const user = await db_1.prisma.user.findFirst({
        where: { id: userId, tenantId, role: 'USER' },
        select: { id: true, orgRole: true },
    });
    if (!user) {
        return {
            level: 'none',
            orgRole: null,
            isOwner: false,
            canManageTeam: false,
            canManageRooms: false,
            canCreateEvents: false,
            canManageAllEvents: false,
            canViewBilling: false,
        };
    }
    const owner = await (0, tenantAccess_1.isTenantManager)(userId, tenantId);
    if (owner) {
        return {
            level: 'owner',
            orgRole: null,
            isOwner: true,
            canManageTeam: true,
            canManageRooms: true,
            canCreateEvents: true,
            canManageAllEvents: true,
            canViewBilling: true,
        };
    }
    if (user.orgRole === 'MANAGER') {
        return {
            level: 'manager',
            orgRole: 'MANAGER',
            isOwner: false,
            canManageTeam: true,
            canManageRooms: true,
            canCreateEvents: true,
            canManageAllEvents: true,
            canViewBilling: false,
        };
    }
    if (user.orgRole === 'PROTOCOL') {
        return {
            level: 'protocol',
            orgRole: 'PROTOCOL',
            isOwner: false,
            canManageTeam: false,
            canManageRooms: false,
            canCreateEvents: false,
            canManageAllEvents: false,
            canViewBilling: false,
        };
    }
    return {
        level: 'member',
        orgRole: null,
        isOwner: false,
        canManageTeam: false,
        canManageRooms: false,
        canCreateEvents: true,
        canManageAllEvents: true,
        canViewBilling: false,
    };
}
async function getAccessibleEventIds(userId, tenantId) {
    const access = await resolveOrgAccess(userId, tenantId);
    if (access.canManageAllEvents || access.level === 'member') {
        return 'all';
    }
    const [eventStaff, roomStaff] = await Promise.all([
        db_1.prisma.eventStaff.findMany({
            where: { userId, event: { tenantId } },
            select: { eventId: true },
        }),
        db_1.prisma.roomStaff.findMany({
            where: { userId, room: { tenantId } },
            select: { roomId: true },
        }),
    ]);
    const roomIds = roomStaff.map((r) => r.roomId);
    const roomEvents = roomIds.length
        ? await db_1.prisma.event.findMany({
            where: { tenantId, roomId: { in: roomIds } },
            select: { id: true },
        })
        : [];
    const ids = new Set([
        ...eventStaff.map((e) => e.eventId),
        ...roomEvents.map((e) => e.id),
    ]);
    return Array.from(ids);
}
async function canManageEvent(userId, tenantId, eventId) {
    const access = await resolveOrgAccess(userId, tenantId);
    if (access.canManageAllEvents || access.level === 'member')
        return true;
    const direct = await db_1.prisma.eventStaff.findFirst({
        where: { eventId, userId, staffRole: 'MANAGER' },
    });
    if (direct)
        return true;
    const event = await db_1.prisma.event.findFirst({
        where: { id: eventId, tenantId },
        select: { roomId: true },
    });
    if (!event?.roomId)
        return false;
    const roomManager = await db_1.prisma.roomStaff.findFirst({
        where: { roomId: event.roomId, userId, staffRole: 'MANAGER' },
    });
    return Boolean(roomManager);
}
async function canAccessEvent(userId, tenantId, eventId) {
    const access = await resolveOrgAccess(userId, tenantId);
    if (access.canManageAllEvents || access.level === 'member')
        return true;
    const accessible = await getAccessibleEventIds(userId, tenantId);
    if (accessible === 'all')
        return true;
    return accessible.includes(eventId);
}
async function canManageRoom(userId, tenantId, roomId) {
    const access = await resolveOrgAccess(userId, tenantId);
    if (access.canManageRooms)
        return true;
    const roomManager = await db_1.prisma.roomStaff.findFirst({
        where: { roomId, userId, staffRole: 'MANAGER', room: { tenantId } },
    });
    return Boolean(roomManager);
}
async function canAccessRoom(userId, tenantId, roomId) {
    const access = await resolveOrgAccess(userId, tenantId);
    if (access.canManageRooms)
        return true;
    const staff = await db_1.prisma.roomStaff.findFirst({
        where: { roomId, userId, room: { tenantId } },
    });
    return Boolean(staff);
}
function isValidStaffRole(value) {
    return value === 'MANAGER' || value === 'PROTOCOL';
}
function isValidOrgRole(value) {
    return value === 'MANAGER' || value === 'PROTOCOL';
}
