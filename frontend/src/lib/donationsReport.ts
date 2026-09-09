export interface EventDonationSummary {
  collectedAmountFc: number;
  pendingAmountFc: number;
  targetAmountFc: number | null;
  progressPercent: number | null;
  donorsCount: number;
  donationsPaidCount: number;
  donationsPendingCount: number;
  donationsCancelledCount: number;
  totalAttemptsCount: number;
  averageDonationFc: number;
  highestDonationFc: number;
  anonymousDonationsCount: number;
  attendeePassesCount: number;
}

export interface DonationChannelBreakdown {
  channel: string;
  label: string;
  count: number;
  amountFc: number;
  percent: number;
}

export interface DonationTimelinePoint {
  date: string;
  amountFc: number;
  count: number;
}

export interface EventDonationItem {
  id: string;
  createdAt: string;
  paidAt: string | null;
  amountFc: number;
  status: string;
  buyerName: string;
  actualBuyerName?: string;
  buyerEmail: string;
  buyerPhone: string | null;
  paymentProvider: string | null;
  flexPayChannel: string | null;
  channelLabel: string;
  flexPayOrderNumber: string | null;
  flexPayReference: string | null;
  donationNote: string | null;
  isAnonymous: boolean;
  donorAttendancePass: boolean;
  guest?: {
    id: string;
    firstName: string;
    lastName: string;
    rsvp: string;
    checkedInAt: string | null;
  } | null;
  event?: {
    id: string;
    title: string;
    slug: string | null;
    tenantId?: string;
    tenantName: string;
  } | null;
}

export interface EventDonationsReportResponse {
  event: {
    id: string;
    title: string;
    slug: string | null;
    date: string;
    location: string;
    isPublic: boolean;
    tenantName: string;
  };
  config: {
    enabled: boolean;
    targetAmountFc: number | null;
    minAmountFc: number;
    cause: string | null;
    donorAttendancePass: boolean;
  };
  summary: EventDonationSummary;
  channels: DonationChannelBreakdown[];
  timeline: DonationTimelinePoint[];
  donations: EventDonationItem[];
}

export interface AdminDonationsReportResponse {
  summary: {
    totalCollectedFc: number;
    totalDonationsPaid: number;
    totalDonationsPending: number;
    pendingAmountFc: number;
    totalAttemptsCount: number;
    averageDonationFc: number;
    highestDonationFc: number;
    eventsWithDonationsCount: number;
    activeTenantsCount: number;
    anonymousCount: number;
  };
  channels: DonationChannelBreakdown[];
  timeline: DonationTimelinePoint[];
  topEvents: Array<{
    eventId: string;
    eventTitle: string;
    tenantId: string;
    tenantName: string;
    targetAmountFc: number | null;
    collectedAmountFc: number;
    donorsCount: number;
    progressPercent: number | null;
  }>;
  topTenants: Array<{
    tenantId: string;
    tenantName: string;
    eventsCount: number;
    collectedAmountFc: number;
    donorsCount: number;
  }>;
  recentDonations: EventDonationItem[];
}
