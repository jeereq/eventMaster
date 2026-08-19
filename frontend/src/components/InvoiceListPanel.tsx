'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Mail, Eye } from 'lucide-react';
import InvoiceDetailModal, { type PlatformInvoiceItem } from '@/components/InvoiceDetailModal';
import CatalogueFilterBar, {
  CatalogueChoicePills,
  CatalogueFilterField,
  type CatalogueFilterChip,
} from '@/components/CatalogueFilterBar';
import {
  Pagination,
  paginateItems,
  ProjectCard,
  StatusPill,
  ListRowAction,
  listStackClass,
  usePageSize,
} from '@/components/ui';
import type { ProjectCardLayout, StatusPillTone } from '@/components/ui';

export type { PlatformInvoiceItem };

function statusTone(status: string): StatusPillTone {
  if (status === 'PAID') return 'emerald';
  if (status === 'PENDING') return 'amber';
  return 'slate';
}

function periodLabel(inv: PlatformInvoiceItem) {
  if (inv.periodStart && inv.periodEnd) {
    return `${new Date(inv.periodStart).toLocaleDateString('fr-FR')} → ${new Date(inv.periodEnd).toLocaleDateString('fr-FR')}`;
  }
  return inv.billingPeriod;
}

function isAnnualInvoice(inv: PlatformInvoiceItem) {
  return (inv.durationDays ?? 0) >= 365;
}

