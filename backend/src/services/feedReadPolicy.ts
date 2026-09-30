import { verifyGuestAccessToken } from './guestAccessService.ts';

/**
 * Lecture du fil et du livre d'or d'un événement, sans dépendance à Prisma pour être testable.
 *
 * - Événement public : lisible par tous (comme sa fiche publique).
 * - Événement privé : réservé à un invité de cet événement muni de son lien personnel
 *   (jeton `?access=` transmis en en-tête `X-Guest-Token`) ou à un membre de l'organisation
 *   ayant accès à l'événement.
 */
export type FeedReadDecision = 'allowed' | 'denied' | 'not_found';

export type FeedReadDependencies = {
  findEvent: (eventId: string) => Promise<{ isPublic: boolean } | null>;
  canAccessEvent: (userId: string, tenantId: string, eventId: string) => Promise<boolean>;
  guestBelongsToEvent: (guestId: string, eventId: string) => Promise<boolean>;
};

export async function decideFeedReadAccess(
  input: {
    eventId: string;
    user?: { id: string; tenantId: string | null };
    guestToken?: string;
  },
  dependencies: FeedReadDependencies,
): Promise<FeedReadDecision> {
  if (!input.eventId) return 'not_found';
  const event = await dependencies.findEvent(input.eventId);
  if (!event) return 'not_found';
  if (event.isPublic) return 'allowed';

  if (input.user?.id && input.user.tenantId) {
    if (await dependencies.canAccessEvent(input.user.id, input.user.tenantId, input.eventId)) {
      return 'allowed';
    }
  }

  if (input.guestToken) {
    let guestId: string | null = null;
    try {
      guestId = verifyGuestAccessToken(input.guestToken).guestId;
    } catch {
      guestId = null;
    }
    if (guestId && (await dependencies.guestBelongsToEvent(guestId, input.eventId))) {
      return 'allowed';
    }
  }

  return 'denied';
}
