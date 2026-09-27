import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/security.ts';

const GUEST_TOKEN_AUDIENCE = 'eventmaster-guest';
const GUEST_TOKEN_ISSUER = 'eventmaster-api';
const DEFAULT_GUEST_TOKEN_TTL = '90d';

type GuestAccessPayload = {
  guestId: string;
  purpose: 'guest-access';
};

export function signGuestAccessToken(guestId: string): string {
  return jwt.sign(
    { guestId, purpose: 'guest-access' } satisfies GuestAccessPayload,
    getJwtSecret(),
    {
      audience: GUEST_TOKEN_AUDIENCE,
      issuer: GUEST_TOKEN_ISSUER,
      expiresIn: (process.env.GUEST_ACCESS_TOKEN_TTL || DEFAULT_GUEST_TOKEN_TTL) as jwt.SignOptions['expiresIn'],
    },
  );
}

export function verifyGuestAccessToken(token: string): GuestAccessPayload {
  const payload = jwt.verify(token, getJwtSecret(), {
    audience: GUEST_TOKEN_AUDIENCE,
    issuer: GUEST_TOKEN_ISSUER,
  }) as Partial<GuestAccessPayload>;

  if (payload.purpose !== 'guest-access' || !payload.guestId) {
    throw new Error('Jeton invité invalide.');
  }
  return payload as GuestAccessPayload;
}

export function buildGuestRsvpUrl(frontendUrl: string, guestId: string): string {
  const url = new URL(`/rsvp/${guestId}`, frontendUrl);
  url.searchParams.set('access', signGuestAccessToken(guestId));
  return url.toString();
}
