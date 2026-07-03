import { OrgRole, StaffRole } from '@prisma/client';
import { prisma } from '../db';
import { isTenantManager } from '../utils/tenantAccess';

export type OrgAccessLevel = 'owner' | 'manager' | 'protocol' | 'commercial' | 'staff' | 'none';

export interface OrgAccess {
  level: OrgAccessLevel;
  orgRole: OrgRole | null;
  isOwner: boolean;
  canManageTeam: boolean;
  canManageRooms: boolean;
  canCreateEvents: boolean;
  canCreateRooms: boolean;
  canManageAllEvents: boolean;
  canProtocolAllEvents: boolean;
  canViewBilling: boolean;
  isProtocolOnly: boolean;
}

export async function resolveOrgAccess(userId: string, tenantId: string): Promise<OrgAccess> {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId, role: 'USER' },
    select: { id: true, orgRole: true },
  });

  const none: OrgAccess = {
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
    isProtocolOnly: false,
  };

  if (!user) return none;

  const owner = await isTenantManager(userId, tenantId);
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
    isProtocolOnly: false,
  };
}

async function getStaffContext(userId: string, tenantId: string) {
  const [eventStaff, roomStaff] = await Promise.all([
    prisma.eventStaff.findMany({
      where: { userId, event: { tenantId } },
      select: { eventId: true, staffRole: true },
    }),
    prisma.roomStaff.findMany({
      where: { userId, room: { tenantId } },
      select: { roomId: true, staffRole: true },
    }),
  ]);

  const roomIds = roomStaff.map((r) => r.roomId);
  const roomEvents = roomIds.length
    ? await prisma.event.findMany({
        where: { tenantId, roomId: { in: roomIds } },
        select: { id: true, roomId: true },
      })
    : [];

  return { eventStaff, roomStaff, roomEvents };
}

export async function getAccessibleEventIds(userId: string, tenantId: string): Promise<string[] | 'all'> {
  const access = await resolveOrgAccess(userId, tenantId);
  if (access.canManageAllEvents || access.canProtocolAllEvents) return 'all';

  const { eventStaff, roomEvents } = await getStaffContext(userId, tenantId);
  const ids = new Set<string>([
    ...eventStaff.map((e) => e.eventId),
    ...roomEvents.map((e) => e.id),
  ]);
  return Array.from(ids);
}

export async function getManageableEventIds(userId: string, tenantId: string): Promise<string[] | 'all'> {
  const access = await resolveOrgAccess(userId, tenantId);
  if (access.canManageAllEvents) return 'all';

  const { eventStaff, roomStaff, roomEvents } = await getStaffContext(userId, tenantId);
  const managerRoomIds = new Set(roomStaff.filter((r) => r.staffRole === 'MANAGER').map((r) => r.roomId));
  const ids = new Set<string>();

  eventStaff.filter((e) => e.staffRole === 'MANAGER').forEach((e) => ids.add(e.eventId));
  roomEvents.filter((e) => e.roomId && managerRoomIds.has(e.roomId)).forEach((e) => ids.add(e.id));

  return Array.from(ids);
}

export async function getProtocolEventIds(userId: string, tenantId: string): Promise<string[] | 'all'> {
  const access = await resolveOrgAccess(userId, tenantId);
  if (access.canProtocolAllEvents) return 'all';

  const { eventStaff, roomEvents } = await getStaffContext(userId, tenantId);
  const ids = new Set<string>([
    ...eventStaff.map((e) => e.eventId),
    ...roomEvents.map((e) => e.id),
  ]);
  return Array.from(ids);
}

export async function canManageEvent(userId: string, tenantId: string, eventId: string): Promise<boolean> {
  const access = await resolveOrgAccess(userId, tenantId);
  if (access.canManageAllEvents) return true;

  const direct = await prisma.eventStaff.findFirst({
    where: { eventId, userId, staffRole: 'MANAGER' },
  });
  if (direct) return true;

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    select: { roomId: true },
  });
  if (!event?.roomId) return false;

  const roomManager = await prisma.roomStaff.findFirst({
    where: { roomId: event.roomId, userId, staffRole: 'MANAGER' },
  });
  return Boolean(roomManager);
}

export async function canAccessEvent(userId: string, tenantId: string, eventId: string): Promise<boolean> {
  if (await canManageEvent(userId, tenantId, eventId)) return true;
  if (await canProtocolGuests(userId, tenantId, eventId)) return true;
  return false;
}

export async function canProtocolGuests(userId: string, tenantId: string, eventId: string): Promise<boolean> {
  const access = await resolveOrgAccess(userId, tenantId);
  if (access.canProtocolAllEvents || access.canManageAllEvents) return true;

  const eventStaff = await prisma.eventStaff.findFirst({ where: { eventId, userId } });
  if (eventStaff) return true;

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    select: { roomId: true },
  });
  if (!event?.roomId) return false;

  const roomStaff = await prisma.roomStaff.findFirst({ where: { roomId: event.roomId, userId } });
  return Boolean(roomStaff);
}

export async function canManageGuests(userId: string, tenantId: string, eventId: string): Promise<boolean> {
  return canManageEvent(userId, tenantId, eventId);
}

export async function canManageRoom(userId: string, tenantId: string, roomId: string): Promise<boolean> {
  const access = await resolveOrgAccess(userId, tenantId);
  if (access.canManageRooms) return true;

  const roomManager = await prisma.roomStaff.findFirst({
    where: { roomId, userId, staffRole: 'MANAGER', room: { tenantId } },
  });
  return Boolean(roomManager);
}

export async function canAccessRoom(userId: string, tenantId: string, roomId: string): Promise<boolean> {
  const access = await resolveOrgAccess(userId, tenantId);
  if (access.canManageRooms) return true;

  const staff = await prisma.roomStaff.findFirst({
    where: { roomId, userId, room: { tenantId } },
  });
  return Boolean(staff);
}

export async function assertCanCreateEvent(userId: string, tenantId: string): Promise<boolean> {
  const access = await resolveOrgAccess(userId, tenantId);
  return access.canCreateEvents;
}

export async function assertCanCreateRoom(userId: string, tenantId: string): Promise<boolean> {
  const access = await resolveOrgAccess(userId, tenantId);
  return access.canCreateRooms;
}

export async function assertCanViewBilling(userId: string, tenantId: string): Promise<boolean> {
  const access = await resolveOrgAccess(userId, tenantId);
  return access.canViewBilling;
}

export function isValidStaffRole(value: string): value is StaffRole {
  return value === 'MANAGER' || value === 'PROTOCOL';
}

export function isValidOrgRole(value: string): value is OrgRole {
  return value === 'MANAGER' || value === 'PROTOCOL' || value === 'COMMERCIAL';
}
