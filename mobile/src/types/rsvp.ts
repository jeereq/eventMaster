import type { GuestGuidelines } from '../lib/guestGuidelines';
import type { GuestRsvpPreferences } from '../lib/rsvpFormFields';

export type RsvpStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export interface RsvpTableNeighbor {
  id: string;
  firstName: string;
  lastName: string;
  seatIndex?: number;
}

export interface RsvpTableDetails {
  tableName: string;
  shape: string;
  capacity: number;
  seatIndex?: number;
  neighbors: RsvpTableNeighbor[];
}

export interface RsvpEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  latitude?: number;
  longitude?: number;
  guestGuidelines?: GuestGuidelines | null;
  invitations?: Array<{
    template?: {
      id: string;
      name: string;
      content: unknown;
    } | null;
  }>;
}

export interface GuestRsvpData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  rsvp: RsvpStatus;
  preferences: GuestRsvpPreferences | null;
  placementAccessible?: boolean;
  checkedInAt?: string | null;
  seatVerified?: boolean;
  seatingInvitationPdfUrl?: string | null;
  tableDetails?: RsvpTableDetails | null;
  eventPassed?: boolean;
  rsvpLocked?: boolean;
  event: RsvpEvent;
}

export interface GuestInvitationListItem {
  guestId: string;
  rsvp: RsvpStatus;
  eventPassed: boolean;
  isCurrent: boolean;
  organizationName: string;
  event: {
    id: string;
    title: string;
    date: string;
    location: string;
  };
}

export interface GuestInvitationsResponse {
  invitations: GuestInvitationListItem[];
  total: number;
  upcomingCount: number;
}
