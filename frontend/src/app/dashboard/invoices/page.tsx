'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Loader2, FileText } from 'lucide-react';
import { PageHeader, Alert, SkeletonInvoicesView, SkeletonList } from '@/components/ui';
import InvoiceListPanel, { type PlatformInvoiceItem } from '@/components/InvoiceListPanel';

export default function OrgInvoicesPage() {
  const { user, access, tenant } = useAuth();
  const [invoices, setInvoices] = useState<PlatformInvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!access?.canViewInvoices) return;
    api.get('/billing/invoices')
      .then((data) => setInvoices(data.invoices || []))
      .catch((err: any) => setError(err.message || 'Impossible de charger les factures.'))
      .finally(() => setLoading(false));
  }, [access?.canViewInvoices]);

  if (user?.role !== 'USER' || !tenant) return null;

  if (!access?.canViewInvoices) {
    return (
      <Alert variant="error">
        Accès réservé au propriétaire et aux managers de l&apos;organisation.
      </Alert>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <PageHeader
        title="Factures"
        description={`Historique des factures EventMaster pour ${tenant.name}. Générées automatiquement après validation d'une demande d'abonnement, paiement ou renouvellement.`}
      />

      {error && <Alert variant="error">{error}</Alert>}

      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-6">
        <h2 className="font-bold flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-indigo-600" />
          Mes factures ({invoices.length})
        </h2>
        {loading ? (
          <SkeletonList count={5} />
        ) : (
          <InvoiceListPanel
            invoices={invoices}
            emptyMessage="Aucune facture encore. Une facture apparaît ici dès qu'une demande d'abonnement est approuvée par la plateforme."
          />
        )}
      </div>
    </div>
  );
}
