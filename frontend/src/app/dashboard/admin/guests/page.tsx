'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Eye, Loader2, LogIn, Trash2, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  PageHeader, Breadcrumbs, Alert, EmptyState, Pagination, Button, StatusPill,
  ProjectCard, ListRowAction, SkeletonTabContent, ViewModeToggle, useViewMode,
  usePageSize, listStackClass,
} from '@/components/ui';
import AdminDetailsModal from '@/components/admin/AdminDetailsModal';
import { unwrapAdminList, adminListParams } from '@/lib/adminList';

interface AdminGuestRow {
  id: string;
  eventId: string;
  eventTitle: string;
  tenantId: string | null;
  tenantName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  phoneCountryCode?: string | null;
  category: string;
  rsvp: string;
  preferences?: Record<string, unknown> | null;
  checkedInAt?: string | null;
  seatVerified?: boolean;
  seatingInvitationPdfUrl?: string | null;
  createdAt: string;
}

interface TenantOption {
  id: string;
  name: string;
}

function planBadgeClass() {
  return 'bg-surface-muted border-border text-muted';
}

function exportGuestsCsv(rows: AdminGuestRow[]) {
  const headers = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Catégorie', 'Statut RSVP', 'Événement', 'Organisation'];
  const body = rows.map((g) => {
    const phone = g.phone || '';
    const rsvp = g.rsvp === 'ACCEPTED' ? 'Accepté' : g.rsvp === 'DECLINED' ? 'Décliné' : 'En attente';
    return [g.firstName, g.lastName, g.email, phone, g.category || 'Général', rsvp, g.eventTitle, g.tenantName];
  });
  const csv = [headers, ...body]
    .map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'invites_eventmaster.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdminGuestsPage() {
  const router = useRouter();
  const { user, loading: authLoading, enterSupportSession } = useAuth();
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [rsvp, setRsvp] = useState('ALL');
  const [checkin, setCheckin] = useState('ALL');
  const [pdf, setPdf] = useState('ALL');
  const [org, setOrg] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('admin-guests', 12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState<AdminGuestRow[]>([]);
  const [total, setTotal] = useState(0);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [details, setDetails] = useState<AdminGuestRow | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const {
    mode: viewMode,
    setViewMode,
    columns,
    setGridColumns,
    gridClassName,
  } = useViewMode('em-view-admin-guests', 'grid', 3);

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

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') return;
    api
      .get(`/admin/tenants?${adminListParams({ limit: 100, sort: 'name' })}`)
      .then((data) => setTenants(unwrapAdminList<TenantOption>(data).items))
      .catch(() => { /* filtre org facultatif */ });
  }, [user?.role]);

  const load = useCallback(async () => {
    if (user?.role !== 'SUPER_ADMIN') return;
    setLoading(true);
    setError('');
    try {
      const qs = adminListParams({
        page,
        limit: pageSize,
        q,
        rsvp,
        checkin,
        pdf,
        org,
      });
      const data = await api.get(`/admin/guests?${qs}`);
      const list = unwrapAdminList<AdminGuestRow>(data);
      setItems(list.items);
      setTotal(list.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les invités.');
    } finally {
      setLoading(false);
    }
  }, [user?.role, page, pageSize, q, rsvp, checkin, pdf, org]);

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

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer l’invité « ${name} » ? Cette action est définitive.`)) return;
    try {
      await api.delete(`/admin/guests/${id}`);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression.');
    }
  };

  const handleExport = async () => {
    try {
      const qs = adminListParams({
        page: 1,
        limit: 100,
        q,
        rsvp,
        checkin,
        pdf,
        org,
      });
      const data = await api.get(`/admin/guests?${qs}`);
      const rows = unwrapAdminList<AdminGuestRow>(data).items;
      if (rows.length === 0) {
        alert('Aucun invité à exporter pour ces filtres.');
        return;
      }
      exportGuestsCsv(rows);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Export impossible.');
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
        title="Invités (supervision)"
        description="Liste globale, RSVP, PDF d’invitation et présence jour J. Export CSV limité aux 100 premiers résultats filtrés."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Accueil', href: '/dashboard?tab=overview' },
              { label: 'Invités' },
            ]}
          />
        }
        action={
          <Button type="button" size="sm" variant="secondary" onClick={() => void handleExport()} leftIcon={<Download className="w-4 h-4" />}>
            Exporter CSV
          </Button>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Rechercher un invité, un e-mail, un événement…"
          className="flex-1 bg-surface-muted border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground"
        />
        <div className="flex flex-wrap items-center gap-2">
          <select value={rsvp} onChange={(e) => { setRsvp(e.target.value); setPage(1); }} className={filterClass}>
            <option value="ALL">Tous les RSVP</option>
            <option value="PENDING">En attente</option>
            <option value="ACCEPTED">Accepté</option>
            <option value="DECLINED">Décliné</option>
          </select>
          <select value={checkin} onChange={(e) => { setCheckin(e.target.value); setPage(1); }} className={filterClass}>
            <option value="ALL">Présence</option>
            <option value="in">Enregistrés</option>
            <option value="out">Non enregistrés</option>
          </select>
          <select value={pdf} onChange={(e) => { setPdf(e.target.value); setPage(1); }} className={filterClass}>
            <option value="ALL">PDF invitation</option>
            <option value="delivered">PDF livré</option>
            <option value="missing">PDF non livré</option>
          </select>
          <select value={org} onChange={(e) => { setOrg(e.target.value); setPage(1); }} className={filterClass}>
            <option value="ALL">Toutes les organisations</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.name}>{t.name}</option>
            ))}
          </select>
          <ViewModeToggle
            storageKey="em-view-admin-guests"
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
          icon={<Users className="w-5 h-5" />}
          title="Aucun invité"
          description="Aucun invité ne correspond à ces filtres."
        />
      ) : (
        <div className={viewMode === 'grid' ? gridClassName : listStackClass}>
          {items.map((g) => {
            const rsvpTone = g.rsvp === 'ACCEPTED' ? 'emerald' : g.rsvp === 'DECLINED' ? 'rose' : 'amber';
            const rsvpLabel = g.rsvp === 'ACCEPTED' ? 'Accepté' : g.rsvp === 'DECLINED' ? 'Décliné' : 'En attente';
            const rsvpChip = <StatusPill tone={rsvpTone}>{rsvpLabel}</StatusPill>;
            const categoryChip = <StatusPill tone="slate">{g.category || 'Général'}</StatusPill>;
            const pdfChip = g.rsvp === 'ACCEPTED' ? (
              <StatusPill tone={g.seatingInvitationPdfUrl ? 'emerald' : 'rose'}>
                {g.seatingInvitationPdfUrl ? 'PDF livré' : 'PDF manquant'}
              </StatusPill>
            ) : null;
            const checkinChip = g.checkedInAt ? <StatusPill tone="primary">Présent</StatusPill> : null;
            return (
              <ProjectCard
                key={g.id}
                id={g.id}
                title={`${g.lastName} ${g.firstName}`}
                layout={viewMode}
                icon={<Users className="w-4 h-4" />}
                badge={rsvpChip}
                overlayMeta={g.eventTitle}
                ctaLabel="Fiche invité"
                onClick={() => setDetails(g)}
                meta={
                  viewMode === 'list' ? (
                    <span className="truncate">
                      {g.email}
                      {' · '}
                      {g.eventTitle}
                      {' · '}
                      {g.tenantName}
                    </span>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="truncate text-xs">{g.email}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {rsvpChip}
                        {categoryChip}
                        {pdfChip}
                        {checkinChip}
                      </div>
                      <p className="truncate text-xs font-medium">{g.eventTitle}</p>
                      <p className="truncate text-[11px] text-muted">{g.tenantName}</p>
                    </div>
                  )
                }
                status={viewMode === 'list' ? rsvpChip : undefined}
                aside={viewMode === 'list' ? (pdfChip || categoryChip) : undefined}
                actions={
                  <>
                    {viewMode === 'list' ? (
                      <button type="button" onClick={() => setDetails(g)} className="inline-flex items-center" title="Voir détails">
                        <ListRowAction />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDetails(g)}
                        className="p-1.5 text-muted hover:text-foreground hover:bg-surface-muted rounded-md transition"
                        title="Détails"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    {g.tenantId && (
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          void openWorkspace(g.tenantId as string);
                        }}
                        disabled={openingId === g.tenantId}
                        className="p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded-md transition disabled:opacity-50"
                        title="Ouvrir l’espace"
                      >
                        {openingId === g.tenantId ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(g.id, `${g.firstName} ${g.lastName}`)}
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
        itemLabel="invités"
      />

      <AdminDetailsModal
        open={Boolean(details)}
        type="guest"
        data={details}
        onClose={() => setDetails(null)}
        onOpenWorkspace={details?.tenantId ? () => openWorkspace(details.tenantId as string) : undefined}
        openingWorkspace={openingId === details?.tenantId}
        planBadgeClass={planBadgeClass}
      />
    </div>
  );
}
