import Link from 'next/link';
import { ChevronRight, ClipboardList, Users } from '@/components/icons';
import { cn } from '@/lib/cn';
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

/** « 1 scanné », « 2 scannés » (0 et 1 au singulier, comme en français). */
function countLabel(n: number, singular: string, pluralForm = `${singular}s`) {
  return `${n} ${n > 1 ? pluralForm : singular}`;
}

export type StatMetric = {
  label: string;
  value: string | number;
  /** Précision sous le chiffre ; omise quand elle n’apporte rien (zéro, doublon). */
  hint?: string | null;
  /** Seul cas coloré : un état à traiter (ex. tâches en retard). */
  alert?: boolean;
};

/**
 * Bande de chiffres : un seul cadre, séparateurs fins entre les valeurs, chiffres neutres.
 * `gap-px` sur fond `bg-border` dessine les filets quel que soit le nombre de colonnes.
 */
export function StatStrip({ metrics, className }: { metrics: StatMetric[]; className?: string }) {
  const cols =
    metrics.length >= 6
      ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-6'
      : metrics.length === 4
        ? 'grid-cols-2 lg:grid-cols-4'
        : metrics.length === 3
          ? 'grid-cols-1 sm:grid-cols-3'
          : metrics.length === 1
            ? 'grid-cols-1 sm:max-w-xs'
            : 'grid-cols-2';
  return (
    <dl
      className={cn(
        'grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-border bg-border',
        cols,
        className,
      )}
    >
      {metrics.map((m) => (
        <div key={m.label} className="min-w-0 bg-surface px-4 py-4 sm:px-5">
          <dt className="text-[13px] font-medium leading-snug text-muted">{m.label}</dt>
          <dd className="mt-2 text-[26px] font-semibold leading-none tracking-tight tabular-nums text-foreground">
            {m.value}
          </dd>
          {m.hint ? (
            <dd className={cn('mt-1.5 text-xs tabular-nums', m.alert ? 'font-medium text-danger' : 'text-muted')}>
              {m.hint}
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

export function WorkspaceStatsOverview({
  stats,
  protocol,
  hideEventTotals,
}: {
  stats: WorkspaceStats;
  protocol?: boolean;
  /**
   * Un seul événement déjà détaillé à l’écran : on retire le nombre d’événements, les invités
   * et les entrées (mêmes chiffres que la bande de l’événement) et on garde les tâches.
   */
  hideEventTotals?: boolean;
}) {
  const isProtocol = stats.view === 'protocol' || protocol;
  const { events, guests, tasks } = stats;
  const overdue = tasks.overdue > 0 ? `${tasks.overdue} en retard` : null;

  const taskMetric: StatMetric = isProtocol
    ? { label: 'Mes tâches', value: tasks.mineOpen, hint: overdue, alert: Boolean(overdue) }
    : {
        label: 'Actions en cours',
        value: tasks.open,
        hint: overdue ?? (tasks.dueToday > 0 ? `${tasks.dueToday} aujourd’hui` : null),
        alert: Boolean(overdue),
      };

  const totals: StatMetric[] = isProtocol
    ? [
        {
          label: 'Événements du jour',
          value: events.today,
          hint: events.upcoming > 0 ? `${events.upcoming} à venir` : null,
        },
        {
          label: 'À scanner',
          value: guests.toCheckIn,
          hint: guests.accepted > 0 ? countLabel(guests.accepted, 'attendu') : null,
        },
        {
          label: 'Entrées',
          value: guests.checkedIn,
          hint: guests.accepted > 0 ? `${guests.checkInRate} %` : null,
        },
      ]
    : [
        {
          label: stats.view === 'manager' ? 'Événements assignés' : 'Événements',
          value: events.total,
          hint: events.upcoming > 0 ? `${events.upcoming} à venir` : null,
        },
        {
          label: 'Invités',
          value: guests.total,
          hint: guests.accepted > 0 ? countLabel(guests.accepted, 'confirmé') : null,
        },
        {
          label: 'Entrées',
          value: `${guests.checkInRate} %`,
          hint: guests.checkedIn > 0 ? countLabel(guests.checkedIn, 'scanné') : null,
        },
      ];
  const metrics = hideEventTotals ? [taskMetric] : [...totals, taskMetric];

  return (
    <div className="space-y-8">
      <StatStrip metrics={metrics} />

      {stats.upcoming.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-[15px] font-semibold text-foreground">
            {stats.upcoming.length > 1
              ? isProtocol ? 'Prochains accueils' : 'Prochains événements'
              : isProtocol ? 'Prochain accueil' : 'Prochain événement'}
          </h3>
          <ul className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface divide-y divide-border">
            {stats.upcoming.map((event) => (
              <li key={event.id}>
                <Link
                  href={eventDashboardHref(event.id, { tab: isProtocol ? 'protocol' : 'prep', protocol: isProtocol })}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground break-words">{event.title}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {event.location ? ` · ${event.location}` : ''}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-xs font-medium text-muted tabular-nums">
                    {event.guests > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" aria-hidden />
                        {event.checkedIn}/{event.guests}
                        <span className="sr-only"> entrées sur {event.guests} invités</span>
                      </span>
                    ) : null}
                    {event.openTasks > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <ClipboardList className="w-3.5 h-3.5" aria-hidden />
                        {event.openTasks}
                        <span className="sr-only"> {event.openTasks > 1 ? 'tâches ouvertes' : 'tâche ouverte'}</span>
                      </span>
                    ) : null}
                    <ChevronRight className="w-4 h-4 text-muted/70" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export default WorkspaceStatsOverview;
