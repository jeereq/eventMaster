'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Loader2, FileText } from '@/components/icons';
import { Alert, SkeletonInvoicesView, SkeletonList } from '@/components/ui';
import InvoiceListPanel, { type PlatformInvoiceItem } from '@/components/InvoiceListPanel';

export default function OrgInvoicesPage() {
  const { user, access, tenant } = useAuth();
  const router = useRouter();
  /** Factures vit désormais dans Forfait (?tab=invoices) quand les deux entrées sont accessibles. */
  const redirectToBilling = Boolean(
    user?.role === 'USER' && tenant && access?.canViewBilling && access?.canViewInvoices,
  );
  const [invoices, setInvoices] = useState<PlatformInvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!redirectToBilling) return;
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'invoices');
    router.replace(`/dashboard/billing?${params.toString()}`);
  }, [redirectToBilling, router]);

  useEffect(() => {
    if (!access?.canViewInvoices || redirectToBilling) return;
    api.get('/billing/invoices')
      .then((data) => setInvoices(data.invoices || []))
      .catch((err: any) => setError(err.message || 'Impossible de charger les factures.'))
      .finally(() => setLoading(false));
  }, [access?.canViewInvoices, redirectToBilling]);

  if (redirectToBilling) return <SkeletonInvoicesView />;

  if (user?.role !== 'USER' || !tenant) return null;

  if (!access?.canViewInvoices) {
    return (
      <Alert variant="error">
        Accès réservé au propriétaire et aux managers de l&apos;organisation.
      </Alert>
    );
  }

  return (
    <div className="space-y-8 w-full">

      {error && <Alert variant="error">{error}</Alert>}

      <div className="bg-surface border border-border rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-soft)]">
        <h2 className="font-bold flex items-center gap-2 mb-4 text-foreground">
          <FileText className="w-5 h-5 text-primary" />
          Mes factures ({invoices.length})
        </h2>
        {loading ? (
          <SkeletonList count={5} />
        ) : (
          <InvoiceListPanel
            invoices={invoices}
          />
        )}
      </div>
    </div>
  );
}
