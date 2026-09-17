'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { notificationFamily, PLATFORM_NOTIFICATION_TYPE } from '@/config/platformNotifications';
import { notifyAiTokensInsufficient } from '@/lib/aiTokenEvents';
import {
  isLocalAudioMuted,
  playFamilyNotificationSound,
  unlockAudioNotifications,
} from '@/lib/audioNotifications';
export interface PlatformNotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

const NOTIFICATION_POLL_INTERVAL_MS = 15_000;
export const UNREAD_BADGE_CAP = 9;

export function formatUnreadBadge(count: number): string | null {
  if (count <= 0) return null;
  return count > UNREAD_BADGE_CAP ? `${UNREAD_BADGE_CAP}+` : String(count);
}

type InboxSnapshot = {
  items: PlatformNotificationItem[];
  unreadCount: number;
};

type NotificationInboxContextValue = {
  unreadCount: number;
  items: PlatformNotificationItem[];
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  setUnreadCount: (count: number) => void;
};

const NotificationInboxContext = createContext<NotificationInboxContextValue | null>(null);

export function NotificationInboxProvider({ children }: { children: React.ReactNode }) {
  const { site } = usePlatformSite();
  const [snapshot, setSnapshot] = useState<InboxSnapshot>({ items: [], unreadCount: 0 });
  const [loading, setLoading] = useState(false);
  const knownIdsRef = useRef<Set<string> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get('/notifications?limit=20');
      const items: PlatformNotificationItem[] = Array.isArray(result.items) ? result.items : [];
      const unreadCount = Number(result.unreadCount) || 0;
      if (knownIdsRef.current === null) {
        knownIdsRef.current = new Set(items.map((item) => item.id));
      } else {
        const newcomers = items.filter((item) => !item.readAt && !knownIdsRef.current!.has(item.id));
        const tokenAlert = newcomers.find((item) => item.type === PLATFORM_NOTIFICATION_TYPE.AI_TOKENS_INSUFFICIENT);
        if (tokenAlert) {
          notifyAiTokensInsufficient(tokenAlert.message);
        }
        if (newcomers.length > 0 && !isLocalAudioMuted() && !tokenAlert) {
          const family = notificationFamily(newcomers[0].type);
          playFamilyNotificationSound(
            site.audioNotifications,
            family === 'account' ? 'account' : family,
          );
        }
        for (const item of items) knownIdsRef.current.add(item.id);
      }
      setSnapshot({ items, unreadCount });
    } catch {
      // silencieux : la cloche et la sidebar restent sur le dernier compteur connu
    } finally {
      setLoading(false);
    }
  }, [site.audioNotifications]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => {
      void refresh();
    }, NOTIFICATION_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const markRead = useCallback(async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`, {});
      setSnapshot((prev) => {
        const wasUnread = prev.items.find((item) => item.id === id && !item.readAt);
        return {
          unreadCount: wasUnread ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount,
          items: prev.items.map((item) =>
            item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item,
          ),
        };
      });
    } catch {
      // silencieux
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.post('/notifications/read-all', {});
      const now = new Date().toISOString();
      setSnapshot((prev) => ({
        unreadCount: 0,
        items: prev.items.map((item) => ({ ...item, readAt: item.readAt ?? now })),
      }));
    } catch {
      // silencieux
    }
  }, []);

  const setUnreadCount = useCallback((count: number) => {
    setSnapshot((prev) => ({ ...prev, unreadCount: Math.max(0, count) }));
  }, []);

  const value = useMemo<NotificationInboxContextValue>(
    () => ({
      unreadCount: snapshot.unreadCount,
      items: snapshot.items,
      loading,
      refresh,
      markRead,
      markAllRead,
      setUnreadCount,
    }),
    [snapshot.unreadCount, snapshot.items, loading, refresh, markRead, markAllRead, setUnreadCount],
  );

  return (
    <NotificationInboxContext.Provider value={value}>
      {children}
    </NotificationInboxContext.Provider>
  );
}

export function useNotificationInbox(): NotificationInboxContextValue {
  const context = useContext(NotificationInboxContext);
  if (!context) {
    throw new Error('useNotificationInbox must be used within NotificationInboxProvider');
  }
  return context;
}

export function UnreadCountBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  const label = formatUnreadBadge(count);
  if (!label) return null;
  return (
    <span
      className={
        className
        ?? 'min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-danger text-primary-foreground text-[10px] font-bold tabular-nums'
      }
    >
      {label}
    </span>
  );
}
