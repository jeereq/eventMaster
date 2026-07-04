import { api } from './api';
import type {
  ProtocolCheckInResponse,
  ProtocolGuest,
  ProtocolScanResponse,
  ProtocolVerifySeatResponse,
} from '../types/protocol';

export async function fetchProtocolGuests(eventId: string): Promise<ProtocolGuest[]> {
  return api.get<ProtocolGuest[]>(`/events/${eventId}/protocol/guests`);
}

export async function scanProtocolGuest(
  eventId: string,
  payload: string,
): Promise<ProtocolScanResponse> {
  return api.post<ProtocolScanResponse>(`/events/${eventId}/protocol/scan`, { payload });
}

export async function checkInGuest(
  eventId: string,
  guestId: string,
): Promise<ProtocolCheckInResponse> {
  return api.post<ProtocolCheckInResponse>(`/events/${eventId}/guests/${guestId}/check-in`, {});
}

export async function verifyGuestSeat(
  eventId: string,
  guestId: string,
): Promise<ProtocolVerifySeatResponse> {
  return api.post<ProtocolVerifySeatResponse>(
    `/events/${eventId}/guests/${guestId}/verify-seat`,
    {},
  );
}

export async function addProtocolNote(
  eventId: string,
  guestId: string,
  content: string,
): Promise<void> {
  await api.post(`/events/${eventId}/guests/${guestId}/protocol-notes`, { content });
}
