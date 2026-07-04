import type { OrgAccess } from './auth';

export interface EventRoom {
  id: string;
  name: string;
  roomType?: string;
}

export interface EventItem {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  location: string;
  roomId?: string | null;
  room?: EventRoom | null;
  tablePlan?: {
    tables?: Array<{ seats?: Record<string, string | null> }>;
    placementNotifiedAt?: string;
    notifiedAt?: string;
  } | null;
}

export interface EventsListResponse {
  events: EventItem[];
  access: OrgAccess | null;
}

export interface EventGuest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  category?: string | null;
  rsvp: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  checkedInAt?: string | null;
  seatingInvitationPdfUrl?: string | null;
  preferences?: {
    invitationSentAt?: string;
    phone?: string;
    [key: string]: unknown;
  } | null;
}

export interface EventInvitation {
  id: string;
  subject: string;
  body: string;
  channel: string;
  template?: { id: string; name: string } | null;
  templateId?: string | null;
}

export interface RsvpStats {
  total: number;
  accepted: number;
  declined: number;
  pending: number;
  checkedIn: number;
  responseRate: number;
}

export interface PlatformNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

export interface NotificationsResponse {
  items: PlatformNotification[];
  unreadCount: number;
}

export function computeRsvpStats(guests: EventGuest[]): RsvpStats {
  const total = guests.length;
  const accepted = guests.filter((g) => g.rsvp === 'ACCEPTED').length;
  const declined = guests.filter((g) => g.rsvp === 'DECLINED').length;
  const pending = guests.filter((g) => g.rsvp === 'PENDING').length;
  const checkedIn = guests.filter((g) => g.checkedInAt).length;
  const responded = accepted + declined;
  const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;
  return { total, accepted, declined, pending, checkedIn, responseRate };
}
