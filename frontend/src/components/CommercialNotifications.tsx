'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';

export interface PlatformNotificationItem {
 id: string;
 type: string;
 title: string;
 message: string;
 readAt: string | null;
 metadata?: Record<string, unknown> | null;
 createdAt: string;
}

interface NotificationsResponse {
 items: PlatformNotificationItem[];
 unreadCount: number;
}

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
 const [open, setOpen] = useState(false);
 const [loading, setLoading] = useState(false);
 const [data, setData] = useState<NotificationsResponse | null>(null);
 const panelRef = useRef<HTMLDivElement>(null);

 const load = useCallback(async () => {
 setLoading(true);
 try {
 const result = await api.get('/notifications?limit=20');
 setData(result);
 } catch {
 // silencieux
 } finally {
 setLoading(false);
 }
 }, []);

 useEffect(() => {
 load();
 const interval = setInterval(load, 15_000);
 return () => clearInterval(interval);
 }, [load]);

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

 const markRead = async (id: string) => {
 try {
 await api.patch(`/notifications/${id}/read`, {});
 setData((prev) => {
 if (!prev) return prev;
 const wasUnread = prev.items.find((n) => n.id === id && !n.readAt);
 return {
 unreadCount: wasUnread ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount,
 items: prev.items.map((n) =>
 n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n,
 ),
 };
 });
 } catch {
 // silencieux
 }
 };

 const markAllRead = async () => {
 try {
 await api.post('/notifications/read-all', {});
 setData((prev) => {
 if (!prev) return prev;
 const now = new Date().toISOString();
 return {
 unreadCount: 0,
 items: prev.items.map((n) => ({ ...n, readAt: n.readAt ?? now })),
 };
 });
 } catch {
 // silencieux
 }
 };

 const unreadCount = data?.unreadCount ?? 0;

 return (
 <div ref={panelRef} className={cn('relative', className)}>
 <button
 type="button"
 onClick={() => {
 setOpen((v) => !v);
 if (!open) load();
 }}
 className="relative p-2 rounded-xl border border-border dark:border-border text-muted dark:text-foreground hover:bg-surface-muted dark:hover:bg-surface-muted transition"
 aria-label="Notifications"
 aria-expanded={open}
 >
 <Bell className="w-4 h-4" />
 {unreadCount > 0 && (
 <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold">
 {unreadCount > 9 ? '9+' : unreadCount}
 </span>
 )}
 </button>

 {open && (
 <div className="absolute right-0 top-full mt-2 w-[min(100vw-2rem,22rem)] z-[60] bg-white dark:bg-background border border-border dark:border-border rounded-2xl shadow-xl overflow-hidden">
 <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle dark:border-border">
 <p className="font-semibold text-sm">Notifications</p>
 <div className="flex items-center gap-2">
 {unreadCount > 0 && (
 <button
 type="button"
 onClick={markAllRead}
 className="text-xs font-medium text-primary dark:text-primary hover:underline flex items-center gap-1"
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
 {loading && !data ? (
 <div className="flex justify-center py-8">
 <Loader2 className="w-5 h-5 animate-spin text-primary" />
 </div>
 ) : !data?.items.length ? (
 <p className="text-sm text-muted text-center py-8 px-4">Aucune notification.</p>
 ) : (
 data.items.map((n) => (
 <button
 key={n.id}
 type="button"
 onClick={() => {
 if (!n.readAt) void markRead(n.id);
 followHref(n);
 }}
 className={cn(
 'w-full text-left px-4 py-3 border-b border-border-subtle dark:border-border/80 hover:bg-surface-muted hover:bg-surface-muted transition',
 !n.readAt && 'bg-primary/10 dark:bg-primary/15',
 )}
 >
 <div className="flex items-start gap-2">
 {!n.readAt && (
 <span className="mt-1.5 w-2 h-2 rounded-full bg-primary/100 shrink-0" />
 )}
 <div className={cn(!n.readAt ? '' : 'pl-4')}>
 <p className="text-sm font-semibold text-foreground dark:text-foreground line-clamp-1">
 {n.title}
 </p>
 <p className="text-xs text-muted dark:text-muted mt-0.5 line-clamp-2">
 {n.message}
 </p>
 <p className="text-[10px] text-muted mt-1">{formatRelativeTime(n.createdAt)}</p>
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
