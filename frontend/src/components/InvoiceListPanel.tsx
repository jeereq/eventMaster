'use client';

import React, { useState } from 'react';
import { FileText, Mail, Eye } from 'lucide-react';
import InvoiceDetailModal, { type PlatformInvoiceItem } from '@/components/InvoiceDetailModal';

export type { PlatformInvoiceItem };

function statusClass(status: string) {
  if (status === 'PAID') return 'bg-emerald-50 text-emerald-700';
  if (status === 'PENDING') return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}

export default function InvoiceListPanel({
  invoices,
  showOrganization = false,
  emptyMessage = 'Aucune facture pour le moment.',
  apiPrefix = 'billing',
}: {
  invoices: PlatformInvoiceItem[];
  showOrganization?: boolean;
  emptyMessage?: string;
  apiPrefix?: 'billing' | 'admin';
}) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

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
      <div className="overflow-x-auto border rounded-xl">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-slate-50 dark:bg-slate-950 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">N° facture</th>
              {showOrganization && <th className="px-4 py-3">Organisation</th>}
              <th className="px-4 py-3">Forfait</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3">Période</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {invoices.map((inv) => (
              <tr key={inv.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-bold">{inv.invoiceNumber}</td>
                {showOrganization && (
                  <td className="px-4 py-3">{inv.tenantName || '—'}</td>
                )}
                <td className="px-4 py-3">{inv.plan}</td>
                <td className="px-4 py-3 text-xs">{inv.typeLabel}</td>
                <td className="px-4 py-3 font-bold text-indigo-600">{inv.amountFormatted}</td>
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
                    onClick={() => setSelectedInvoiceId(inv.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition"
                    title="Voir le détail, télécharger ou partager"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Détail
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InvoiceDetailModal
        invoiceId={selectedInvoiceId}
        apiPrefix={apiPrefix}
        isOpen={Boolean(selectedInvoiceId)}
        onClose={() => setSelectedInvoiceId(null)}
      />
    </>
  );
}
