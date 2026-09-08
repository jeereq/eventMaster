import type { GuestGuidelines } from '@/lib/guestGuidelines';

export interface GuestRsvpData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  rsvp: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  preferences: any;
  seatingInvitationPdfUrl?: string | null;
  placementAccessible?: boolean;
  tableDetails?: {
    tableName: string;
    shape: 'round' | 'rectangular' | 'square' | 'oval';
    capacity: number;
    seatIndex?: number;
    chairType?: string;
    chairImageUrl?: string;
    pricingZoneId?: string | null;
    zoneName?: string | null;
    zoneColor?: string | null;
    privacyPolicy?: {
      mode: 'full' | 'first_name' | 'hidden';
      shareSameTable: boolean;
      shareSameZone: boolean;
      isPublic?: boolean;
    };
    neighbors: Array<{ id: string; firstName: string; lastName: string; seatIndex?: number; anonymous?: boolean }>;
    zoneNeighborsCount?: number;
    zoneNeighbors?: Array<{ id: string; firstName: string; lastName: string; tableName: string; anonymous?: boolean }>;
  } | null;
  tablePlanOverview?: Array<{
    id: string;
    name: string;
    shape: 'round' | 'rectangular' | 'square' | 'oval';
    capacity: number;
    x: number;
    y: number;
    occupiedCount: number;
    isGuestTable: boolean;
    guestSeatIndex?: number;
    pricingZoneId?: string;
    chairType?: string;
    chairImageUrl?: string;
    tableColor?: string;
    tableImageUrl?: string;
  }> | null;
  pricingZones?: any[] | null;
  planFixtures?: Array<{
    id: string;
    kind: string;
    x: number;
    y: number;
    w: number;
    h: number;
    label?: string;
    color?: string;
    columnShape?: string;
    rotation?: number;
  }> | null;
  roomOutline?: {
    shape: string;
    x: number;
    y: number;
    w: number;
    h: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  } | null;
  roomThemeId?: string | null;
  floorType?: string | null;
  floorImageUrl?: string | null;
  depthAmount?: number | null;
  depthView?: boolean | null;
  roomLayoutPreview?: unknown;
  sourceRoomType?: string | null;
  previewLightingPreset?: string | null;
  eventPassed?: boolean;
  rsvpLocked?: boolean;
  event: {
    id: string;
    title: string;
    description: string;
    date: string;
    location: string;
    latitude?: number;
    longitude?: number;
    guestGuidelines?: GuestGuidelines | null;
    rsvpForm?: unknown;
    invitations?: Array<{
      template?: {
        id: string;
        name: string;
        content: any;
      } | null;
    }>;
  };
  branding?: {
    primary?: string;
    accent?: string;
    sidebar?: string;
  } | null;
  organizationName?: string;
}
