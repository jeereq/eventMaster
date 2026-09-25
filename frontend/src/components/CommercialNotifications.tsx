'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, Loader2, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/cn';
import { notificationTypeLabel } from '@/config/platformNotifications';
import {
  isLocalAudioMuted,
  setLocalAudioMuted,
  unlockAudioNotifications,
} from '@/lib/audioNotifications';
import {
  UnreadCountBadge,
  useNotificationInbox,
  type PlatformNotificationItem,
} from '@/context/NotificationInboxContext';

export type { PlatformNotificationItem };

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'À l\'instant';
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH} h`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function NotificationBell({ className }: { className?: string }) {
  const router = useRouter();
  const { unreadCount, items, loading, refresh, markRead, markAllRead } = useNotificationInbox();
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMuted(isLocalAudioMuted());
    const unlock = () => unlockAudioNotifications();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: PointerEvent | MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onClickOutside);
    return () => document.removeEventListener('pointerdown', onClickOutside);
  }, [open]);

  const followHref = (item: PlatformNotificationItem) => {
    const href = item.metadata?.href;
    if (typeof href !== 'string' || !href) return;
    try {
      const url = new URL(href, window.location.origin);
      if (url.origin === window.location.origin) {
        router.push(`${url.pathname}${url.search}`);
        setOpen(false);
      }
    } catch {
      router.push(href);
      setOpen(false);
    }
  };

  return (
    <div ref={panelRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => {
          unlockAudioNotifications();
          setOpen((v) => !v);
          if (!open) void refresh();
        }}
        className="relative inline-flex min-h-11 min-w-11 items-center justify-center p-2 rounded-full border border-border bg-surface text-foreground hover:bg-surface-muted transition"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} non lues` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 ? (
          <UnreadCountBadge
            count={unreadCount}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-danger text-primary-foreground text-[10px] font-bold tabular-nums"
          />
        ) : null}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(100vw-2rem,22rem)] z-[60] bg-surface border border-border rounded-2xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
            <p className="font-semibold text-sm">
              Notifications
              {unreadCount > 0 ? (
                <span className="ml-1.5 text-xs font-semibold text-danger tabular-nums">
                  {unreadCount}
                </span>
              ) : null}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = !muted;
                  setMuted(next);
                  setLocalAudioMuted(next);
                  if (!next) unlockAudioNotifications();
                }}
                className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-muted"
                aria-label={muted ? 'Activer les sons de notification' : 'Couper les sons de notification'}
                title={muted ? 'Sons coupés' : 'Sons activés'}
              >
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Tout marquer lu
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push('/dashboard/notifications');
                }}
                className="text-xs font-medium text-muted hover:text-foreground"
              >
                Voir tout
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && !items.length ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : !items.length ? (
              <p className="text-sm text-muted text-center py-8 px-4">Aucune notification.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    if (!n.readAt) void markRead(n.id);
                    followHref(n);
                  }}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-border-subtle hover:bg-surface-muted transition',
                    !n.readAt && 'bg-primary/10',
                  )}
                >
                  <div className="flex items-start gap-2">
                    {!n.readAt && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                    <div className={cn(!n.readAt ? '' : 'pl-4')}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                          {notificationTypeLabel(n.type)}
                        </span>
                        <span className="text-xs text-muted">{formatRelativeTime(n.createdAt)}</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground line-clamp-1">
                        {n.title}
                      </p>
                      <p className="text-xs text-muted mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
