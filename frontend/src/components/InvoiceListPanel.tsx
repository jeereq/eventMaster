'use client';

import React, { useState } from 'react';
import { FileText, Mail, Eye } from 'lucide-react';
import InvoiceDetailModal, { type PlatformInvoiceItem } from '@/components/InvoiceDetailModal';
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
}) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('invoices', 10);
  const paginated = paginateItems(invoices, page, pageSize);

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

      <Pagination
        page={page}
        pageSize={pageSize}
        total={invoices.length}
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
