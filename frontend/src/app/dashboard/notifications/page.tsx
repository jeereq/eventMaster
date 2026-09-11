'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Bell,
  Check,
  Loader2,
  Shield,
  Sliders,
  Ticket,
  Heart,
  Users,
  Lock,
  ChevronRight,
  Info,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  PageHeader,
  Breadcrumbs,
  Button,
  EmptyState,
  Pagination,
  Alert,
  usePageSize,
  Card,
  CardHeader,
} from '@/components/ui';
import NotificationPreferencesCard from '@/components/NotificationPreferencesCard';
import OrgNotificationSettingsModal, {
  type TenantNotificationSettings,
} from '@/components/OrgNotificationSettingsModal';
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

type NotificationTab = 'inbox' | 'preferences';

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

function NotificationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, access, tenant } = useAuth();
  const isOwner = Boolean(access?.isOwner) || (Boolean(user?.id) && user?.id === tenant?.managerId);
  const isOrgMember = Boolean(tenant && user?.role === 'USER' && tenant.accountKind !== 'CLIENT');

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<NotificationTab>(
    tabParam === 'preferences' ? 'preferences' : 'inbox',
  );

  const [showOrgNotifModal, setShowOrgNotifModal] = useState(false);
  const [orgSettings, setOrgSettings] = useState<TenantNotificationSettings | null>(null);
  const [loadingOrgSettings, setLoadingOrgSettings] = useState(false);

  const [family, setFamily] = useState<NotificationFamily>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('notifications', 20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<NotificationsResponse | null>(null);

  // Synchronisation avec l'URL
  useEffect(() => {
    if (tabParam === 'preferences' || tabParam === 'inbox') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (newTab: NotificationTab) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.replace(`/dashboard/notifications?${params.toString()}`);
  };

  // Chargement des paramètres d'organisation si membre
  const loadOrgSettings = useCallback(async () => {
    if (!isOrgMember) return;
    setLoadingOrgSettings(true);
    try {
      const res = await api.get('/team/notification-settings');
      if (res?.settings) {
        setOrgSettings(res.settings);
      }
    } catch {
      // Ignorer si non disponible
    } finally {
      setLoadingOrgSettings(false);
    }
  }, [isOrgMember]);

  useEffect(() => {
    if (activeTab === 'preferences' && isOrgMember) {
      void loadOrgSettings();
    }
  }, [activeTab, isOrgMember, loadOrgSettings]);

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
    if (activeTab === 'inbox') {
      void load();
    }
  }, [activeTab, load]);

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

  const recipientModeLabel = (mode?: string) => {
    if (mode === 'OWNER_ONLY') return 'Propriétaire uniquement (Direction)';
    if (mode === 'CUSTOM') return 'Membres personnalisés';
    return 'Propriétaire + Tous les Managers';
  };

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Notifications"
        description="Consultez vos alertes en temps réel et personnalisez vos canaux de diffusion."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Accueil', href: '/dashboard' }, { label: 'Notifications' }]} />}
        action={
          activeTab === 'inbox' && (data?.unreadCount ?? 0) > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Check className="w-3.5 h-3.5" />}
              onClick={() => void markAllRead()}
            >
              Tout marquer lu
            </Button>
          ) : undefined
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      {/* Barre d'onglets principale */}
      <div
        role="tablist"
        aria-label="Navigation des notifications"
        className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto"
      >
        <button
          role="tab"
          id="tab-inbox"
          aria-controls="panel-inbox"
          aria-selected={activeTab === 'inbox'}
          tabIndex={activeTab === 'inbox' ? 0 : -1}
          type="button"
          onClick={() => handleTabChange('inbox')}
          className={cn(
            'inline-flex min-h-11 items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition touch-manipulation shrink-0',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
            activeTab === 'inbox'
              ? 'bg-foreground text-background shadow-xs'
              : 'text-muted hover:text-foreground hover:bg-surface-muted',
          )}
        >
          <Bell className="w-4 h-4 text-primary" />
          <span>Boîte de réception</span>
          {(data?.unreadCount ?? 0) > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-primary text-primary-foreground">
              {data?.unreadCount}
            </span>
          )}
        </button>

        <button
          role="tab"
          id="tab-preferences"
          aria-controls="panel-preferences"
          aria-selected={activeTab === 'preferences'}
          tabIndex={activeTab === 'preferences' ? 0 : -1}
          type="button"
          onClick={() => handleTabChange('preferences')}
          className={cn(
            'inline-flex min-h-11 items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition touch-manipulation shrink-0',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
            activeTab === 'preferences'
              ? 'bg-foreground text-background shadow-xs'
              : 'text-muted hover:text-foreground hover:bg-surface-muted',
          )}
        >
          <Sliders className="w-4 h-4 text-primary" />
          <span>Préférences & Canaux</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          ONGLET 1 : BOÎTE DE RÉCEPTION (INBOX)
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'inbox' && (
        <section id="panel-inbox" role="tabpanel" aria-labelledby="tab-inbox" className="space-y-4">
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
            <label className="ml-auto flex items-center gap-2 text-xs font-medium text-muted min-h-11 cursor-pointer select-none">
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
            <EmptyState
              icon={<Bell className="w-5 h-5" />}
              title={emptyCopy.title}
              description={emptyCopy.description}
            />
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
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          ONGLET 2 : PRÉFÉRENCES & CANAUX
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'preferences' && (
        <section id="panel-preferences" role="tabpanel" aria-labelledby="tab-preferences" className="space-y-6">
          {/* Section 1 : Gouvernance de l'organisation (Réservé au Propriétaire) */}
          {isOwner && (
            <Card>
              <CardHeader
                title={
                  <span className="inline-flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" aria-hidden />
                    Gouvernance Organisation · Billetterie & Dons
                  </span>
                }
                description="En tant que propriétaire, définissez qui au sein de votre organisation a le droit de recevoir les notifications d'achat de billets et de dons."
                action={
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setShowOrgNotifModal(true)}
                    leftIcon={<Sliders className="w-3.5 h-3.5" />}
                  >
                    Configurer les autorisations
                  </Button>
                }
              />

              <div className="space-y-4 pt-1">
                {loadingOrgSettings ? (
                  <div className="flex items-center gap-2 py-4 text-xs text-muted">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Chargement des paramètres de l&apos;organisation...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Statut Billets */}
                    <div className="p-3.5 rounded-xl border border-border bg-surface-muted/40 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                          <Ticket className="w-3.5 h-3.5 text-primary" />
                          Ventes Billets
                        </span>
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full',
                            orgSettings?.ticketsEnabled !== false
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                              : 'bg-surface-muted text-muted border border-border',
                          )}
                        >
                          {orgSettings?.ticketsEnabled !== false ? 'Activé' : 'Désactivé'}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-1">
                        Alertes instantanées lors des paiements de places.
                      </p>
                    </div>

                    {/* Statut Dons */}
                    <div className="p-3.5 rounded-xl border border-border bg-surface-muted/40 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 text-rose-500" />
                          Dons Solidaires
                        </span>
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full',
                            orgSettings?.donationsEnabled !== false
                              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                              : 'bg-surface-muted text-muted border border-border',
                          )}
                        >
                          {orgSettings?.donationsEnabled !== false ? 'Activé' : 'Désactivé'}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-1">
                        Alertes avec montant, mot de soutien et donateur.
                      </p>
                    </div>

                    {/* Destinataires */}
                    <div className="p-3.5 rounded-xl border border-border bg-surface-muted/40 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-blue-500" />
                          Destinataires
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {orgSettings?.recipientMode === 'OWNER_ONLY'
                            ? 'Direction'
                            : orgSettings?.recipientMode === 'CUSTOM'
                            ? `${orgSettings?.customUserIds?.length || 0} membre(s)`
                            : 'Managers'}
                        </span>
                      </div>
                      <p className="text-xs text-foreground font-semibold truncate mt-1">
                        {recipientModeLabel(orgSettings?.recipientMode)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Section 2 : Pour les collaborateurs non-propriétaires */}
          {!isOwner && isOrgMember && (
            <div className="p-4 rounded-2xl border border-border bg-surface-muted/50 flex items-start gap-3">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs text-muted leading-relaxed">
                <p className="font-semibold text-foreground">Gouvernance des alertes de l&apos;organisation</p>
                <p>
                  Les règles de distribution des alertes de vente de billets et de dons sont gérées exclusivement
                  par le propriétaire de l’organisation. Vos réglages ci-dessous définissent les canaux sur lesquels vous
                  recevez vos notifications personnelles.
                </p>
              </div>
            </div>
          )}

          {/* Section 3 : Canaux d'alerte personnels (E-mail, WhatsApp, Push) */}
          <NotificationPreferencesCard />
        </section>
      )}

      {/* Modal de configuration des alertes de l'organisation pour le propriétaire */}
      <OrgNotificationSettingsModal
        isOpen={showOrgNotifModal}
        onClose={() => setShowOrgNotifModal(false)}
        onSaved={(updated) => setOrgSettings(updated)}
      />
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      }
    >
      <NotificationsContent />
    </Suspense>
  );
}
