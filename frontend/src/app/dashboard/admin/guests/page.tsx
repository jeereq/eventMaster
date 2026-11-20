'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Loader2, LogIn, MoreHorizontal, SlidersHorizontal, Trash2, Users, X } from '@/components/icons';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  PageHeader,
  Alert,
  EmptyState,
  Pagination,
  Button,
  StatusPill,
  ProjectCard,
  SkeletonTabContent,
  Modal,
  ConfirmDialog,
  OverflowMenu,
  ViewModeToggle,
  useViewMode,
  usePageSize,
  listStackClass,
} from '@/components/ui';
import AdminDetailsModal from '@/components/admin/AdminDetailsModal';
import { CatalogueChoicePills, CatalogueFilterField } from '@/components/CatalogueFilterBar';
import { unwrapAdminList, adminListParams } from '@/lib/adminList';
import useIsMobile from '@/hooks/useIsMobile';
import { confirmSupportSession } from '@/lib/confirmSupportSession';

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
  const headers = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Catégorie', 'Statut de réponse', 'Événement', 'Organisation'];
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
  const [category, setCategory] = useState('ALL');
  const [rsvp, setRsvp] = useState('ALL');
  const [checkin, setCheckin] = useState('ALL');
  const [pdf, setPdf] = useState('ALL');
  const [org, setOrg] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('admin-guests', 12);
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState<AdminGuestRow[]>([]);
  const [total, setTotal] = useState(0);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [details, setDetails] = useState<AdminGuestRow | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const {
    mode: viewMode,
    setViewMode,
    columns,
    setGridColumns,
    gridClassName,
  } = useViewMode('em-view-admin-guests', 'grid', 3);

  const canAccess = Boolean(
    user?.role === 'SUPER_ADMIN' ||
    (user?.role === 'COMMERCIAL' && user?.commercialPermissions?.canManageGuests)
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (!canAccess) router.replace('/dashboard');
  }, [authLoading, user, canAccess, router]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    if (!canAccess) return;
    api
      .get(`/admin/tenants?${adminListParams({ limit: 100, sort: 'name' })}`)
      .then((data) => setTenants(unwrapAdminList<TenantOption>(data).items))
      .catch(() => { /* filtre org facultatif */ });
  }, [canAccess]);

  const load = useCallback(async () => {
    if (!canAccess) return;
    setLoading(true);
    setError('');
    try {
      const qs = adminListParams({
        page,
        limit: pageSize,
        q,
        category: category !== 'ALL' ? category : undefined,
        rsvp,
        checkin,
        pdf,
        org,
      });
      const data = await api.get(`/admin/guests?${qs}`);
      const list = unwrapAdminList<AdminGuestRow>(data);
      setItems((prev) => (isMobile && page > 1 ? [...prev, ...list.items] : list.items));
      setTotal(list.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les invités.');
    } finally {
      setLoading(false);
    }
  }, [user?.role, page, pageSize, q, category, rsvp, checkin, pdf, org, isMobile, canAccess]);

  useEffect(() => {
    void load();
  }, [load]);

  const openWorkspace = async (tenantId: string) => {
    if (!confirmSupportSession()) return;
    try {
      setOpeningId(tenantId);
      const payload = await api.post(`/admin/tenants/${tenantId}/impersonate`);
      enterSupportSession(payload);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Impossible d’ouvrir l’espace de cette organisation.');
      setOpeningId(null);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/guests/${pendingDelete.id}`);
      setPendingDelete(null);
      await load();
    } catch (err: unknown) {
      setPendingDelete(null);
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression.');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      const qs = adminListParams({
        page: 1,
        limit: 100,
        q,
        category: category !== 'ALL' ? category : undefined,
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

  if (authLoading || !canAccess) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const advancedCount = [checkin, pdf, org].filter((v) => v !== 'ALL').length;

  const filterClass =
    'bg-surface-muted border border-border rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary min-h-11 shrink-0';

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        note="Export limité à 100 lignes"
        action={
          <Button type="button" size="sm" variant="secondary" onClick={() => void handleExport()} leftIcon={<Download className="w-4 h-4" />}>
            Exporter CSV
          </Button>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Rechercher un invité, un e-mail, un événement…"
            aria-label="Rechercher un invité, un e-mail ou un événement"
            className="w-full bg-surface-muted border border-border rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {qInput && (
            <button
              type="button"
              onClick={() => {
                setQInput('');
                setPage(1);
              }}
              aria-label="Effacer la recherche d'invités"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-foreground rounded-full hover:bg-surface transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 sm:pb-0 [scrollbar-width:none] w-full sm:w-auto shrink-0">
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            aria-label="Filtrer par catégorie d'invité"
            className={filterClass}
          >
            <option value="ALL">Toutes catégories</option>
            <option value="Donateur">Donateur</option>
            <option value="VIP">VIP</option>
            <option value="Famille">Famille</option>
            <option value="Protocole">Protocole</option>
            <option value="Presse">Presse</option>
            <option value="Général">Général</option>
          </select>
          <select
            value={rsvp}
            onChange={(e) => { setRsvp(e.target.value); setPage(1); }}
            aria-label="Filtrer par statut de réponse"
            className={filterClass}
          >
            <option value="ALL">Toutes les réponses</option>
            <option value="PENDING">En attente</option>
            <option value="ACCEPTED">Confirmé</option>
            <option value="DECLINED">Décliné</option>
          </select>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setFiltersOpen(true)}
            leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
            className="shrink-0 !min-h-11"
          >
            Filtres
            {advancedCount > 0 ? (
              <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-surface-muted px-1 text-xs font-semibold tabular-nums">
                {advancedCount}
              </span>
            ) : null}
          </Button>
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
        <EmptyState illustration="guests"
          icon={<Users className="w-5 h-5" />}
          title="Liste vide"
          description="Aucun invité ne correspond à ces critères."
        />
      ) : (
        <div className={viewMode === 'grid' ? gridClassName : listStackClass}>
          {items.map((g) => {
            const rsvpTone = g.rsvp === 'ACCEPTED' ? 'emerald' : g.rsvp === 'DECLINED' ? 'rose' : 'amber';
            const rsvpLabel = g.rsvp === 'ACCEPTED' ? 'Confirmé' : g.rsvp === 'DECLINED' ? 'Décliné' : 'En attente';
            const rsvpChip = <StatusPill tone={rsvpTone}>{rsvpLabel}</StatusPill>;
            const categoryTone = g.category === 'Donateur' ? 'rose' : g.category === 'VIP' ? 'amber' : 'slate';
            const categoryChip = <StatusPill tone={categoryTone}>{g.category || 'Général'}</StatusPill>;
            const pdfChip = g.rsvp === 'ACCEPTED' ? (
              <StatusPill tone={g.seatingInvitationPdfUrl ? 'emerald' : 'rose'}>
                {g.seatingInvitationPdfUrl ? 'PDF livré' : 'PDF manquant'}
              </StatusPill>
            ) : null;
            const checkinChip = g.checkedInAt ? <StatusPill tone="primary">Entré</StatusPill> : null;
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
                        {categoryChip}
                        {pdfChip}
                        {checkinChip}
                      </div>
                      <p className="truncate text-xs font-medium">{g.eventTitle}</p>
                      <p className="truncate text-xs text-muted">{g.tenantName}</p>
                    </div>
                  )
                }
                status={viewMode === 'list' ? rsvpChip : undefined}
                aside={viewMode === 'list' ? (pdfChip || categoryChip) : undefined}
                actions={
                  <OverflowMenu
                    align="right"
                    triggerLabel={`Autres actions pour ${g.firstName} ${g.lastName}`}
                    triggerClassName="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-surface-muted transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    trigger={
                      openingId && openingId === g.tenantId
                        ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
                        : <MoreHorizontal className="w-5 h-5" aria-hidden />
                    }
                    items={[
                      ...(g.tenantId
                        ? [{
                            id: 'workspace',
                            label: 'Ouvrir l’espace',
                            icon: LogIn,
                            disabled: openingId === g.tenantId,
                            onSelect: () => void openWorkspace(g.tenantId as string),
                          }]
                        : []),
                      {
                        id: 'delete',
                        label: 'Supprimer',
                        icon: Trash2,
                        danger: true,
                        onSelect: () => setPendingDelete({ id: g.id, name: `${g.firstName} ${g.lastName}` }),
                      },
                    ]}
                  />
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
        loading={loading}
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

      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtres invités"
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setCheckin('ALL');
                setPdf('ALL');
                setOrg('ALL');
                setPage(1);
              }}
            >
              Tout effacer
            </Button>
            <Button type="button" onClick={() => setFiltersOpen(false)}>
              Voir les résultats
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <CatalogueFilterField label="Présence">
            <CatalogueChoicePills
              options={[
                { id: 'all', label: 'Tous' },
                { id: 'in', label: 'Entrés' },
                { id: 'out', label: 'Pas encore entrés' },
              ]}
              value={checkin === 'ALL' ? 'all' : checkin}
              onChange={(id) => { setCheckin(id && id !== 'all' ? id : 'ALL'); setPage(1); }}
            />
          </CatalogueFilterField>
          <CatalogueFilterField label="PDF invitation">
            <CatalogueChoicePills
              options={[
                { id: 'all', label: 'Tous' },
                { id: 'delivered', label: 'PDF livré' },
                { id: 'missing', label: 'PDF non livré' },
              ]}
              value={pdf === 'ALL' ? 'all' : pdf}
              onChange={(id) => { setPdf(id && id !== 'all' ? id : 'ALL'); setPage(1); }}
            />
          </CatalogueFilterField>
          <CatalogueFilterField label="Organisation">
            <select
              value={org}
              onChange={(e) => { setOrg(e.target.value); setPage(1); }}
              aria-label="Filtrer par organisation"
              className={`${filterClass} w-full`}
            >
              <option value="ALL">Toutes les organisations</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </CatalogueFilterField>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Supprimer l’invité"
        description={`Supprimer l’invité « ${pendingDelete?.name ?? ''} » ? Cette action est définitive.`}
        confirmLabel="Supprimer"
        tone="danger"
        loading={deleting}
      />
    </div>
  );
}
