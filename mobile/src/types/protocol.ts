export interface ProtocolAssignedSeat {
  tableId: string;
  tableName: string;
  seatIndex: number;
}

export interface ProtocolNote {
  id: string;
  content: string;
  createdAt: string;
  user?: { id: string; name: string | null };
}

export interface ProtocolGuest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  rsvp: string;
  checkedInAt?: string | null;
  seatVerified?: boolean;
  assignedSeat?: ProtocolAssignedSeat | null;
  protocolNotes?: ProtocolNote[];
}

export interface ProtocolScanResponse {
  event: { id: string; title: string };
  guest: ProtocolGuest;
}

export interface ProtocolCheckInResponse {
  message: string;
  guest: ProtocolGuest;
  placementDelivery?: {
    delivered: boolean;
    skippedReason?: string;
  };
}

export interface ProtocolVerifySeatResponse {
  message: string;
  seatMatch: boolean;
  assignedSeat?: ProtocolAssignedSeat | null;
  guest: ProtocolGuest;
  notification?: {
    sent: boolean;
    channels: string[];
    errors?: string[];
  };
  placementDelivery?: {
    delivered: boolean;
    skippedReason?: string;
  };
}
