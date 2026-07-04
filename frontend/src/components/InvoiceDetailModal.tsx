'use client';

import React, { useEffect, useState } from 'react';
import {
  Loader2, Download, Mail, Send, Building2, Calendar, CreditCard, FileText,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Modal } from '@/components/ui';

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
  hasCommission?: boolean;
  totalCommission?: number | null;
  totalCommissionFormatted?: string | null;
  commissions?: Array<{
    id: string;
    commercialName: string | null;
    commercialEmail: string | null;
    commissionRate: number;
    commissionRatePercent: number;
    commissionAmount: number;
    commissionAmountFormatted: string;
    source: string;
  }>;
}

export interface InvoiceDetail extends PlatformInvoiceItem {
  tenantId?: string;
  planName?: string;
  planPriceLabel?: string | null;
  recipientEmails?: string[];
}

function statusClass(status: string) {
  if (status === 'PAID') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (status === 'PENDING') return 'bg-amber-50 text-amber-700 border-amber-100';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

interface InvoiceDetailModalProps {
  invoiceId: string | null;
  apiPrefix: 'billing' | 'admin';
  isOpen: boolean;
  onClose: () => void;
}

export default function InvoiceDetailModal({
  invoiceId,
  apiPrefix,
  isOpen,
  onClose,
}: InvoiceDetailModalProps) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState('');
  const [downloading, setDownloading] = useState(false);

  const basePath = `/${apiPrefix}/invoices`;

  useEffect(() => {
    if (!isOpen || !invoiceId) {
      setInvoice(null);
      setError('');
      setShareEmail('');
      setSendSuccess('');
      return;
    }

    setLoading(true);
    setError('');
    api.get(`${basePath}/${invoiceId}`)
      .then((data) => setInvoice(data.invoice))
      .catch((err: Error) => setError(err.message || 'Impossible de charger la facture.'))
      .finally(() => setLoading(false));
  }, [isOpen, invoiceId, basePath]);

  const handleDownload = async () => {
    if (!invoice) return;
    setDownloading(true);
    setError('');
    try {
      await api.download(`${basePath}/${invoice.id}/pdf`, `${invoice.invoiceNumber}.pdf`);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du téléchargement.');
    } finally {
      setDownloading(false);
    }
  };

  const handleSendEmail = async (email?: string) => {
    if (!invoice) return;
    setSending(true);
    setSendSuccess('');
    setError('');
    try {
      const body = email?.trim() ? { email: email.trim() } : {};
      const result = await api.post(`${basePath}/${invoice.id}/send`, body);
      setSendSuccess(result.message || 'Facture envoyée.');
      if (email?.trim()) setShareEmail('');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="md"
      title={(
        <span className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
          Détail de la facture
        </span>
      )}
      footer={invoice ? (
        <>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 sm:flex-none min-w-0 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Télécharger PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-none px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-xl hover:bg-white dark:hover:bg-slate-900 transition"
          >
            Fermer
          </button>
        </>
      ) : undefined}
    >
      <div className="space-y-5 -mt-1">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : error && !invoice ? (
            <p className="text-sm text-rose-600 text-center py-8">{error}</p>
          ) : invoice ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-lg font-extrabold text-slate-900 dark:text-white">
                    {invoice.invoiceNumber}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Émise le {new Date(invoice.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0', statusClass(invoice.status))}>
                  {invoice.statusLabel}
                </span>
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-4 text-center">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Montant TTC</span>
                <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400 mt-1">{invoice.amountFormatted}</p>
              </div>

              {invoice.commissions && invoice.commissions.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-xl p-4 space-y-2">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    Commissions applicables
                  </span>
                  <ul className="space-y-2">
                    {invoice.commissions.map((c) => (
                      <li key={c.id} className="flex items-center justify-between text-sm gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-white truncate">
                            {c.commercialName || c.commercialEmail || 'Commercial'}
                          </p>
                          <p className="text-[10px] text-slate-500">{c.commissionRatePercent} % · {c.source}</p>
                        </div>
                        <span className="font-bold text-amber-700 dark:text-amber-400 shrink-0">
                          {c.commissionAmountFormatted}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {invoice.totalCommissionFormatted && invoice.commissions.length > 1 && (
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300 pt-2 border-t border-amber-200/60 dark:border-amber-900/40">
                      Total commissions : {invoice.totalCommissionFormatted}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {invoice.tenantName && (
                  <div className="col-span-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> Organisation
                    </span>
                    <p className="font-bold text-slate-800 dark:text-white mt-1">{invoice.tenantName}</p>
                  </div>
                )}
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> Forfait
                  </span>
                  <p className="font-bold text-slate-800 dark:text-white mt-1">{invoice.planName || invoice.plan}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{invoice.plan}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Type</span>
                  <p className="font-bold text-slate-800 dark:text-white mt-1">{invoice.typeLabel}</p>
                </div>
                <div className="col-span-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Période
                  </span>
                  <p className="font-bold text-slate-800 dark:text-white mt-1">
                    {invoice.periodStart && invoice.periodEnd ? (
                      <>
                        {new Date(invoice.periodStart).toLocaleDateString('fr-FR')}
                        {' → '}
                        {new Date(invoice.periodEnd).toLocaleDateString('fr-FR')}
                      </>
                    ) : invoice.durationDays ? (
                      `${invoice.durationDays} jours`
                    ) : (
                      invoice.billingPeriod
                    )}
                  </p>
                </div>
              </div>

              {invoice.recipientEmails && invoice.recipientEmails.length > 0 && (
                <div className="text-xs text-slate-500">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Destinataires initiaux : </span>
                  {invoice.recipientEmails.join(', ')}
                </div>
              )}

              {error && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{error}</p>
              )}
              {sendSuccess && (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{sendSuccess}</p>
              )}

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Partager par e-mail
                </h4>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="email@exemple.com (optionnel)"
                    className="flex-1 min-w-0 px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendEmail(shareEmail || undefined)}
                    disabled={sending}
                    className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
                  >
                    {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Envoyer
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Laissez le champ vide pour renvoyer aux destinataires d&apos;origine (propriétaire et managers).
                </p>
              </div>
            </>
          ) : null}
      </div>
    </Modal>
  );
}
