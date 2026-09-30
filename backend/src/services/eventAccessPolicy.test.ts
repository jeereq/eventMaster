import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decideEventAccess, type EventAccessLookups } from './eventAccessPolicy.ts';

const events: Record<string, { tenantId: string; roomId: string | null }> = {
  'event-a': { tenantId: 'tenant-a', roomId: 'room-a' },
  'event-b': { tenantId: 'tenant-b', roomId: 'room-b' },
};
const eventStaff: Record<string, string> = {
  'event-a:manager-a': 'MANAGER',
  'event-a:protocol-a': 'PROTOCOL',
  // Données incohérentes : un membre de A rattaché à un événement de B.
  'event-b:protocol-a': 'MANAGER',
};
const roomStaff: Record<string, string> = {
  'room-a:room-protocol-a': 'PROTOCOL',
};

const lookups: EventAccessLookups = {
  async findEventInTenant(eventId, tenantId) {
    const event = events[eventId];
    return event && event.tenantId === tenantId ? { roomId: event.roomId } : null;
  },
  async findEventStaffRole(eventId, userId) {
    return eventStaff[`${eventId}:${userId}`] ?? null;
  },
  async findRoomStaffRole(roomId, userId) {
    return roomStaff[`${roomId}:${userId}`] ?? null;
  },
};

const owner = { canManageAllEvents: true, canProtocolAllEvents: true };
const member = { canManageAllEvents: false, canProtocolAllEvents: false };

describe('isolation des événements entre organisations', () => {
  it('autorise le propriétaire sur un événement de son organisation', async () => {
    assert.equal(
      await decideEventAccess(owner, { userId: 'owner-a', tenantId: 'tenant-a', eventId: 'event-a', mode: 'manage' }, lookups),
      true,
    );
  });

  it('refuse le propriétaire sur un événement d’une autre organisation', async () => {
    for (const mode of ['manage', 'protocol'] as const) {
      assert.equal(
        await decideEventAccess(owner, { userId: 'owner-a', tenantId: 'tenant-a', eventId: 'event-b', mode }, lookups),
        false,
      );
    }
  });

  it('refuse une affectation d’équipe pointant vers un événement d’une autre organisation', async () => {
    assert.equal(
      await decideEventAccess(member, { userId: 'protocol-a', tenantId: 'tenant-a', eventId: 'event-b', mode: 'manage' }, lookups),
      false,
    );
  });

  it('distingue gestion et protocole pour l’équipe de l’événement', async () => {
    const base = { tenantId: 'tenant-a', eventId: 'event-a' };
    assert.equal(await decideEventAccess(member, { ...base, userId: 'manager-a', mode: 'manage' }, lookups), true);
    assert.equal(await decideEventAccess(member, { ...base, userId: 'protocol-a', mode: 'manage' }, lookups), false);
    assert.equal(await decideEventAccess(member, { ...base, userId: 'protocol-a', mode: 'protocol' }, lookups), true);
    assert.equal(await decideEventAccess(member, { ...base, userId: 'room-protocol-a', mode: 'protocol' }, lookups), true);
    assert.equal(await decideEventAccess(member, { ...base, userId: 'room-protocol-a', mode: 'manage' }, lookups), false);
    assert.equal(await decideEventAccess(member, { ...base, userId: 'stranger', mode: 'protocol' }, lookups), false);
  });
});
