import { api } from './api';
import type { GuestInvitationsResponse, GuestRsvpData } from '../types/rsvp';
import type { GuestRsvpPreferences } from './rsvpFormFields';
import type { RsvpStatus } from '../types/rsvp';

export async function fetchGuestRsvp(guestId: string): Promise<GuestRsvpData> {
  return api.get<GuestRsvpData>(`/rsvp/${guestId}`);
}

export async function submitGuestRsvp(
  guestId: string,
  payload: { rsvp: RsvpStatus; preferences: GuestRsvpPreferences },
): Promise<void> {
  await api.post(`/rsvp/${guestId}`, payload);
}

export async function fetchGuestInvitations(guestId: string): Promise<GuestInvitationsResponse> {
  return api.get<GuestInvitationsResponse>(`/rsvp/${guestId}/invitations`);
}

export function getQrCodeUrl(guestId: string, webBaseUrl: string): string {
  const target = `${webBaseUrl.replace(/\/$/, '')}/rsvp/${guestId}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(target)}&color=4f-46-e5&bgcolor=ffffff&qzone=2`;
}

export function getPdfUrl(guestId: string, apiBaseUrl: string, storedUrl?: string | null): string {
  if (storedUrl) return storedUrl;
  return `${apiBaseUrl.replace(/\/$/, '')}/rsvp/${guestId}/seating-invitation.pdf`;
}
