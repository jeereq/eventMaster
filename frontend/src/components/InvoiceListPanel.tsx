'use client';

import React from 'react';
import { FileText, Mail } from 'lucide-react';

export interface PlatformInvoiceItem {
  id: string;
  invoiceNumber: string;
  plan: string;
  amount: number;
  amountFormatted: string;
  type: string;
  typeLabel: string;
  status: string;
  statusLabel: string;
  billingPeriod: string;
  periodStart: string | null;
  periodEnd: string | null;
  durationDays: number | null;
  sentAt: string | null;
  createdAt: string;
  tenantName?: string | null;
}

function statusClass(status: string) {
  if (status === 'PAID') return 'bg-emerald-50 text-emerald-700';
  if (status === 'PENDING') return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}

export default function InvoiceListPanel({
  invoices,
  showOrganization = false,
  emptyMessage = 'Aucune facture pour le moment.',
}: {
  invoices: PlatformInvoiceItem[];
  showOrganization?: boolean;
  emptyMessage?: string;
}) {
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
    <div className="overflow-x-auto border rounded-xl">
      <table className="w-full text-sm min-w-[640px]">
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
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {invoices.map((inv) => (
            <tr key={inv.id} className="bg-white dark:bg-slate-900">
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
