'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, Loader2, Shield, Sliders } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Breadcrumbs, Button, EmptyState, Pagination, Alert, usePageSize } from '@/components/ui';
import NotificationPreferencesCard from '@/components/NotificationPreferencesCard';
import OrgNotificationSettingsModal from '@/components/OrgNotificationSettingsModal';
import { cn } from '@/lib/cn';
import {
  NOTIFICATION_FAMILY_LABELS,
  notificationFamilyLabel,
  notificationTypeLabel,
  type NotificationFamily,
  type NotificationPrefFamily,
} from '@/config/platformNotifications';

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
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function followHref(item: PlatformNotificationItem): string | null {
  const href = item.metadata?.href;
  if (typeof href !== 'string' || !href) return null;
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin === window.location.origin) return `${url.pathname}${url.search}`;
  } catch {
    if (href.startsWith('/')) return href;
  }
  return null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, access, tenant } = useAuth();
  const isOwner = Boolean(access?.isOwner) || (Boolean(user?.id) && user?.id === tenant?.managerId);
  const [showOrgNotifModal, setShowOrgNotifModal] = useState(false);
  const [family, setFamily] = useState<NotificationFamily>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('notifications', 20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<NotificationsResponse | null>(null);

  const emptyCopy = useMemo(() => {
    if (access?.level === 'client') {
      return {
        title: 'Aucune notification',
        description: 'Le statut de vos demandes de dates apparaîtra ici.',
      };
    }
    if (user?.role === 'SUPER_ADMIN') {
      return {
        title: 'Aucune notification',
        description: 'Paiements (billets, abonnements, jetons), demandes d’abonnement, licences et versements commerciaux s’afficheront ici.',
      };
    }
    if (user?.role === 'COMMERCIAL' || access?.level === 'commercial') {
      return {
        title: 'Aucune notification',
        description: 'Les activations d’abonnement et les récaps de commission s’afficheront ici.',
      };
    }
    return {
      title: 'Aucune notification',
      description: 'Les alertes de votre espace (tâches, factures, devis, réservations) s’afficheront ici.',
    };
  }, [access?.level, user?.role]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('limit', String(pageSize));
      params.set('page', String(page));
      if (unreadOnly) params.set('unread', '1');
      if (family !== 'all') params.set('family', family);
      const result = await api.get(`/notifications?${params}`);
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les notifications.');
    } finally {
      setLoading(false);
    }
  }, [family, unreadOnly, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = async (item: PlatformNotificationItem) => {
    if (!item.readAt) {
      try {
        await api.patch(`/notifications/${item.id}/read`, {});
        setData((prev) =>
          prev
            ? {
                ...prev,
                unreadCount: Math.max(0, prev.unreadCount - 1),
                items: prev.items.map((n) =>
                  n.id === item.id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n,
                ),
              }
            : prev,
        );
      } catch {
        /* ignore */
      }
    }
    const href = followHref(item);
    if (href) router.push(href);
  };

  const markAllRead = async () => {
    await api.post('/notifications/read-all', {});
    await load();
  };

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Notifications"
        description="Toutes les alertes de votre compte EventMaster."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Accueil', href: '/dashboard' }, { label: 'Notifications' }]} />}
        action={
          (data?.unreadCount ?? 0) > 0 ? (
            <Button variant="secondary" size="sm" leftIcon={<Check className="w-3.5 h-3.5" />} onClick={() => void markAllRead()}>
              Tout marquer lu
            </Button>
          ) : undefined
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      {/* Encart spécifique pour le Propriétaire d'organisation */}
      {isOwner && (
        <div className="p-4 rounded-2xl border border-primary/25 bg-primary/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-primary/15 text-primary">
                <Shield className="w-3.5 h-3.5" />
              </span>
              <p className="text-xs font-bold text-foreground">
                Gouvernance des alertes de l’organisation (Billetterie & Dons)
              </p>
            </div>
            <p className="text-xs text-muted">
              Définissez qui au sein de votre équipe a le droit de recevoir les notifications d’achat de billets et de dons solidaires.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={() => setShowOrgNotifModal(true)}
            leftIcon={<Sliders className="w-3.5 h-3.5" />}
            className="shrink-0"
          >
            Configurer les autorisations
          </Button>
        </div>
      )}

      <details className="group" open>
        <summary className="cursor-pointer text-sm font-medium text-foreground hover:text-foreground list-none flex items-center gap-2 min-h-11 py-1">
          <span>Canaux e-mail, WhatsApp, push</span>
          <span className="text-xs text-muted group-open:hidden">Afficher</span>
          <span className="text-xs text-muted hidden group-open:inline">Masquer</span>
        </summary>
        <div className="mt-3">
          <NotificationPreferencesCard />
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'events', 'tasks', 'billing', 'commissions', 'catalog'] as NotificationFamily[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setFamily(id);
              setPage(1);
            }}
            className={cn(
              'px-3 min-h-11 rounded-[var(--radius-button)] text-xs font-medium border transition',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              family === id
                ? 'bg-surface text-foreground border-border shadow-[var(--shadow-soft)]'
                : 'text-muted border-transparent hover:text-foreground',
            )}
          >
            {id === 'all' ? 'Toutes' : NOTIFICATION_FAMILY_LABELS[id as NotificationPrefFamily]}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs font-medium text-muted min-h-11">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => {
              setUnreadOnly(e.target.checked);
              setPage(1);
            }}
            className="rounded border-border w-4 h-4 accent-primary"
          />
          Non lues
        </label>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : !data?.items.length ? (
        <EmptyState icon={<Bell className="w-5 h-5" />} title={emptyCopy.title} description={emptyCopy.description} />
      ) : (
        <ul className="divide-y divide-border border border-border rounded-[var(--radius-card)] overflow-hidden bg-surface">
          {data.items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => void markRead(item)}
                className={cn(
                  'w-full text-left px-4 py-4 hover:bg-surface-muted/60 transition',
                  !item.readAt && 'bg-primary/5',
                )}
              >
                <div className="flex items-start gap-3">
                  {!item.readAt && <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />}
                  <div className={cn('min-w-0 space-y-1', item.readAt && 'pl-5')}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                        {notificationTypeLabel(item.type)}
                      </span>
                      <span className="text-[10px] text-muted">{notificationFamilyLabel(item.type)}</span>
                      <span className="text-[10px] text-muted">{formatWhen(item.createdAt)}</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-sm text-muted leading-relaxed">{item.message}</p>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {data && data.total > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={data.total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel="notifications"
        />
      )}

      {/* Modal de configuration des alertes de l'organisation pour le propriétaire */}
      <OrgNotificationSettingsModal
        isOpen={showOrgNotifModal}
        onClose={() => setShowOrgNotifModal(false)}
      />
    </div>
  );
}
