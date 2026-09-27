import { verifyGuestAccessToken } from './guestAccessService.ts';

export type FeedActor =
  | { kind: 'user'; id: string; authorName: string; likerId: string }
  | { kind: 'guest'; id: string; authorName: string; likerId: string };

export type FeedIdentityDependencies = {
  findUser: (id: string) => Promise<{ id: string; name: string | null; email: string } | null>;
  findGuestInEvent: (
    id: string,
    eventId: string,
  ) => Promise<{ id: string; firstName: string; lastName: string } | null>;
  canManageEvent: (userId: string, tenantId: string, eventId: string) => Promise<boolean>;
};

export async function resolveFeedActor(
  input: {
    eventId: string;
    user?: { id: string; tenantId: string | null };
    guestToken?: string;
  },
  dependencies: FeedIdentityDependencies,
): Promise<FeedActor | null> {
  if (input.user?.tenantId) {
    const allowed = await dependencies.canManageEvent(
      input.user.id,
      input.user.tenantId,
      input.eventId,
    );
    if (allowed) {
      const user = await dependencies.findUser(input.user.id);
      if (user) {
        return {
          kind: 'user',
          id: user.id,
          authorName: `${user.name || user.email} (Organisateur)`,
          likerId: `user_${user.id}`,
        };
      }
    }
  }

  if (!input.guestToken) return null;
  let guestId: string;
  try {
    guestId = verifyGuestAccessToken(input.guestToken).guestId;
  } catch {
    return null;
  }

  const guest = await dependencies.findGuestInEvent(guestId, input.eventId);
  if (!guest) return null;
  return {
    kind: 'guest',
    id: guest.id,
    authorName: `${guest.firstName} ${guest.lastName}`.trim(),
    likerId: `guest_${guest.id}`,
  };
}
