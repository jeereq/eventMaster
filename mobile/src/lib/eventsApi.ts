import { api } from './api';
import type {
  EventGuest,
  EventInvitation,
  EventItem,
  EventsListResponse,
  NotificationsResponse,
} from '../types/event';

export async function fetchEvents(): Promise<EventsListResponse> {
  return api.get<EventsListResponse>('/events');
}

export async function fetchEvent(eventId: string): Promise<EventItem> {
  return api.get<EventItem>(`/events/${eventId}`);
}

export async function fetchEventGuests(eventId: string): Promise<EventGuest[]> {
  return api.get<EventGuest[]>(`/events/${eventId}/guests`);
}

export async function fetchEventInvitations(eventId: string): Promise<EventInvitation[]> {
  return api.get<EventInvitation[]>(`/events/${eventId}/invitations`);
}

export async function fetchNotifications(limit = 30): Promise<NotificationsResponse> {
  return api.get<NotificationsResponse>(`/notifications?limit=${limit}`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/notifications/read-all');
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}
