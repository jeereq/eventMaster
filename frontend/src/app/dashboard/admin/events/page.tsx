'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar, Loader2, LogIn, MapPin, MoreHorizontal, SlidersHorizontal, Trash2, AlertTriangle, Heart, X
} from '@/components/icons';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Alert,
  EmptyState,
  Pagination,
  StatusPill,
  ProjectCard,
  SkeletonTabContent,
  ViewModeToggle,
  useViewMode,
  usePageSize,
  listStackClass,
  Button,
  Modal,
  ConfirmDialog,
  OverflowMenu,
} from '@/components/ui';
import AdminDetailsModal from '@/components/admin/AdminDetailsModal';
import { CatalogueChoicePills, CatalogueFilterField } from '@/components/CatalogueFilterBar';
import { unwrapAdminList, adminListParams } from '@/lib/adminList';
import { formatFc } from '@/config/landingPricing';
import useIsMobile from '@/hooks/useIsMobile';
import { confirmSupportSession } from '@/lib/confirmSupportSession';

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
  isBlockedByAdmin?: boolean;
  adminBlockReason?: string | null;
  hasDonations?: boolean;
  donationTargetFc?: number | null;
  donationMinAmountFc?: number;
  donationCause?: string | null;
  donationCollectedFc?: number;
  donorsCount?: number;
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
  const [donations, setDonations] = useState('ALL');
  const [gps, setGps] = useState('ALL');
  const [when, setWhen] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('admin-events', 12);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const [error, setError] = useState('');
  const [items, setItems] = useState<AdminEventRow[]>([]);
  const [total, setTotal] = useState(0);
  const [details, setDetails] = useState<AdminEventRow | null>(null);
  const [moderation, setModeration] = useState<{ id: string, title: string, isBlocked: boolean } | null>(null);
  const [moderationReason, setModerationReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const {
    mode: viewMode,
    setViewMode,
    columns,
    setGridColumns,
    gridClassName,
  } = useViewMode('em-view-admin-events', 'grid', 3);

  const canAccess = Boolean(
    user?.role === 'SUPER_ADMIN' ||
    (user?.role === 'COMMERCIAL' && user?.commercialPermissions?.canManageEvents)
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

  const load = useCallback(async () => {
    if (!canAccess) return;
    setLoading(true);
    setError('');
    try {
      const qs = adminListParams({
        page,
        limit: pageSize,
        q,
        visibility,
        ticketing,
        donations,
        gps,
        when,
      });
      const data = await api.get(`/admin/events?${qs}`);
      const list = unwrapAdminList<AdminEventRow>(data);
      setItems((prev) => (isMobile && page > 1 ? [...prev, ...list.items] : list.items));
      setTotal(list.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les événements.');
    } finally {
      setLoading(false);
    }
  }, [user?.role, page, pageSize, q, visibility, ticketing, donations, gps, when, isMobile, canAccess]);

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
      await api.delete(`/admin/events/${pendingDelete.id}`);
      setPendingDelete(null);
      await load();
    } catch (err: unknown) {
      setPendingDelete(null);
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression.');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!moderation) return;
    if (!moderation.isBlocked && moderationReason.trim().length < 8) {
      setError('Indiquez un motif d’au moins 8 caractères pour bloquer cet événement.');
      return;
    }
    
    setBusyId(moderation.id);
    setError('');
    
    try {
      await api.patch(`/admin/events/${moderation.id}/block`, {
        isBlocked: !moderation.isBlocked,
        reason: moderationReason.trim() || undefined,
      });
      setModeration(null);
      setModerationReason('');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de bloquer/débloquer cet événement.');
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading || !canAccess) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const advancedCount = [ticketing, donations, gps].filter((v) => v !== 'ALL').length;

  const filterClass =
    'bg-surface-muted border border-border rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary min-h-11 shrink-0';

  return (
    <div className="space-y-6 w-full">

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Rechercher un événement, un lieu, une organisation…"
            aria-label="Rechercher un événement, un lieu ou une organisation"
            className="w-full bg-surface-muted border border-border rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {qInput && (
            <button
              type="button"
              onClick={() => {
                setQInput('');
                setPage(1);
              }}
              aria-label="Effacer la recherche d'événements"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-foreground rounded-full hover:bg-surface transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 sm:pb-0 [scrollbar-width:none] w-full sm:w-auto shrink-0">
          <select
            value={when}
            onChange={(e) => { setWhen(e.target.value); setPage(1); }}
            aria-label="Filtrer par date de l'événement"
            className={filterClass}
          >
            <option value="ALL">Toutes les dates</option>
            <option value="upcoming">À venir</option>
            <option value="past">Passés</option>
          </select>
          <select
            value={visibility}
            onChange={(e) => { setVisibility(e.target.value); setPage(1); }}
            aria-label="Filtrer par visibilité public ou privé"
            className={filterClass}
          >
            <option value="ALL">Public / privé</option>
            <option value="public">Public</option>
            <option value="private">Privé</option>
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
        <EmptyState illustration="events"
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
            const isBlocked = (e as any).isBlockedByAdmin;
            const visibilityChip = (
              <StatusPill tone={isBlocked ? 'rose' : e.isPublic ? 'primary' : 'slate'}>{isBlocked ? 'Bloqué' : e.isPublic ? 'Public' : 'Privé'}</StatusPill>
            );
            const ticketsChip = e.ticketingEnabled ? (
              <StatusPill tone="amber">{e.ticketsSold || 0} billets</StatusPill>
            ) : null;
            const donationChip = e.hasDonations ? (
              <StatusPill tone="rose" className="inline-flex items-center gap-1 font-semibold">
                <Heart className="w-2.5 h-2.5" />
                {formatFc(e.donationCollectedFc || 0)} dons
              </StatusPill>
            ) : null;
            return (
              <ProjectCard
                key={e.id}
                id={e.id}
                title={e.title}
                layout={viewMode}
                icon={<Calendar className="w-4 h-4" />}
                badge={visibilityChip}
                overlayMeta={dateLabel}
                ctaLabel="Voir l’événement"
                onClick={() => setDetails(e)}
                meta={
                  viewMode === 'list' ? (
                    <span className="truncate">
                      {e.tenantName}
                      {' · '}
                      {e.location || 'Sans lieu'}
                      {' · '}
                      {dateLabel}
                      {e.hasDonations && ` · ${formatFc(e.donationCollectedFc || 0)} dons`}
                    </span>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="truncate text-xs font-medium">{e.tenantName}</p>
                      <p className="truncate text-xs text-muted flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {e.location || 'Sans lieu'}
                      </p>
                      <p className="text-xs text-muted">{dateLabel}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {ticketsChip}
                        {donationChip}
                        {guestsChip}
                        {invitesChip}
                      </div>
                      {isBlocked && (e as any).adminBlockReason && (
                        <p className="text-xs text-rose-600 dark:text-rose-400 font-medium truncate">
                          Motif : {(e as any).adminBlockReason}
                        </p>
                      )}
                    </div>
                  )
                }
                value={viewMode === 'list' ? `${e.guestCount} inv.` : undefined}
                valueMeta={viewMode === 'list' ? `${e.invitationCount} invitations` : undefined}
                status={viewMode === 'list' ? guestsChip : undefined}
                actions={
                  <OverflowMenu
                    align="right"
                    triggerLabel={`Autres actions pour ${e.title}`}
                    triggerClassName="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-surface-muted transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    trigger={
                      openingId === e.tenantId
                        ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
                        : <MoreHorizontal className="w-5 h-5" aria-hidden />
                    }
                    items={[
                      {
                        id: 'block',
                        label: isBlocked ? 'Débloquer' : 'Bloquer',
                        icon: AlertTriangle,
                        onSelect: () => {
                          setModeration({ id: e.id, title: e.title, isBlocked: (e as any).isBlockedByAdmin });
                          setModerationReason('');
                        },
                      },
                      {
                        id: 'workspace',
                        label: 'Ouvrir l’espace',
                        icon: LogIn,
                        disabled: openingId === e.tenantId,
                        onSelect: () => void openWorkspace(e.tenantId),
                      },
                      {
                        id: 'delete',
                        label: 'Supprimer',
                        icon: Trash2,
                        danger: true,
                        onSelect: () => setPendingDelete({ id: e.id, title: e.title }),
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
        itemLabel="événements"
        loading={loading}
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
      
      <Modal
        open={Boolean(moderation)}
        onClose={() => {
          setModeration(null);
          setModerationReason('');
        }}
        title={moderation?.isBlocked ? "Débloquer l'événement" : "Bloquer l'événement"}
        description={
          moderation?.isBlocked
            ? `L'événement « ${moderation?.title} » sera de nouveau accessible selon ses paramètres d'origine.`
            : `L'événement « ${moderation?.title} » sera masqué publiquement et bloqué.`
        }
        size="sm"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setModeration(null);
                setModerationReason('');
              }}
            >
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              variant={moderation?.isBlocked ? 'primary' : 'danger'}
              loading={busyId === moderation?.id}
              disabled={!moderation?.isBlocked && moderationReason.trim().length < 8}
              onClick={() => void handleToggleBlock()}
            >
              Confirmer
            </Button>
          </div>
        }
      >
        <label className="block space-y-1.5" htmlFor="moderation-reason-input">
          <span className="text-xs font-medium text-muted">
            {moderation?.isBlocked ? 'Commentaire (optionnel)' : 'Motif (obligatoire)'}
          </span>
          <textarea
            id="moderation-reason-input"
            value={moderationReason}
            onChange={(e) => setModerationReason(e.target.value)}
            rows={4}
            maxLength={500}
            required={!moderation?.isBlocked}
            aria-required={!moderation?.isBlocked}
            aria-describedby={!moderation?.isBlocked ? 'moderation-reason-hint' : undefined}
            placeholder={moderation?.isBlocked ? "Raison du déblocage" : "Ex. contenu inapproprié, non-respect des règles…"}
            className="w-full rounded-[var(--radius-button)] border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/25"
          />
          {!moderation?.isBlocked && (
            <span id="moderation-reason-hint" className="text-xs text-muted">
              {moderationReason.trim().length}/8 caractères min.
            </span>
          )}
        </label>
      </Modal>

      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtres événements"
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setTicketing('ALL');
                setDonations('ALL');
                setGps('ALL');
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
          <CatalogueFilterField label="Billetterie">
            <CatalogueChoicePills
              options={[
                { id: 'all', label: 'Tous' },
                { id: 'yes', label: 'Avec billets' },
                { id: 'no', label: 'Sans billets' },
              ]}
              value={ticketing === 'ALL' ? 'all' : ticketing}
              onChange={(id) => { setTicketing(id && id !== 'all' ? id : 'ALL'); setPage(1); }}
            />
          </CatalogueFilterField>
          <CatalogueFilterField label="Collecte de dons">
            <CatalogueChoicePills
              options={[
                { id: 'all', label: 'Tous' },
                { id: 'yes', label: 'Avec collecte' },
                { id: 'no', label: 'Sans collecte' },
              ]}
              value={donations === 'ALL' ? 'all' : donations}
              onChange={(id) => { setDonations(id && id !== 'all' ? id : 'ALL'); setPage(1); }}
            />
          </CatalogueFilterField>
          <CatalogueFilterField label="GPS">
            <CatalogueChoicePills
              options={[
                { id: 'all', label: 'Tous' },
                { id: 'yes', label: 'Avec GPS' },
                { id: 'no', label: 'Sans GPS' },
              ]}
              value={gps === 'ALL' ? 'all' : gps}
              onChange={(id) => { setGps(id && id !== 'all' ? id : 'ALL'); setPage(1); }}
            />
          </CatalogueFilterField>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Supprimer l’événement"
        description={`Supprimer l’événement « ${pendingDelete?.title ?? ''} » ? Cette action est définitive.`}
        confirmLabel="Supprimer"
        tone="danger"
        loading={deleting}
      />
    </div>
  );
}
