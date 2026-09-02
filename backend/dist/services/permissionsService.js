"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveOrgAccess = resolveOrgAccess;
exports.getAccessibleEventIds = getAccessibleEventIds;
exports.getManageableEventIds = getManageableEventIds;
exports.getProtocolEventIds = getProtocolEventIds;
exports.canManageEvent = canManageEvent;
exports.canAccessEvent = canAccessEvent;
exports.canProtocolGuests = canProtocolGuests;
exports.canManageGuests = canManageGuests;
exports.canManageRoom = canManageRoom;
exports.canAccessRoom = canAccessRoom;
exports.assertCanCreateEvent = assertCanCreateEvent;
exports.assertCanCreateRoom = assertCanCreateRoom;
exports.assertCanViewBilling = assertCanViewBilling;
exports.assertCanViewInvoices = assertCanViewInvoices;
exports.isValidStaffRole = isValidStaffRole;
exports.isValidOrgRole = isValidOrgRole;
const db_1 = require("../db");
const tenantAccess_1 = require("../utils/tenantAccess");
async function resolveOrgAccess(userId, tenantId) {
    const user = await db_1.prisma.user.findFirst({
        where: { id: userId, tenantId, role: 'USER' },
        select: { id: true, orgRole: true },
    });
    const none = {
        level: 'none',
        orgRole: null,
        isOwner: false,
        canManageTeam: false,
        canManageRooms: false,
        canCreateEvents: false,
        canCreateRooms: false,
        canManageAllEvents: false,
        canProtocolAllEvents: false,
        canViewBilling: false,
        canViewInvoices: false,
        isProtocolOnly: false,
    };
    if (!user)
        return none;
    const tenant = await db_1.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { accountKind: true, managerId: true },
    });
    if (tenant?.accountKind === 'CLIENT') {
        return {
            level: 'client',
            orgRole: null,
            isOwner: tenant.managerId === userId,
            canManageTeam: false,
            canManageRooms: false,
            canCreateEvents: false,
            canCreateRooms: false,
            canManageAllEvents: false,
            canProtocolAllEvents: false,
            canViewBilling: false,
            canViewInvoices: false,
            isProtocolOnly: false,
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
            canCreateRooms: true,
            canManageAllEvents: true,
            canProtocolAllEvents: true,
            canViewBilling: true,
            canViewInvoices: true,
            isProtocolOnly: false,
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
            canCreateRooms: true,
            canManageAllEvents: true,
            canProtocolAllEvents: true,
            canViewBilling: false,
            canViewInvoices: true,
            isProtocolOnly: false,
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
            canCreateRooms: false,
            canManageAllEvents: false,
            canProtocolAllEvents: true,
            canViewBilling: false,
            canViewInvoices: false,
            isProtocolOnly: true,
        };
    }
    if (user.orgRole === 'COMMERCIAL') {
        return {
            level: 'commercial',
            orgRole: 'COMMERCIAL',
            isOwner: false,
            canManageTeam: false,
            canManageRooms: false,
            canCreateEvents: false,
            canCreateRooms: false,
            canManageAllEvents: false,
            canProtocolAllEvents: false,
            canViewBilling: false,
            canViewInvoices: false,
            isProtocolOnly: false,
        };
    }
    return {
        level: 'staff',
        orgRole: null,
        isOwner: false,
        canManageTeam: false,
        canManageRooms: false,
        canCreateEvents: false,
        canCreateRooms: false,
        canManageAllEvents: false,
        canProtocolAllEvents: false,
        canViewBilling: false,
        canViewInvoices: false,
        isProtocolOnly: false,
    };
}
async function getStaffContext(userId, tenantId) {
    const [eventStaff, roomStaff] = await Promise.all([
        db_1.prisma.eventStaff.findMany({
            where: { userId, event: { tenantId } },
            select: { eventId: true, staffRole: true },
        }),
        db_1.prisma.roomStaff.findMany({
            where: { userId, room: { tenantId } },
            select: { roomId: true, staffRole: true },
        }),
    ]);
    const roomIds = roomStaff.map((r) => r.roomId);
    const roomEvents = roomIds.length
        ? await db_1.prisma.event.findMany({
            where: { tenantId, roomId: { in: roomIds } },
            select: { id: true, roomId: true },
        })
        : [];
    return { eventStaff, roomStaff, roomEvents };
}
async function getAccessibleEventIds(userId, tenantId) {
    const access = await resolveOrgAccess(userId, tenantId);
    if (access.canManageAllEvents || access.canProtocolAllEvents)
        return 'all';
    const { eventStaff, roomEvents } = await getStaffContext(userId, tenantId);
    const ids = new Set([
        ...eventStaff.map((e) => e.eventId),
        ...roomEvents.map((e) => e.id),
    ]);
    return Array.from(ids);
}
async function getManageableEventIds(userId, tenantId) {
    const access = await resolveOrgAccess(userId, tenantId);
    if (access.canManageAllEvents)
        return 'all';
    const { eventStaff, roomStaff, roomEvents } = await getStaffContext(userId, tenantId);
    const managerRoomIds = new Set(roomStaff.filter((r) => r.staffRole === 'MANAGER').map((r) => r.roomId));
    const ids = new Set();
    eventStaff.filter((e) => e.staffRole === 'MANAGER').forEach((e) => ids.add(e.eventId));
    roomEvents.filter((e) => e.roomId && managerRoomIds.has(e.roomId)).forEach((e) => ids.add(e.id));
    return Array.from(ids);
}
async function getProtocolEventIds(userId, tenantId) {
    const access = await resolveOrgAccess(userId, tenantId);
    if (access.canProtocolAllEvents)
        return 'all';
    const { eventStaff, roomEvents } = await getStaffContext(userId, tenantId);
    const ids = new Set([
        ...eventStaff.map((e) => e.eventId),
        ...roomEvents.map((e) => e.id),
    ]);
    return Array.from(ids);
}
async function canManageEvent(userId, tenantId, eventId) {
    const access = await resolveOrgAccess(userId, tenantId);
    if (access.canManageAllEvents)
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
    if (await canManageEvent(userId, tenantId, eventId))
        return true;
    if (await canProtocolGuests(userId, tenantId, eventId))
        return true;
    return false;
}
async function canProtocolGuests(userId, tenantId, eventId) {
    const access = await resolveOrgAccess(userId, tenantId);
    if (access.canProtocolAllEvents || access.canManageAllEvents)
        return true;
    const eventStaff = await db_1.prisma.eventStaff.findFirst({ where: { eventId, userId } });
    if (eventStaff)
        return true;
    const event = await db_1.prisma.event.findFirst({
        where: { id: eventId, tenantId },
        select: { roomId: true },
    });
    if (!event?.roomId)
        return false;
    const roomStaff = await db_1.prisma.roomStaff.findFirst({ where: { roomId: event.roomId, userId } });
    return Boolean(roomStaff);
}
async function canManageGuests(userId, tenantId, eventId) {
    return canManageEvent(userId, tenantId, eventId);
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
async function assertCanCreateEvent(userId, tenantId) {
    const access = await resolveOrgAccess(userId, tenantId);
    return access.canCreateEvents;
}
async function assertCanCreateRoom(userId, tenantId) {
    const access = await resolveOrgAccess(userId, tenantId);
    return access.canCreateRooms;
}
async function assertCanViewBilling(userId, tenantId) {
    const access = await resolveOrgAccess(userId, tenantId);
    return access.canViewBilling;
}
async function assertCanViewInvoices(userId, tenantId) {
    const access = await resolveOrgAccess(userId, tenantId);
    return access.canViewInvoices;
}
function isValidStaffRole(value) {
    return value === 'MANAGER' || value === 'PROTOCOL';
}
function isValidOrgRole(value) {
    return value === 'MANAGER' || value === 'PROTOCOL' || value === 'COMMERCIAL';
}
