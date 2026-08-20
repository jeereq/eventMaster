import Link from 'next/link';
import { Calendar, CheckCircle, ClipboardList, ScanLine, Users } from 'lucide-react';
import { eventDashboardHref } from '@/lib/eventRoutes';

export type WorkspaceStatsView = 'org' | 'manager' | 'protocol';

export type WorkspaceStats = {
  view: WorkspaceStatsView;
  events: { total: number; upcoming: number; past: number; today: number };
  guests: {
    total: number;
    accepted: number;
    declined: number;
    pending: number;
    checkedIn: number;
    toCheckIn: number;
    checkInRate: number;
  };
  tasks: {
    open: number;
    done: number;
    cancelled: number;
    overdue: number;
    dueToday: number;
    mineOpen: number;
  };
  upcoming: Array<{
    id: string;
    title: string;
    date: string;
    location: string;
    guests: number;
    checkedIn: number;
    openTasks: number;
  }>;
};

function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'emerald' | 'rose' | 'amber';
}) {
  const valueClass =
    tone === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'rose'
        ? 'text-rose-600 dark:text-rose-400'
        : tone === 'amber'
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-foreground';
  return (
    <div className="bg-white dark:bg-background p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between">
      <span className="text-xs font-bold text-muted uppercase tracking-wider">{label}</span>
      <div className="flex items-baseline justify-between mt-3 gap-2">
        <span className={`text-3xl font-black ${valueClass}`}>{value}</span>
        {hint ? <span className="text-[11px] text-muted font-semibold">{hint}</span> : null}
      </div>
    </div>
  );
}

const VIEW_LABELS: Record<WorkspaceStatsView, string> = {
  org: 'Vue organisation',
  manager: 'Vue manager — événements assignés',
  protocol: 'Vue protocole — accueil et tâches',
};

export function WorkspaceStatsOverview({
  stats,
  protocol,
}: {
  stats: WorkspaceStats;
  protocol?: boolean;
}) {
  const isProtocol = stats.view === 'protocol' || protocol;
  return (
    <div className="space-y-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        {VIEW_LABELS[stats.view] || (isProtocol ? VIEW_LABELS.protocol : VIEW_LABELS.org)}
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {isProtocol ? (
          <>
            <StatCard label="Événements aujourd’hui" value={stats.events.today} hint={`${stats.events.upcoming} à venir`} />
            <StatCard label="À scanner" value={stats.guests.toCheckIn} hint={`${stats.guests.accepted} attendus`} tone="amber" />
            <StatCard label="Check-in" value={stats.guests.checkedIn} hint={`${stats.guests.checkInRate} %`} tone="emerald" />
            <StatCard label="Mes tâches" value={stats.tasks.mineOpen} hint={stats.tasks.overdue ? `${stats.tasks.overdue} en retard` : 'Ouvertes'} tone={stats.tasks.overdue ? 'rose' : 'default'} />
          </>
        ) : (
          <>
            <StatCard
              label={stats.view === 'manager' ? 'Événements assignés' : 'Événements'}
              value={stats.events.total}
              hint={`${stats.events.upcoming} à venir`}
            />
            <StatCard label="Invités" value={stats.guests.total} hint={`${stats.guests.accepted} présents`} />
            <StatCard label="Check-in" value={`${stats.guests.checkInRate}%`} hint={`${stats.guests.checkedIn} scannés`} tone="emerald" />
            <StatCard
              label="Tâches ouvertes"
              value={stats.tasks.open}
              hint={stats.tasks.overdue ? `${stats.tasks.overdue} en retard` : `${stats.tasks.dueToday} aujourd’hui`}
              tone={stats.tasks.overdue ? 'rose' : 'amber'}
            />
          </>
        )}
      </div>

      {stats.upcoming.length > 0 ? (
        <div className="bg-white dark:bg-background border border-border rounded-2xl p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-foreground">
            {isProtocol ? <ScanLine className="w-4 h-4 text-primary" /> : <Calendar className="w-4 h-4 text-primary" />}
            {isProtocol ? 'Prochains accueils' : 'Prochains événements'}
          </h3>
          <ul className="divide-y divide-border">
            {stats.upcoming.map((event) => (
              <li key={event.id} className="py-2.5 first:pt-0 last:pb-0">
                <Link
                  href={eventDashboardHref(event.id, { tab: isProtocol ? 'protocol' : 'prep', protocol: isProtocol })}
                  className="flex flex-wrap items-center justify-between gap-2 hover:text-primary"
                >
                  <span className="min-w-0">
                    <span className="text-sm font-semibold block truncate">{event.title}</span>
                    <span className="text-[11px] text-muted">
                      {new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {event.location ? ` · ${event.location}` : ''}
                    </span>
                  </span>
                  <span className="flex items-center gap-3 text-[11px] font-semibold text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {event.checkedIn}/{event.guests}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ClipboardList className="w-3 h-3" />
                      {event.openTasks}
                    </span>
                    <CheckCircle className="w-3.5 h-3.5 text-primary" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default WorkspaceStatsOverview;
