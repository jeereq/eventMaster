/**
 * Règles d'accès aux événements et aux salles, sans dépendance à Prisma pour être testables.
 * Un droit « toute l'organisation » ne vaut que pour les ressources de cette organisation :
 * on vérifie toujours d'abord que l'événement (ou la salle) appartient au tenant de l'utilisateur.
 */

export type EventAccessMode = 'manage' | 'protocol';

export type OrgWideEventRights = {
  canManageAllEvents: boolean;
  canProtocolAllEvents: boolean;
};

export type EventAccessLookups = {
  /** L'événement s'il appartient au tenant, sinon null. */
  findEventInTenant: (eventId: string, tenantId: string) => Promise<{ roomId: string | null } | null>;
  /** Rôle de l'utilisateur dans l'équipe de l'événement, ou null. */
  findEventStaffRole: (eventId: string, userId: string) => Promise<string | null>;
  /** Rôle de l'utilisateur dans l'équipe de la salle, ou null. */
  findRoomStaffRole: (roomId: string, userId: string) => Promise<string | null>;
};

function roleAllows(role: string | null, mode: EventAccessMode): boolean {
  if (!role) return false;
  return mode === 'protocol' || role === 'MANAGER';
}

export async function decideEventAccess(
  rights: OrgWideEventRights,
  params: { userId: string; tenantId: string; eventId: string; mode: EventAccessMode },
  lookups: EventAccessLookups,
): Promise<boolean> {
  const { userId, tenantId, eventId, mode } = params;
  if (!userId || !tenantId || !eventId) return false;

  const event = await lookups.findEventInTenant(eventId, tenantId);
  if (!event) return false;

  if (rights.canManageAllEvents) return true;
  if (mode === 'protocol' && rights.canProtocolAllEvents) return true;

  if (roleAllows(await lookups.findEventStaffRole(eventId, userId), mode)) return true;

  if (!event.roomId) return false;
  return roleAllows(await lookups.findRoomStaffRole(event.roomId, userId), mode);
}
