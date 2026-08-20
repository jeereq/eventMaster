'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { api } from '@/lib/api';
import { eventDashboardHref } from '@/lib/eventRoutes';
import { taskDueLabel, taskDueState, type EventTaskItem } from '@/lib/eventTasks';
import { StatusPill } from '@/components/ui';

export default function EventTaskInbox({ protocol }: { protocol?: boolean }) {
  const [tasks, setTasks] = useState<EventTaskItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = (await api.get('/events/tasks/inbox')) as { tasks?: EventTaskItem[] };
        if (!cancelled) setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      } catch {
        if (!cancelled) setTasks([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (tasks.length === 0) return null;

  const overdue = tasks.filter((task) => taskDueState(task.dueAt, task.status) === 'overdue').length;

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3 space-y-2">
      <p className="text-sm font-semibold inline-flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-primary" />
        Mes tâches ouvertes
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{tasks.length}</span>
        {overdue > 0 ? (
          <StatusPill tone="rose">{overdue} en retard</StatusPill>
        ) : null}
      </p>
      <ul className="space-y-1">
        {tasks.slice(0, 6).map((task) => (
          <li key={task.id}>
            <Link
              href={eventDashboardHref(task.eventId, { tab: 'tasks', protocol })}
              className="flex items-center justify-between gap-2 text-sm hover:text-primary"
            >
              <span className="truncate">{task.title}</span>
              <span className="flex items-center gap-1.5 shrink-0">
                {taskDueState(task.dueAt, task.status) !== 'none' ? (
                  <StatusPill
                    tone={taskDueState(task.dueAt, task.status) === 'overdue' ? 'rose' : 'amber'}
                    className="hidden sm:inline-flex"
                  >
                    {taskDueLabel(task.dueAt, task.status)}
                  </StatusPill>
                ) : null}
                <span className="text-[11px] text-muted truncate max-w-[10rem]">{task.event.title}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
