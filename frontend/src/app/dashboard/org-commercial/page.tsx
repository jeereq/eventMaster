'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Building2, Copy, Loader2, TrendingUp, Users, Wallet,
} from 'lucide-react';
import { Button, PageHeader } from '@/components/ui';

interface OrgCommercialDashboard {
  referralCode: string;
  commissionRate: number;
  organizationName?: string;
  stats: {
    organizations: number;
    totalCommission: number;
    monthlyCommission: number;
  };
  organizations: Array<{
    id: string;
    name: string;
    plan: string;
    licenseActive: boolean;
    managerName?: string;
    eventsCount: number;
  }>;
  commissions: Array<{
    id: string;
    billingPeriod: string;
    invoiceAmount: number;
    commissionAmount: number;
    commissionRate?: number;
    plan: string;
    tenant: { name: string };
  }>;
}

export default function OrgCommercialPage() {
  const { user, access } = useAuth();
  const [data, setData] = useState<OrgCommercialDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (access?.level !== 'commercial') return;
    api.get('/org-commercial/dashboard')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [access]);

  const copyCode = () => {
    if (data?.referralCode) {
      navigator.clipboard.writeText(data.referralCode);
    }
  };

  if (user?.orgRole !== 'COMMERCIAL' && access?.level !== 'commercial') {
    return (
      <div className="text-center py-20 text-slate-500">
        Accès réservé aux commerciaux de l&apos;organisation.
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Réseau commercial"
        description={`Parrainez de nouvelles organisations pour ${data.organizationName || 'votre entreprise'} et suivez vos commissions.`}
      />

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border rounded-2xl p-5">
          <div className="text-xs font-bold uppercase text-slate-400">Organisations parrainées</div>
          <div className="text-2xl font-black mt-1 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            {data.stats.organizations}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border rounded-2xl p-5">
          <div className="text-xs font-bold uppercase text-slate-400">Commission ce mois</div>
          <div className="text-2xl font-black mt-1 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            {data.stats.monthlyCommission.toLocaleString('fr-FR')} FC
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border rounded-2xl p-5">
          <div className="text-xs font-bold uppercase text-slate-400">Total commissions</div>
          <div className="text-2xl font-black mt-1 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-600" />
            {data.stats.totalCommission.toLocaleString('fr-FR')} FC
          </div>
        </div>
      </div>

      <div className="bg-indigo-600 text-white rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-indigo-200 text-sm font-semibold">Votre code parrainage organisation</p>
          <p className="text-2xl font-black tracking-wider">{data.referralCode}</p>
          <p className="text-indigo-200 text-xs mt-1">
            {Math.round(data.commissionRate * 100)} % sur chaque facture des org. que vous parrainez
          </p>
        </div>
        <Button variant="secondary" onClick={copyCode} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
          <Copy className="w-4 h-4" />
          Copier le code
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">Organisation</th>
              <th className="px-4 py-3">Manager</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Événements</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.organizations.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                  Aucune organisation parrainée pour le moment.
                </td>
              </tr>
            ) : (
              data.organizations.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-semibold">{o.name}</td>
                  <td className="px-4 py-3 text-slate-500">{o.managerName || '—'}</td>
                  <td className="px-4 py-3">{o.plan}</td>
                  <td className="px-4 py-3">{o.eventsCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data.commissions.length > 0 && (
        <div>
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Users className="w-5 h-5" /> Historique commissions
          </h2>
          <div className="bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950 text-left text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Période</th>
                  <th className="px-4 py-3">Organisation</th>
                  <th className="px-4 py-3">Facture</th>
                  <th className="px-4 py-3">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.commissions.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3">{c.billingPeriod}</td>
                    <td className="px-4 py-3">{c.tenant.name}</td>
                    <td className="px-4 py-3">{c.invoiceAmount.toLocaleString('fr-FR')} FC</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">
                      {c.commissionAmount.toLocaleString('fr-FR')} FC
                      {c.commissionRate != null && (
                        <span className="text-slate-400 font-normal ml-1">({Math.round(c.commissionRate * 100)} %)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
