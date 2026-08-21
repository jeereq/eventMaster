'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ClipboardList, Loader2, Play, ScanLine } from 'lucide-react';
import { api } from '@/lib/api';
import { eventDashboardHref } from '@/lib/eventRoutes';
import {
  EVENT_TASK_KIND_LABELS,
  EVENT_TASK_STATUS_LABELS,
  isOpenEventTask,
  taskDueLabel,
  taskDueState,
  type EventTaskItem,
  type EventTaskStatus,
} from '@/lib/eventTasks';
import { Alert, Button, EmptyState, StatusPill } from '@/components/ui';
import { cn } from '@/lib/cn';

function statusTone(status: EventTaskStatus): 'amber' | 'emerald' | 'slate' | 'sky' | 'rose' {
  if (status === 'DONE') return 'emerald';
  if (status === 'CANCELLED') return 'slate';
  if (status === 'IN_PROGRESS') return 'sky';
  if (status === 'BLOCKED') return 'rose';
  return 'amber';
}

/** Vue tâches pour le desk protocole (jour J) : checklist accueil + tâches assignées. */
export default function ProtocolTasksPanel({
  eventId,
  eventTitle,
}: {
  eventId: string;
  eventTitle?: string;
}) {
  const [tasks, setTasks] = useState<EventTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'day' | 'mine' | 'all'>('day');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = (await api.get(`/events/${eventId}/tasks`)) as { tasks?: EventTaskItem[] };
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les tâches.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const open = tasks.filter((t) => isOpenEventTask(t.status));
    if (filter === 'mine') return open.filter((t) => t.mine);
    if (filter === 'all') return open;
    return open.filter((t) => t.kind === 'PROTOCOL' || t.mine);
  }, [filter, tasks]);

  const doneToday = tasks.filter((t) => t.status === 'DONE' && (t.kind === 'PROTOCOL' || t.mine)).length;
  const openCount = visible.length;

  const setStatus = async (task: EventTaskItem, status: EventTaskStatus) => {
    setBusyId(task.id);
    setError('');
    try {
      const data = (await api.patch(`/events/${eventId}/tasks/${task.id}`, { status })) as {
        task?: EventTaskItem;
      };
      if (data.task) {
        setTasks((prev) => prev.map((row) => (row.id === task.id ? { ...row, ...data.task! } : row)));
      } else {
        await load();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de mettre à jour la tâche.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold text-foreground tracking-tight inline-flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            Tâches protocole
          </h2>
          <p className="text-sm text-muted leading-relaxed max-w-xl">
            Checklist du jour{eventTitle ? ` — ${eventTitle}` : ''}. Cochez au fur et à mesure ; revenez à
            l’accueil pour scanner les badges.
          </p>
          <p className="text-xs text-muted">
            {openCount} ouverte{openCount === 1 ? '' : 's'}
            {doneToday > 0 ? ` · ${doneToday} terminée${doneToday === 1 ? '' : 's'}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-border bg-surface-muted p-1">
            {(
              [
                { id: 'day' as const, label: 'Jour J' },
                { id: 'mine' as const, label: 'À moi' },
                { id: 'all' as const, label: 'Toutes' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilter(opt.id)}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                  filter === opt.id
                    ? 'bg-surface text-foreground shadow-sm ring-1 ring-border/50'
                    : 'text-muted hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Link
            href={eventDashboardHref(eventId, { tab: 'protocol', protocol: true })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] border border-border bg-surface text-xs font-semibold text-muted hover:text-foreground"
          >
            <ScanLine className="w-3.5 h-3.5" />
            Accueil
          </Link>
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {visible.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-8 h-8" />}
          title="Aucune tâche ouverte"
          description={
            filter === 'mine'
              ? 'Rien ne vous est assigné pour le moment. Demandez à l’organisateur ou consultez « Jour J ».'
              : 'Pas de checklist protocole ouverte. L’organisateur peut générer des tâches depuis l’onglet Tâches de l’événement.'
          }
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((task) => {
            const due = taskDueState(task.dueAt, task.status);
            const busy = busyId === task.id;
            return (
              <li
                key={task.id}
                className="rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusPill tone={statusTone(task.status)}>
                      {EVENT_TASK_STATUS_LABELS[task.status]}
                    </StatusPill>
                    <StatusPill tone="slate">{EVENT_TASK_KIND_LABELS[task.kind]}</StatusPill>
                    {task.mine ? <StatusPill tone="sky">À moi</StatusPill> : null}
                    {due !== 'none' ? (
                      <StatusPill tone={due === 'overdue' ? 'rose' : 'amber'}>
                        {taskDueLabel(task.dueAt, task.status)}
                      </StatusPill>
                    ) : null}
                  </div>
                  <p className="text-sm font-semibold text-foreground">{task.title}</p>
                  {task.notes ? (
                    <p className="text-xs text-muted leading-relaxed line-clamp-2">{task.notes}</p>
                  ) : null}
                  {task.assignee && !task.mine ? (
                    <p className="text-[11px] text-muted">
                      Assignée à {task.assignee.name || task.assignee.email}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  {task.status === 'OPEN' || task.status === 'BLOCKED' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={busy}
                      leftIcon={<Play className="w-3.5 h-3.5" />}
                      onClick={() => void setStatus(task, 'IN_PROGRESS')}
                    >
                      Démarrer
                    </Button>
                  ) : null}
                  {task.status !== 'DONE' ? (
                    <Button
                      size="sm"
                      loading={busy}
                      leftIcon={<Check className="w-3.5 h-3.5" />}
                      onClick={() => void setStatus(task, 'DONE')}
                    >
                      Faite
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
