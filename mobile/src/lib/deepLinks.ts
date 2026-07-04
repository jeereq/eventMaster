import { router } from 'expo-router';

export interface NotificationLinkData {
  eventId?: string;
  guestId?: string;
  notificationId?: string;
  type?: string;
  route?: string;
}

export function resolveNotificationRoute(data: NotificationLinkData | null | undefined): string | null {
  if (!data) return null;

  if (typeof data.route === 'string' && data.route.startsWith('/')) {
    return data.route;
  }

  if (data.guestId) {
    return `/rsvp/${data.guestId}`;
  }

  if (data.eventId) {
    return `/(app)/events/${data.eventId}`;
  }

  return null;
}

export function navigateFromNotificationData(data: NotificationLinkData | null | undefined): boolean {
  const route = resolveNotificationRoute(data);
  if (!route) return false;
  router.push(route as never);
  return true;
}

export function resolveDeepLinkPath(url: string): string | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);

    if (parts[0] === 'rsvp' && parts[1]) {
      return `/rsvp/${parts[1]}`;
    }

    if (parts[0] === 'event' && parts[1]) {
      return `/(app)/events/${parts[1]}`;
    }

    if (parts[0] === 'protocol' && parts[1]) {
      return `/(app)/protocol/${parts[1]}`;
    }

    return null;
  } catch {
    return null;
  }
}

export function navigateFromDeepLink(url: string): boolean {
  const route = resolveDeepLinkPath(url);
  if (!route) return false;
  router.push(route as never);
  return true;
}
