import { OrgRole, StaffRole } from '@prisma/client';
import { prisma } from '../db';
import { isTenantManager } from '../utils/tenantAccess';

export type OrgAccessLevel = 'owner' | 'manager' | 'protocol' | 'member' | 'none';

export interface OrgAccess {
  level: OrgAccessLevel;
  orgRole: OrgRole | null;
  isOwner: boolean;
  canManageTeam: boolean;
  canManageRooms: boolean;
  canCreateEvents: boolean;
  canManageAllEvents: boolean;
  canViewBilling: boolean;
}

export async function resolveOrgAccess(userId: string, tenantId: string): Promise<OrgAccess> {
  const user = await prisma.user.findFirst({
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

  const owner = await isTenantManager(userId, tenantId);
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

export async function getAccessibleEventIds(userId: string, tenantId: string): Promise<string[] | 'all'> {
  const access = await resolveOrgAccess(userId, tenantId);
  if (access.canManageAllEvents || access.level === 'member') {
    return 'all';
  }

  const [eventStaff, roomStaff] = await Promise.all([
    prisma.eventStaff.findMany({
      where: { userId, event: { tenantId } },
      select: { eventId: true },
    }),
    prisma.roomStaff.findMany({
      where: { userId, room: { tenantId } },
      select: { roomId: true },
    }),
  ]);

  const roomIds = roomStaff.map((r) => r.roomId);
  const roomEvents = roomIds.length
    ? await prisma.event.findMany({
        where: { tenantId, roomId: { in: roomIds } },
        select: { id: true },
      })
    : [];

  const ids = new Set<string>([
    ...eventStaff.map((e) => e.eventId),
    ...roomEvents.map((e) => e.id),
  ]);

  return Array.from(ids);
}

export async function canManageEvent(userId: string, tenantId: string, eventId: string): Promise<boolean> {
  const access = await resolveOrgAccess(userId, tenantId);
  if (access.canManageAllEvents || access.level === 'member') return true;

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
  const access = await resolveOrgAccess(userId, tenantId);
  if (access.canManageAllEvents || access.level === 'member') return true;

  const accessible = await getAccessibleEventIds(userId, tenantId);
  if (accessible === 'all') return true;
  return accessible.includes(eventId);
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

export function isValidStaffRole(value: string): value is StaffRole {
  return value === 'MANAGER' || value === 'PROTOCOL';
}

export function isValidOrgRole(value: string): value is OrgRole {
  return value === 'MANAGER' || value === 'PROTOCOL';
}
