import { api } from './api';
import type { GuestInvitationsResponse, GuestRsvpData } from '../types/rsvp';
import type { GuestRsvpPreferences } from './rsvpFormFields';
import type { RsvpStatus } from '../types/rsvp';

export type GuestLegalStatus = {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  requiresAcceptance: boolean;
};

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

export async function fetchGuestLegalStatus(guestId: string): Promise<GuestLegalStatus> {
  return api.get<GuestLegalStatus>(`/rsvp/${guestId}/legal-status`);
}

export async function acceptGuestLegal(
  guestId: string,
  payload: { acceptTerms: boolean; acceptPrivacy: boolean },
): Promise<GuestLegalStatus> {
  return api.post<GuestLegalStatus>(`/rsvp/${guestId}/legal-accept`, payload);
}

export function getQrCodeUrl(guestId: string, _webBaseUrl?: string): string {
  const apiBase = env.apiUrl.replace(/\/$/, '');
  return `${apiBase}/rsvp/${guestId}/qr.png?size=300`;
}

export function getPdfUrl(guestId: string, apiBaseUrl: string, storedUrl?: string | null): string {
  if (storedUrl) return storedUrl;
  return `${apiBaseUrl.replace(/\/$/, '')}/rsvp/${guestId}/seating-invitation.pdf`;
}
