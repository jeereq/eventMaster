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

export type ChannelPreference = {
  email: boolean;
  whatsapp: boolean;
  push: boolean;
};

export type NotificationPrefFamily = 'billing' | 'commissions' | 'catalog';

export type NotificationPreferences = {
  hasPhone: boolean;
  families: Record<NotificationPrefFamily, ChannelPreference>;
};

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  return api.get<NotificationPreferences>('/notifications/preferences');
}

export async function saveNotificationPreferences(
  families: NotificationPreferences['families'],
): Promise<NotificationPreferences> {
  return api.put<NotificationPreferences>('/notifications/preferences', { families });
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/notifications/read-all');
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}