export default function InvoiceListPanel({
  invoices,
  showOrganization = false,
  showCommissions = false,
  emptyMessage = 'Aucune facture pour le moment.',
  apiPrefix = 'billing',
  layout = 'list',
  gridClassName = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
  allowMarkPaid = false,
  onInvoiceUpdated,
  showFilters = true,
}: {
  invoices: PlatformInvoiceItem[];
  showOrganization?: boolean;
  showCommissions?: boolean;
  emptyMessage?: string;
  apiPrefix?: 'billing' | 'admin';
  layout?: ProjectCardLayout;
  gridClassName?: string;
  allowMarkPaid?: boolean;
  onInvoiceUpdated?: (invoice: PlatformInvoiceItem) => void;
  showFilters?: boolean;
}) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('invoices', 10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [cycle, setCycle] = useState('');
  const [commission, setCommission] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      const matchesSearch =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.plan.toLowerCase().includes(q) ||
        (inv.tenantName || '').toLowerCase().includes(q) ||
        (inv.typeLabel || '').toLowerCase().includes(q) ||
        (inv.billingPeriod || '').toLowerCase().includes(q);
      const matchesStatus = !status || status === 'all' || inv.status === status;
      const matchesType = !type || type === 'all' || inv.type === type;
      const matchesCycle =
        !cycle ||
        cycle === 'all' ||
        (cycle === 'annual' && isAnnualInvoice(inv)) ||
        (cycle === 'period' && !isAnnualInvoice(inv));
      const matchesCommission =
        !commission ||
        commission === 'all' ||
        (commission === 'yes' && Boolean(inv.hasCommission)) ||
        (commission === 'no' && !inv.hasCommission);
      return matchesSearch && matchesStatus && matchesType && matchesCycle && matchesCommission;
    });
  }, [invoices, search, status, type, cycle, commission]);

  useEffect(() => {
    setPage(1);
  }, [search, status, type, cycle, commission, invoices.length]);

  const paginated = paginateItems(filtered, page, pageSize);

  const chips: CatalogueFilterChip[] = [
    ...(status && status !== 'all'
      ? [{ id: 'status', label: 'Statut', value: status === 'PAID' ? 'Payée' : status === 'PENDING' ? 'En attente' : 'Envoyée' }]
      : []),
    ...(type && type !== 'all'
      ? [{
          id: 'type',
          label: 'Type',
          value:
            type === 'RENEWAL' ? 'Renouvellement' : type === 'PAYMENT' ? 'Paiement' : 'Activation',
        }]
      : []),
    ...(cycle && cycle !== 'all'
      ? [{ id: 'cycle', label: 'Cycle', value: cycle === 'annual' ? 'Annuel' : 'Période de base' }]
      : []),
    ...(commission && commission !== 'all'
      ? [{ id: 'commission', label: 'Commission', value: commission === 'yes' ? 'Avec commission' : 'Sans commission' }]
      : []),
  ];

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setType('');
    setCycle('');
    setCommission('');
  };

  if (invoices.length === 0) {
    return (
      <div className="text-center py-10 text-muted">
        <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm text-foreground/80">{emptyMessage}</p>
        <p className="text-xs mt-2 flex items-center justify-center gap-1">
          <Mail className="w-3.5 h-3.5" />
          Une copie est aussi envoyée par e-mail (SendGrid) après validation.
        </p>
      </div>
    );
  }

  return (
    <>
      {showFilters && (
        <div className="mb-4">
          <CatalogueFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={
              showOrganization
                ? 'N° facture, organisation, forfait, période…'
                : 'N° facture, forfait, période…'
            }
            view={layout}
            onViewChange={() => undefined}
            hideViewToggle
            chips={chips}
            onRemoveChip={(id) => {
              if (id === 'status') setStatus('');
              if (id === 'type') setType('');
              if (id === 'cycle') setCycle('');
              if (id === 'commission') setCommission('');
            }}
            onClearChips={clearFilters}
            resultLabel={`${filtered.length} facture${filtered.length > 1 ? 's' : ''}`}
            modalTitle="Filtrer les factures"
            filters={
              <>
                <CatalogueFilterField label="Statut">
                  <CatalogueChoicePills
                    options={[
                      { id: 'all', label: 'Tous' },
                      { id: 'PAID', label: 'Payée' },
                      { id: 'SENT', label: 'Envoyée' },
                      { id: 'PENDING', label: 'En attente' },
                    ]}
                    value={status || 'all'}
                    onChange={setStatus}
                  />
                </CatalogueFilterField>
                <CatalogueFilterField label="Type">
                  <CatalogueChoicePills
                    options={[
                      { id: 'all', label: 'Tous' },
                      { id: 'SUBSCRIPTION_APPROVAL', label: 'Activation' },
                      { id: 'RENEWAL', label: 'Renouvellement' },
                      { id: 'PAYMENT', label: 'Paiement' },
                    ]}
                    value={type || 'all'}
                    onChange={setType}
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
                {showCommissions && (
                  <CatalogueFilterField label="Commission SaaS">
                    <CatalogueChoicePills
                      options={[
                        { id: 'all', label: 'Toutes' },
                        { id: 'yes', label: 'Avec commission' },
                        { id: 'no', label: 'Sans commission' },
                      ]}
                      value={commission || 'all'}
                      onChange={setCommission}
                    />
                  </CatalogueFilterField>
                )}
              </>
            }
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-muted">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-foreground/80">Aucune facture pour ces filtres.</p>
        </div>
      ) : (
        <div className={layout === 'grid' ? gridClassName : listStackClass}>
          {paginated.map((inv) => {
            const statusChip = (
              <StatusPill tone={statusTone(inv.status)}>{inv.statusLabel}</StatusPill>
            );
            const amountChip = (
              <StatusPill tone="primary">{inv.amountFormatted}</StatusPill>
            );
            const actions = (
              <>
                {layout === 'list' ? (
                  <button
                    type="button"
                    onClick={() => setSelectedInvoiceId(inv.id)}
                    className="inline-flex items-center"
                    title="Voir le détail"
                  >
                    <ListRowAction />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedInvoiceId(inv.id)}
                    className="p-1.5 text-muted hover:text-foreground hover:bg-surface-muted rounded-md transition"
                    title="Détail"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
              </>
            );

            return (
              <ProjectCard
                key={inv.id}
                id={inv.id}
                title={inv.invoiceNumber}
                layout={layout}
                icon={<FileText className="w-4 h-4" />}
                onClick={() => setSelectedInvoiceId(inv.id)}
                meta={
                  layout === 'list' ? (
                    <span className="truncate">
                      {showOrganization && inv.tenantName ? `${inv.tenantName} · ` : ''}
                      {inv.plan}
                      {' · '}
                      {inv.typeLabel}
                      {isAnnualInvoice(inv) ? ' · annuel' : ''}
                      {showCommissions && inv.hasCommission && inv.totalCommissionFormatted
                        ? ` · Comm. ${inv.totalCommissionFormatted}`
                        : ''}
                      {' · '}
                      {periodLabel(inv)}
                    </span>
                  ) : (
                    <div className="space-y-1.5">
                      {showOrganization && inv.tenantName && (
                        <p className="truncate text-xs font-medium">{inv.tenantName}</p>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {statusChip}
                        {amountChip}
                      </div>
                      <p className="truncate text-xs">
                        {inv.plan} · {inv.typeLabel}
                        {isAnnualInvoice(inv) ? ' · annuel' : ''}
                      </p>
                      {showCommissions && inv.hasCommission && inv.totalCommissionFormatted && (
                        <p className="text-[11px] text-amber-700 font-semibold">
                          Comm. {inv.totalCommissionFormatted}
                        </p>
                      )}
                      <p className="truncate text-[11px] text-muted">{periodLabel(inv)}</p>
                      <p className="text-[11px] text-muted">
                        {new Date(inv.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  )
                }
                status={layout === 'list' ? statusChip : undefined}
                aside={layout === 'list' ? amountChip : undefined}
                actions={actions}
              />
            );
          })}
        </div>
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        itemLabel="factures"
      />

      <InvoiceDetailModal
        invoiceId={selectedInvoiceId}
        apiPrefix={apiPrefix}
        isOpen={Boolean(selectedInvoiceId)}
        onClose={() => setSelectedInvoiceId(null)}
        allowMarkPaid={allowMarkPaid}
        onUpdated={onInvoiceUpdated}
      />
    </>
  );
}
