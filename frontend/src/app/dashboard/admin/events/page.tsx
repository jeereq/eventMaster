'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar, Eye, Loader2, LogIn, MapPin, Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  PageHeader, Breadcrumbs, Alert, EmptyState, Pagination, StatusPill,
  ProjectCard, ListRowAction, SkeletonTabContent, ViewModeToggle, useViewMode,
  usePageSize, listStackClass,
} from '@/components/ui';
import AdminDetailsModal from '@/components/admin/AdminDetailsModal';
import { unwrapAdminList, adminListParams } from '@/lib/adminList';

interface AdminEventRow {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  location: string;
  reminderFrequency?: string;
  latitude?: number | null;
  longitude?: number | null;
  isPublic?: boolean;
  ticketingEnabled?: boolean;
  ticketPriceFc?: number | null;
  ticketsSold?: number;
  ticketsTotal?: number | null;
  tenantId: string;
  tenantName: string;
  guestCount: number;
  invitationCount: number;
  createdAt: string;
}

function planBadgeClass() {
  return 'bg-surface-muted border-border text-muted';
}

export default function AdminEventsPage() {
  const router = useRouter();
  const { user, loading: authLoading, enterSupportSession } = useAuth();
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [visibility, setVisibility] = useState('ALL');
  const [ticketing, setTicketing] = useState('ALL');
  const [gps, setGps] = useState('ALL');
  const [when, setWhen] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('admin-events', 12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState<AdminEventRow[]>([]);
  const [total, setTotal] = useState(0);
  const [details, setDetails] = useState<AdminEventRow | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const {
    mode: viewMode,
    setViewMode,
    columns,
    setGridColumns,
    gridClassName,
  } = useViewMode('em-view-admin-events', 'grid', 3);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (user.role !== 'SUPER_ADMIN') router.replace('/dashboard');
  }, [authLoading, user, router]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [qInput]);

  const load = useCallback(async () => {
    if (user?.role !== 'SUPER_ADMIN') return;
    setLoading(true);
    setError('');
    try {
      const qs = adminListParams({
        page,
        limit: pageSize,
        q,
        visibility,
        ticketing,
        gps,
        when,
      });
      const data = await api.get(`/admin/events?${qs}`);
      const list = unwrapAdminList<AdminEventRow>(data);
      setItems(list.items);
      setTotal(list.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les événements.');
    } finally {
      setLoading(false);
    }
  }, [user?.role, page, pageSize, q, visibility, ticketing, gps, when]);

  useEffect(() => {
    void load();
  }, [load]);

  const openWorkspace = async (tenantId: string) => {
    try {
      setOpeningId(tenantId);
      const payload = await api.post(`/admin/tenants/${tenantId}/impersonate`);
      enterSupportSession(payload);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Impossible d’ouvrir l’espace de cette organisation.');
      setOpeningId(null);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Supprimer l’événement « ${title} » ? Cette action est définitive.`)) return;
    try {
      await api.delete(`/admin/events/${id}`);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression.');
    }
  };

  if (authLoading || user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const filterClass =
    'bg-surface-muted border border-border rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary';

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Événements (supervision)"
        description="Vue transversale de tous les événements : public / privé, billets, GPS. Détail, impersonation et suppression — pas de création depuis ici."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Accueil', href: '/dashboard?tab=overview' },
              { label: 'Événements' },
            ]}
          />
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Rechercher un événement, un lieu, une organisation…"
          className="flex-1 bg-surface-muted border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground"
        />
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={when}
            onChange={(e) => { setWhen(e.target.value); setPage(1); }}
            className={filterClass}
          >
            <option value="ALL">Toutes les dates</option>
            <option value="upcoming">À venir</option>
            <option value="past">Passés</option>
          </select>
          <select
            value={visibility}
            onChange={(e) => { setVisibility(e.target.value); setPage(1); }}
            className={filterClass}
          >
            <option value="ALL">Public / privé</option>
            <option value="public">Public</option>
            <option value="private">Privé</option>
          </select>
          <select
            value={ticketing}
            onChange={(e) => { setTicketing(e.target.value); setPage(1); }}
            className={filterClass}
          >
            <option value="ALL">Billetterie</option>
            <option value="yes">Avec billets</option>
            <option value="no">Sans billets</option>
          </select>
          <select
            value={gps}
            onChange={(e) => { setGps(e.target.value); setPage(1); }}
            className={filterClass}
          >
            <option value="ALL">GPS</option>
            <option value="yes">Avec GPS</option>
            <option value="no">Sans GPS</option>
          </select>
          <ViewModeToggle
            storageKey="em-view-admin-events"
            value={viewMode}
            onChange={setViewMode}
            columns={columns}
            onColumnsChange={setGridColumns}
            defaultMode="grid"
            defaultColumns={3}
          />
        </div>
      </div>

      {loading ? (
        <SkeletonTabContent mode={viewMode === 'list' ? 'list' : 'grid'} count={6} columns={3} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-5 h-5" />}
          title="Aucun événement"
          description="Aucun événement ne correspond à ces filtres."
        />
      ) : (
        <div className={viewMode === 'grid' ? gridClassName : listStackClass}>
          {items.map((e) => {
            const dateLabel = new Date(e.date).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            const guestsChip = <StatusPill tone="primary">{e.guestCount} invités</StatusPill>;
            const invitesChip = <StatusPill tone="emerald">{e.invitationCount} invitations</StatusPill>;
            const visibilityChip = (
              <StatusPill tone={e.isPublic ? 'primary' : 'slate'}>{e.isPublic ? 'Public' : 'Privé'}</StatusPill>
            );
            const ticketsChip = e.ticketingEnabled ? (
              <StatusPill tone="amber">{e.ticketsSold || 0} billets</StatusPill>
            ) : null;
            return (
              <ProjectCard
                key={e.id}
                id={e.id}
                title={e.title}
                layout={viewMode}
                icon={<Calendar className="w-4 h-4" />}
                onClick={() => setDetails(e)}
                meta={
                  viewMode === 'list' ? (
                    <span className="truncate">
                      {e.tenantName}
                      {' · '}
                      {e.location || 'Sans lieu'}
                      {' · '}
                      {dateLabel}
                    </span>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="truncate text-xs font-medium">{e.tenantName}</p>
                      <p className="truncate text-xs text-muted flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {e.location || 'Sans lieu'}
                      </p>
                      <p className="text-[11px] text-muted">{dateLabel}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {visibilityChip}
                        {ticketsChip}
                        {guestsChip}
                        {invitesChip}
                      </div>
                    </div>
                  )
                }
                value={viewMode === 'list' ? `${e.guestCount} inv.` : undefined}
                valueMeta={viewMode === 'list' ? `${e.invitationCount} invitations` : undefined}
                status={viewMode === 'list' ? guestsChip : undefined}
                actions={
                  <>
                    {viewMode === 'list' ? (
                      <button type="button" onClick={() => setDetails(e)} className="inline-flex items-center" title="Voir détails">
                        <ListRowAction />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDetails(e)}
                        className="p-1.5 text-muted hover:text-foreground hover:bg-surface-muted rounded-md transition"
                        title="Détails"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        void openWorkspace(e.tenantId);
                      }}
                      disabled={openingId === e.tenantId}
                      className="p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded-md transition disabled:opacity-50"
                      title="Ouvrir l’espace"
                    >
                      {openingId === e.tenantId ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(e.id, e.title)}
                      className="p-1.5 text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                }
              />
            );
          })}
        </div>
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        itemLabel="événements"
      />

      <AdminDetailsModal
        open={Boolean(details)}
        type="event"
        data={details}
        onClose={() => setDetails(null)}
        onOpenWorkspace={details?.tenantId ? () => openWorkspace(details.tenantId) : undefined}
        openingWorkspace={openingId === details?.tenantId}
        planBadgeClass={planBadgeClass}
      />
    </div>
  );
}
