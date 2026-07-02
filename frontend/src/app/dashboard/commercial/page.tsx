'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Building2, Copy, Loader2, PlusCircle, TrendingUp, Users, Wallet,
} from 'lucide-react';
import { Button, PageHeader } from '@/components/ui';

interface CommercialDashboard {
  referralCode: string;
  commissionRate: number;
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
    plan: string;
    tenant: { name: string };
  }>;
}

export default function CommercialDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<CommercialDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    organizationName: '',
    managerName: '',
    managerEmail: '',
    managerPassword: '',
    managerPhone: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role !== 'COMMERCIAL') return;
    api.get('/commercial/dashboard')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const copyCode = () => {
    if (data?.referralCode) {
      navigator.clipboard.writeText(data.referralCode);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/commercial/organizations', form);
      setShowForm(false);
      setForm({ organizationName: '', managerName: '', managerEmail: '', managerPassword: '', managerPhone: '' });
      const refreshed = await api.get('/commercial/dashboard');
      setData(refreshed);
    } catch (err: any) {
      alert(err?.data?.error || 'Erreur lors de la création.');
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role !== 'COMMERCIAL') {
    return (
      <div className="text-center py-20 text-slate-500">
        Accès réservé aux commerciaux.
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
        title="Espace Commercial"
        description="Gérez vos organisations parrainées et suivez vos commissions (20 % de la facture mensuelle)."
      />

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border rounded-2xl p-5">
          <div className="text-xs font-bold uppercase text-slate-400">Organisations</div>
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
          <p className="text-indigo-200 text-sm font-semibold">Votre code parrainage</p>
          <p className="text-2xl font-black tracking-wider">{data.referralCode}</p>
          <p className="text-indigo-200 text-xs mt-1">{Math.round(data.commissionRate * 100)} % sur chaque facture mensuelle des org. parrainées</p>
        </div>
        <Button variant="secondary" onClick={copyCode} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
          <Copy className="w-4 h-4" />
          Copier le code
        </Button>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="font-bold text-lg">Organisations parrainées</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <PlusCircle className="w-4 h-4" />
          Nouvelle organisation
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateOrg} className="bg-white dark:bg-slate-900 border rounded-2xl p-5 grid sm:grid-cols-2 gap-4">
          {(['organizationName', 'managerName', 'managerEmail', 'managerPassword', 'managerPhone'] as const).map((field) => (
            <input
              key={field}
              required={field !== 'managerPhone'}
              type={field.includes('Password') ? 'password' : field.includes('Email') ? 'email' : 'text'}
              placeholder={
                field === 'organizationName' ? 'Nom organisation' :
                field === 'managerName' ? 'Nom du manager' :
                field === 'managerEmail' ? 'E-mail manager' :
                field === 'managerPassword' ? 'Mot de passe manager' : 'Téléphone (optionnel)'
              }
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              className="px-4 py-2.5 rounded-xl border text-sm"
            />
          ))}
          <div className="sm:col-span-2 flex gap-2">
            <Button type="submit" disabled={submitting}>{submitting ? 'Création…' : 'Créer l\'organisation'}</Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </form>
      )}

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
            {data.organizations.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3 font-semibold">{o.name}</td>
                <td className="px-4 py-3 text-slate-500">{o.managerName || '—'}</td>
                <td className="px-4 py-3">{o.plan}</td>
                <td className="px-4 py-3">{o.eventsCount}</td>
              </tr>
            ))}
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
                  <th className="px-4 py-3">Commission (20 %)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.commissions.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3">{c.billingPeriod}</td>
                    <td className="px-4 py-3">{c.tenant.name}</td>
                    <td className="px-4 py-3">{c.invoiceAmount.toLocaleString('fr-FR')} FC</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">{c.commissionAmount.toLocaleString('fr-FR')} FC</td>
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
