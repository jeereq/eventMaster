export type EventWorkspaceTab =
  | 'guests'
  | 'guestInfo'
  | 'feed'
  | 'invitations'
  | 'tablePlan'
  | 'staff'
  | 'protocol';

export const EVENT_WORKSPACE_TABS: EventWorkspaceTab[] = [
  'guests',
  'guestInfo',
  'feed',
  'invitations',
  'tablePlan',
  'staff',
  'protocol',
];

export function isEventWorkspaceTab(value: string | null | undefined): value is EventWorkspaceTab {
  return Boolean(value && (EVENT_WORKSPACE_TABS as string[]).includes(value));
}

export function eventDashboardHref(
  eventId: string,
  opts?: { tab?: EventWorkspaceTab; protocol?: boolean },
): string {
  const params = new URLSearchParams();
  if (opts?.protocol) params.set('mode', 'protocol');
  if (opts?.tab) params.set('tab', opts.tab);
  const q = params.toString();
  return `/dashboard/events/${eventId}${q ? `?${q}` : ''}`;
}

export function eventsListHref(protocol?: boolean): string {
  return protocol ? '/dashboard/events?mode=protocol' : '/dashboard/events';
}
