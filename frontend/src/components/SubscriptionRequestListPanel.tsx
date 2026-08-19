'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Clock, CreditCard, Eye } from 'lucide-react';
import CatalogueFilterBar, {
  CatalogueChoicePills,
  CatalogueFilterField,
  type CatalogueFilterChip,
} from '@/components/CatalogueFilterBar';
import SubscriptionRequestDetailModal, {
  type AdminSubscriptionRequestItem,
} from '@/components/SubscriptionRequestDetailModal';
import {
  Pagination,
  paginateItems,
  ProjectCard,
  StatusPill,
  ListRowAction,
  ViewModeToggle,
  useViewMode,
  listStackClass,
  usePageSize,
  SkeletonTabContent,
} from '@/components/ui';
import { isAnnualDurationDays } from '@/config/landingPricing';

export type { AdminSubscriptionRequestItem };

export default function SubscriptionRequestListPanel({
  requests,
  loading = false,
  onApprove,
  onReject,
}: {
  requests: AdminSubscriptionRequestItem[];
  loading?: boolean;
  onApprove: (request: AdminSubscriptionRequestItem) => void;
  onReject: (id: string) => void;
}) {
  const {
    mode: layout,
    setViewMode,
    columns,
    setGridColumns,
    gridClassName,
  } = useViewMode('em-view-admin-sub-requests', 'grid', 2);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('admin-sub-requests', 8);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [cycle, setCycle] = useState('');
  const [proof, setProof] = useState('');
  const [plan, setPlan] = useState('');
  const [selected, setSelected] = useState<AdminSubscriptionRequestItem | null>(null);

  const planOptions = useMemo(() => {
    const ids = [...new Set(requests.map((r) => r.requestedPlan).filter(Boolean))];
    return ids.sort().map((id) => ({ id, label: id }));
  }, [requests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((req) => {
      const commercial =
        req.tenant?.referredByCommercial?.name ||
        req.tenant?.referredByCommercial?.email ||
        req.tenant?.referredByOrgUser?.name ||
        '';
      const matchesSearch =
        !q ||
        (req.tenant?.name || '').toLowerCase().includes(q) ||
        req.requestedPlan.toLowerCase().includes(q) ||
        (req.tenant?.plan || '').toLowerCase().includes(q) ||
        commercial.toLowerCase().includes(q) ||
        (req.proofOfPayment || '').toLowerCase().includes(q);
      const matchesStatus = !status || status === 'all' || req.status === status;
      const matchesCycle =
        !cycle ||
        cycle === 'all' ||
        (cycle === 'annual' && isAnnualDurationDays(req.durationDays)) ||
        (cycle === 'period' && !isAnnualDurationDays(req.durationDays));
      const matchesProof =
        !proof ||
        proof === 'all' ||
        (proof === 'yes' && Boolean(req.proofOfPayment)) ||
        (proof === 'no' && !req.proofOfPayment);
      const matchesPlan = !plan || plan === 'all' || req.requestedPlan === plan;
      return matchesSearch && matchesStatus && matchesCycle && matchesProof && matchesPlan;
    });
  }, [requests, search, status, cycle, proof, plan]);

  useEffect(() => {
    setPage(1);
  }, [search, status, cycle, proof, plan, requests.length]);

  const paginated = paginateItems(filtered, page, pageSize);

  const chips: CatalogueFilterChip[] = [
    ...(status && status !== 'all'
      ? [{
          id: 'status',
          label: 'Statut',
          value: status === 'APPROVED' ? 'Approuvée' : status === 'REJECTED' ? 'Rejetée' : 'En attente',
        }]
      : []),
    ...(cycle && cycle !== 'all'
      ? [{ id: 'cycle', label: 'Cycle', value: cycle === 'annual' ? 'Annuel' : 'Période de base' }]
      : []),
    ...(proof && proof !== 'all'
      ? [{ id: 'proof', label: 'Preuve', value: proof === 'yes' ? 'Avec preuve' : 'Sans preuve' }]
      : []),
    ...(plan && plan !== 'all' ? [{ id: 'plan', label: 'Forfait', value: plan }] : []),
  ];

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setCycle('');
    setProof('');
    setPlan('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-base font-bold text-foreground flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Demandes reçues ({filtered.length}
          {filtered.length !== requests.length ? ` / ${requests.length}` : ''})
        </h4>
        <ViewModeToggle
          storageKey="em-view-admin-sub-requests"
          value={layout}
          onChange={setViewMode}
          columns={columns}
          onColumnsChange={setGridColumns}
          defaultMode="grid"
          defaultColumns={2}
        />
      </div>

      {requests.length > 0 && (
        <CatalogueFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Organisation, forfait, commercial, preuve…"
          view={layout}
          onViewChange={(mode) => {
            if (mode === 'grid' || mode === 'list') setViewMode(mode);
          }}
          hideViewToggle
          chips={chips}
          onRemoveChip={(id) => {
            if (id === 'status') setStatus('');
            if (id === 'cycle') setCycle('');
            if (id === 'proof') setProof('');
            if (id === 'plan') setPlan('');
          }}
          onClearChips={clearFilters}
          resultLabel={`${filtered.length} demande${filtered.length > 1 ? 's' : ''}`}
          modalTitle="Filtrer les demandes"
          filters={
            <>
              <CatalogueFilterField label="Statut">
                <CatalogueChoicePills
                  options={[
                    { id: 'all', label: 'Tous' },
                    { id: 'PENDING', label: 'En attente' },
                    { id: 'APPROVED', label: 'Approuvées' },
                    { id: 'REJECTED', label: 'Rejetées' },
                  ]}
                  value={status || 'all'}
                  onChange={setStatus}
                />
              </CatalogueFilterField>
              <CatalogueFilterField label="Cycle">
                <CatalogueChoicePills
                  options={[
                    { id: 'all', label: 'Tous' },
                    { id: 'period', label: 'Période de base' },
                    { id: 'annual', label: 'Annuel' },
                  ]}
                  value={cycle || 'all'}
                  onChange={setCycle}
                />
              </CatalogueFilterField>
              <CatalogueFilterField label="Preuve de paiement">
                <CatalogueChoicePills
                  options={[
                    { id: 'all', label: 'Toutes' },
                    { id: 'yes', label: 'Avec preuve' },
                    { id: 'no', label: 'Sans preuve' },
                  ]}
                  value={proof || 'all'}
                  onChange={setProof}
                />
              </CatalogueFilterField>
              {planOptions.length > 0 && (
                <CatalogueFilterField label="Forfait demandé">
                  <CatalogueChoicePills
                    options={[{ id: 'all', label: 'Tous' }, ...planOptions]}
                    value={plan || 'all'}
                    onChange={setPlan}
                  />
                </CatalogueFilterField>
              )}
            </>
          }
        />
      )}

      {loading ? (
        <SkeletonTabContent mode={layout === 'list' ? 'list' : 'grid'} count={6} columns={2} />
      ) : requests.length === 0 ? (
        <div className="text-center py-8 bg-surface-muted rounded-xl border border-border p-6">
          <p className="text-muted text-xs font-medium">Aucune demande d&apos;abonnement soumise pour le moment.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 bg-surface-muted rounded-xl border border-border p-6">
          <p className="text-muted text-xs font-medium">Aucune demande pour ces filtres.</p>
        </div>
      ) : (
        <>
          <div className={layout === 'grid' ? gridClassName : listStackClass}>
            {paginated.map((req) => {
              const statusTone =
                req.status === 'APPROVED' ? 'emerald' : req.status === 'REJECTED' ? 'rose' : 'amber';
              const statusChip = (
                <StatusPill tone={statusTone}>
                  {req.status === 'APPROVED' ? 'Approuvée' : req.status === 'REJECTED' ? 'Rejetée' : 'En attente'}
                </StatusPill>
              );
              const planChip = (
                <StatusPill tone="primary">
                  {(req.tenant?.plan || 'FREE')} → {req.requestedPlan}
                </StatusPill>
              );
              const commercial =
                req.tenant?.referredByCommercial?.name ||
                (req.tenant?.referredByOrgUser?.orgRole === 'COMMERCIAL'
                  ? req.tenant.referredByOrgUser.name
                  : null);
              const actions =
                req.status === 'PENDING' ? (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onApprove(req);
                      }}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition"
                    >
                      Approuver
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onReject(req.id);
                      }}
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition"
                    >
                      Rejeter
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelected(req);
                    }}
                    className="p-1.5 text-muted hover:text-foreground hover:bg-surface-muted rounded-md transition"
                    title="Détail"
                  >
                    {layout === 'list' ? <ListRowAction /> : <Eye className="w-4 h-4" />}
                  </button>
                );

              return (
                <ProjectCard
                  key={req.id}
                  id={req.id}
                  title={req.tenant?.name || 'Organisation inconnue'}
                  layout={layout}
                  icon={<CreditCard className="w-4 h-4" />}
                  onClick={() => setSelected(req)}
                  meta={
                    layout === 'list' ? (
                      <span className="truncate">
                        {req.durationDays} j
                        {isAnnualDurationDays(req.durationDays) ? ' · annuel' : ''}
                        {' · '}
                        {new Date(req.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {commercial ? ` · ${commercial}` : ''}
                        {req.proofOfPayment ? ' · preuve' : ''}
                      </span>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap gap-1.5">
                          {statusChip}
                          {planChip}
                        </div>
                        <p className="text-xs font-semibold">
                          {req.durationDays} jours
                          {isAnnualDurationDays(req.durationDays) ? ' · annuel' : ''}
                        </p>
                        {req.proofOfPayment && (
                          <p className="text-[11px] text-muted italic truncate" title={req.proofOfPayment}>
                            &quot;{req.proofOfPayment}&quot;
                          </p>
                        )}
                        {commercial && (
                          <p className="text-[11px] text-primary font-medium truncate">{commercial}</p>
                        )}
                        <p className="text-[11px] text-muted">
                          {new Date(req.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    )
                  }
                  status={layout === 'list' ? statusChip : undefined}
                  aside={layout === 'list' ? planChip : undefined}
                  actions={actions}
                />
              );
            })}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="demandes"
          />
        </>
      )}

      <SubscriptionRequestDetailModal
        request={selected}
        onClose={() => setSelected(null)}
        onApprove={(req) => {
          setSelected(null);
          onApprove(req);
        }}
        onReject={(id) => {
          setSelected(null);
          onReject(id);
        }}
      />
    </div>
  );
}

