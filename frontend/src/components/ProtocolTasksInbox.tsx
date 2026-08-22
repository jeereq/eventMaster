'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ClipboardList, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { eventDashboardHref } from '@/lib/eventRoutes';
import {
  EVENT_TASK_KIND_LABELS,
  isOpenEventTask,
  taskDueLabel,
  taskDueState,
  type EventTaskItem,
  type EventTaskStatus,
} from '@/lib/eventTasks';
import { Alert, Button, EmptyState, StatusPill } from '@/components/ui';

/** Inbox tâches protocole (liste événements, mode jour J) — toujours visible. */
export default function ProtocolTasksInbox({ protocol = true }: { protocol?: boolean }) {
  const [tasks, setTasks] = useState<EventTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = (await api.get('/events/tasks/inbox')) as { tasks?: EventTaskItem[] };
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger vos tâches.');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const setStatus = async (task: EventTaskItem, status: EventTaskStatus) => {
    setBusyId(task.id);
    setError('');
    try {
      await api.patch(`/events/${task.eventId}/tasks/${task.id}`, { status });
      if (status === 'DONE' || status === 'CANCELLED') {
        setTasks((prev) => prev.filter((row) => row.id !== task.id));
      } else {
        setTasks((prev) =>
          prev.map((row) => (row.id === task.id ? { ...row, status } : row)),
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible.');
    } finally {
      setBusyId(null);
    }
  };

  const open = tasks.filter((t) => isOpenEventTask(t.status));
  const overdue = open.filter((t) => taskDueState(t.dueAt, t.status) === 'overdue').length;

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-[0_10px_40px_rgba(15,23,42,0.04)]">
      <div className="px-4 py-3.5 border-b border-border flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-primary/5 to-transparent">
        <p className="text-sm font-semibold inline-flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" />
          Mes tâches
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted tabular-nums">{open.length}</span>
          {overdue > 0 ? <StatusPill tone="rose">{overdue} en retard</StatusPill> : null}
        </p>
        <p className="text-[11px] text-muted">
          {protocol ? 'Assignées à vous · desk protocole' : 'Assignées à vous · tous événements'}
        </p>
      </div>

      <div className="px-4 py-3 space-y-2">
        {error ? <Alert variant="error">{error}</Alert> : null}

        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : open.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="w-7 h-7" />}
            title="Aucune tâche ouverte"
            description="Quand l’organisateur vous assigne une tâche (briefing, poste d’accueil…), elle apparaît ici. Ouvrez un événement pour la checklist jour J."
            className="py-8"
          />
        ) : (
          <ul className="space-y-2">
            {open.map((task) => {
              const due = taskDueState(task.dueAt, task.status);
              const busy = busyId === task.id;
              return (
                <li
                  key={task.id}
                  className="rounded-[var(--radius-button)] border border-border bg-surface-muted/40 px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1">
                      <StatusPill tone="slate">{EVENT_TASK_KIND_LABELS[task.kind]}</StatusPill>
                      {due !== 'none' ? (
                        <StatusPill tone={due === 'overdue' ? 'rose' : 'amber'}>
                          {taskDueLabel(task.dueAt, task.status)}
                        </StatusPill>
                      ) : null}
                    </div>
                    <Link
                      href={eventDashboardHref(task.eventId, { tab: 'tasks', protocol })}
                      className="text-sm font-semibold text-foreground hover:text-primary block truncate"
                    >
                      {task.title}
                    </Link>
                    <p className="text-[11px] text-muted truncate">{task.event.title}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={busy}
                      onClick={() => void setStatus(task, 'IN_PROGRESS')}
                      disabled={task.status === 'IN_PROGRESS'}
                    >
                      En cours
                    </Button>
                    <Button
                      size="sm"
                      loading={busy}
                      leftIcon={<Check className="w-3.5 h-3.5" />}
                      onClick={() => void setStatus(task, 'DONE')}
                    >
                      Faite
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
