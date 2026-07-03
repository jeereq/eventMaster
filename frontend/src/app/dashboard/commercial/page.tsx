'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Building2, Loader2, PlusCircle, TrendingUp, Users, Wallet, Mail, MessageSquare, RefreshCw, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { Button, PageHeader } from '@/components/ui';
import { CommercialNotificationsPanel } from '@/components/CommercialNotifications';
import ReferralShareButtons from '@/components/commercial/ReferralShareButtons';

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
    managerEmail?: string;
    managerId?: string;
    managerIsEmailVerified?: boolean;
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
  const [verificationMethod, setVerificationMethod] = useState<'EMAIL' | 'WHATSAPP'>('EMAIL');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendingManagerId, setResendingManagerId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'COMMERCIAL') return;
    api.get('/commercial/dashboard')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    if (verificationMethod === 'WHATSAPP' && !form.managerPhone) {
      setError('Le téléphone est obligatoire pour envoyer le code OTP par WhatsApp.');
      setSubmitting(false);
      return;
    }
    try {
      const data = await api.post('/commercial/organizations', { ...form, verificationMethod });
      setSuccess(data.message || 'Organisation créée.');
      setShowForm(false);
      setForm({ organizationName: '', managerName: '', managerEmail: '', managerPassword: '', managerPhone: '' });
      setVerificationMethod('EMAIL');
      const refreshed = await api.get('/commercial/dashboard');
      setData(refreshed);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendManagerOtp = async (managerId: string) => {
    setResendingManagerId(managerId);
    setError('');
    setSuccess('');
    try {
      const data = await api.post(`/commercial/organizations/${managerId}/resend-verification`);
      setSuccess(data.message || 'Code OTP renvoyé au manager.');
    } catch (err: any) {
      setError(err.message || 'Impossible de renvoyer le code OTP.');
    } finally {
      setResendingManagerId(null);
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
        title="Parrainage & commissions"
        description="Compte commercial plateforme — sans organisation. Gérez vos parrainages et suivez vos commissions."
      />

      <CommercialNotificationsPanel />

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
        <ReferralShareButtons referralCode={data.referralCode} />
      </div>

      <div className="flex justify-between items-center">
        <h2 className="font-bold text-lg">Organisations parrainées</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <PlusCircle className="w-4 h-4" />
          Nouvelle organisation
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreateOrg} className="bg-white dark:bg-slate-900 border rounded-2xl p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
          {(['organizationName', 'managerName', 'managerEmail', 'managerPassword', 'managerPhone'] as const).map((field) => (
            <input
              key={field}
              required={field !== 'managerPhone'}
              type={field.includes('Password') ? 'password' : field.includes('Email') ? 'email' : field === 'managerPhone' ? 'tel' : 'text'}
              placeholder={
                field === 'organizationName' ? 'Nom organisation' :
                field === 'managerName' ? 'Nom du manager' :
                field === 'managerEmail' ? 'E-mail manager' :
                field === 'managerPassword' ? 'Mot de passe manager (min. 6 car.)' :
                verificationMethod === 'WHATSAPP' ? 'Téléphone WhatsApp (+243…)' : 'Téléphone (optionnel)'
              }
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              className="px-4 py-2.5 rounded-xl border text-sm"
            />
          ))}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Validation du compte manager (OTP)</label>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <button type="button" onClick={() => setVerificationMethod('EMAIL')} className={`py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${verificationMethod === 'EMAIL' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-slate-200 text-slate-600'}`}>
                <Mail className="w-4 h-4" /> OTP par e-mail
              </button>
              <button type="button" onClick={() => setVerificationMethod('WHATSAPP')} className={`py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${verificationMethod === 'WHATSAPP' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-slate-200 text-slate-600'}`}>
                <MessageSquare className="w-4 h-4" /> OTP WhatsApp
              </button>
            </div>
          </div>
          <div className="flex gap-2">
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
              <th className="px-4 py-3">Compte</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Événements</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.organizations.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3 font-semibold">{o.name}</td>
                <td className="px-4 py-3 text-slate-500">
                  <div>{o.managerName || '—'}</div>
                  {o.managerEmail && <div className="text-xs text-slate-400">{o.managerEmail}</div>}
                </td>
                <td className="px-4 py-3">
                  {o.managerIsEmailVerified === false ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 w-fit">
                        En attente OTP
                      </span>
                      {o.managerId && (
                        <button
                          type="button"
                          onClick={() => handleResendManagerOtp(o.managerId!)}
                          disabled={resendingManagerId === o.managerId}
                          className="text-[10px] font-bold text-amber-700 hover:underline inline-flex items-center gap-1 w-fit"
                        >
                          {resendingManagerId === o.managerId ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          Renvoyer OTP
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Validé
                    </span>
                  )}
                </td>
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
                  <th className="px-4 py-3">Commission ({Math.round(data.commissionRate * 100)} %)</th>
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
