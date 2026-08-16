'use client';

import React, { useState } from 'react';
import { FileText, Mail, Eye } from 'lucide-react';
import InvoiceDetailModal, { type PlatformInvoiceItem } from '@/components/InvoiceDetailModal';
import { Pagination, paginateItems } from '@/components/ui';

export type { PlatformInvoiceItem };

function statusClass(status: string) {
  if (status === 'PAID') return 'bg-emerald-50 text-emerald-700';
  if (status === 'PENDING') return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}

function InvoiceRowCells({
  inv,
  showOrganization,
  showCommissions,
  onDetail,
}: {
  inv: PlatformInvoiceItem;
  showOrganization: boolean;
  showCommissions: boolean;
  onDetail: () => void;
}) {
  return (
    <>
      <td className="px-4 py-3 font-mono text-xs font-bold">{inv.invoiceNumber}</td>
      {showOrganization && (
        <td className="px-4 py-3">{inv.tenantName || '—'}</td>
      )}
      <td className="px-4 py-3">{inv.plan}</td>
      <td className="px-4 py-3 text-xs">{inv.typeLabel}</td>
      <td className="px-4 py-3 font-bold text-indigo-600">{inv.amountFormatted}</td>
      {showCommissions && (
        <td className="px-4 py-3 text-xs">
          {inv.hasCommission && inv.totalCommissionFormatted ? (
            <span className="font-bold text-amber-700">{inv.totalCommissionFormatted}</span>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </td>
      )}
      <td className="px-4 py-3 text-xs text-slate-500">
        {inv.periodStart && inv.periodEnd ? (
          <>
            {new Date(inv.periodStart).toLocaleDateString('fr-FR')}
            {' → '}
            {new Date(inv.periodEnd).toLocaleDateString('fr-FR')}
          </>
        ) : (
          inv.billingPeriod
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusClass(inv.status)}`}>
          {inv.statusLabel}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">
        {new Date(inv.createdAt).toLocaleDateString('fr-FR')}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={onDetail}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition"
          title="Voir le détail, télécharger ou partager"
        >
          <Eye className="w-3.5 h-3.5" />
          Détail
        </button>
      </td>
    </>
  );
}

function InvoiceMobileCard({
  inv,
  showOrganization,
  showCommissions,
  onDetail,
}: {
  inv: PlatformInvoiceItem;
  showOrganization: boolean;
  showCommissions: boolean;
  onDetail: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs font-bold text-slate-900 dark:text-white truncate">{inv.invoiceNumber}</p>
          {showOrganization && inv.tenantName && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{inv.tenantName}</p>
          )}
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${statusClass(inv.status)}`}>
          {inv.statusLabel}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-slate-400 uppercase font-bold text-[10px]">Forfait</span>
          <p className="font-semibold text-slate-800 dark:text-white">{inv.plan}</p>
        </div>
        <div>
          <span className="text-slate-400 uppercase font-bold text-[10px]">Montant</span>
          <p className="font-bold text-indigo-600">{inv.amountFormatted}</p>
        </div>
        <div>
          <span className="text-slate-400 uppercase font-bold text-[10px]">Type</span>
          <p className="text-slate-700 dark:text-slate-300">{inv.typeLabel}</p>
        </div>
        <div>
          <span className="text-slate-400 uppercase font-bold text-[10px]">Date</span>
          <p className="text-slate-700 dark:text-slate-300">{new Date(inv.createdAt).toLocaleDateString('fr-FR')}</p>
        </div>
        {showCommissions && inv.hasCommission && inv.totalCommissionFormatted && (
          <div className="col-span-2">
            <span className="text-slate-400 uppercase font-bold text-[10px]">Commission(s)</span>
            <p className="font-bold text-amber-700">{inv.totalCommissionFormatted}</p>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onDetail}
        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 rounded-xl transition"
      >
        <Eye className="w-3.5 h-3.5" />
        Voir le détail
      </button>
    </div>
  );
}

export default function InvoiceListPanel({
  invoices,
  showOrganization = false,
  showCommissions = false,
  emptyMessage = 'Aucune facture pour le moment.',
  apiPrefix = 'billing',
}: {
  invoices: PlatformInvoiceItem[];
  showOrganization?: boolean;
  showCommissions?: boolean;
  emptyMessage?: string;
  apiPrefix?: 'billing' | 'admin';
}) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const paginated = paginateItems(invoices, page, PAGE_SIZE);

  if (invoices.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400">
        <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">{emptyMessage}</p>
        <p className="text-xs mt-2 flex items-center justify-center gap-1">
          <Mail className="w-3.5 h-3.5" />
          Une copie est aussi envoyée par e-mail (SendGrid) après validation.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="md:hidden space-y-3">
        {paginated.map((inv) => (
          <InvoiceMobileCard
            key={inv.id}
            inv={inv}
            showOrganization={showOrganization}
            showCommissions={showCommissions}
            onDetail={() => setSelectedInvoiceId(inv.id)}
          />
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto border rounded-xl">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-slate-50 dark:bg-slate-950 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">N° facture</th>
              {showOrganization && <th className="px-4 py-3">Organisation</th>}
              <th className="px-4 py-3">Forfait</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Montant</th>
              {showCommissions && <th className="px-4 py-3">Commission(s)</th>}
              <th className="px-4 py-3">Période</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginated.map((inv) => (
              <tr key={inv.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <InvoiceRowCells
                  inv={inv}
                  showOrganization={showOrganization}
                  showCommissions={showCommissions}
                  onDetail={() => setSelectedInvoiceId(inv.id)}
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={invoices.length}
        onPageChange={setPage}
        itemLabel="factures"
      />

      <InvoiceDetailModal
        invoiceId={selectedInvoiceId}
        apiPrefix={apiPrefix}
        isOpen={Boolean(selectedInvoiceId)}
        onClose={() => setSelectedInvoiceId(null)}
      />
    </>
  );
}
