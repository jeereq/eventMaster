'use client';

import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { notificationFamilyLabel } from '@/config/platformNotifications';

type TaskNotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

export default function EventTaskNotifications({
  eventId,
  refreshKey,
}: {
  eventId: string;
  refreshKey?: string;
}) {
  const [items, setItems] = useState<TaskNotificationItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = (await api.get(
          `/notifications?family=tasks&eventId=${encodeURIComponent(eventId)}&limit=8`,
        )) as { items?: TaskNotificationItem[] };
        if (!cancelled) setItems(Array.isArray(data.items) ? data.items : []);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, refreshKey]);

  if (items.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3 space-y-2">
      <p className="text-sm font-semibold inline-flex items-center gap-2">
        <Bell className="w-4 h-4 text-primary" />
        Notifications de tâches
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{items.length}</span>
      </p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id} className={cn('text-sm', !item.readAt && 'font-medium')}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              {notificationFamilyLabel(item.type)}
              {' · '}
              {new Date(item.createdAt).toLocaleString('fr-FR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <p className="text-foreground">{item.title}</p>
            <p className="text-xs text-muted">{item.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
