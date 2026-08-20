export type EventWorkspaceTab =
  | 'guests'
  | 'guestInfo'
  | 'feed'
  | 'invitations'
  | 'tablePlan'
  | 'staff'
  | 'protocol'
  | 'prep';

export const EVENT_WORKSPACE_TABS: EventWorkspaceTab[] = [
  'prep',
  'guestInfo',
  'guests',
  'invitations',
  'tablePlan',
  'feed',
  'protocol',
  'staff',
];

export function isEventWorkspaceTab(value: string | null | undefined): value is EventWorkspaceTab {
  return Boolean(value && (EVENT_WORKSPACE_TABS as string[]).includes(value));
}

export function eventDashboardHref(
  eventId: string,
  opts?: {
    tab?: EventWorkspaceTab;
    protocol?: boolean;
    listing?: string | null;
    offer?: string | null;
    action?: 'book' | 'inquire';
  },
): string {
  const params = new URLSearchParams();
  if (opts?.protocol) params.set('mode', 'protocol');
  if (opts?.tab) params.set('tab', opts.tab);
  if (opts?.listing) params.set('listing', opts.listing);
  if (opts?.offer) params.set('offer', opts.offer);
  if (opts?.action) params.set('action', opts.action);
  const q = params.toString();
  return `/dashboard/events/${eventId}${q ? `?${q}` : ''}`;
}

export function eventsListHref(protocol?: boolean): string {
  return protocol ? '/dashboard/events?mode=protocol' : '/dashboard/events';
}
