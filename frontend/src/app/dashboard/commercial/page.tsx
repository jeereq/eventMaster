'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
 Building2, Loader2, PlusCircle, TrendingUp, Users, Wallet, Mail, MessageSquare, RefreshCw, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { Button, PageHeader, SkeletonCommercialView, Pagination, paginateItems, PhoneInput, usePageSize } from '@/components/ui';
import { DEFAULT_PHONE_COUNTRY_CODE, composeE164 } from '@/lib/phone';
import ReferralShareButtons from '@/components/commercial/ReferralShareButtons';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import {
  allowsAuthOtpChoice,
  defaultAuthOtpMethod,
  type AuthOtpMethod,
} from '@/lib/authOtpChannels';

 interface CommercialDashboard {
 referralCode: string;
 commissionRate: number;
 renewalCommissionRate?: number;
 stats: {
 organizations: number;
 totalCommission: number;
 monthlyCommission: number;
 monthlyDue?: number;
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
 paidAt?: string | null;
 payoutProofUrl?: string | null;
 commissionRate?: number;
 tenant: { name: string };
 }>;
}

export default function CommercialDashboardPage() {
 const { user } = useAuth();
 const { site } = usePlatformSite();
 const authChannels = site.authOtpChannels;
 const canChooseOtpChannel = allowsAuthOtpChoice(authChannels);
 const [data, setData] = useState<CommercialDashboard | null>(null);
 const [loading, setLoading] = useState(true);
 const [showForm, setShowForm] = useState(false);
 const [orgsPage, setOrgsPage] = useState(1);
 const [commPage, setCommPage] = useState(1);
 const [orgsPageSize, setOrgsPageSize] = usePageSize('commercial-orgs', 10);
 const [commPageSize, setCommPageSize] = usePageSize('commercial-comms', 10);
 const [form, setForm] = useState({
 organizationName: '',
 managerName: '',
 managerEmail: '',
 managerPassword: '',
 managerPhone: '',
 });
 const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_PHONE_COUNTRY_CODE);
 const [phoneNational, setPhoneNational] = useState('');
 const [submitting, setSubmitting] = useState(false);
 const [verificationMethod, setVerificationMethod] = useState<AuthOtpMethod>(defaultAuthOtpMethod(authChannels));
 const [error, setError] = useState('');
 const [success, setSuccess] = useState('');
 const [resendingManagerId, setResendingManagerId] = useState<string | null>(null);

 useEffect(() => {
   setVerificationMethod(defaultAuthOtpMethod(authChannels));
 }, [authChannels]);

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
 if (verificationMethod === 'WHATSAPP' && !phoneNational.trim()) {
 setError('Le téléphone est obligatoire pour envoyer le code OTP par WhatsApp.');
 setSubmitting(false);
 return;
 }
 try {
 const managerPhone = composeE164(phoneCountryCode, phoneNational) || '';
 const data = await api.post('/commercial/organizations', {
 ...form,
 managerPhone,
 phoneCountryCode,
 nationalNumber: phoneNational,
 verificationMethod,
 });
 setSuccess(data.message || 'Organisation créée.');
 setShowForm(false);
 setForm({ organizationName: '', managerName: '', managerEmail: '', managerPassword: '', managerPhone: '' });
 setPhoneNational('');
 setPhoneCountryCode(DEFAULT_PHONE_COUNTRY_CODE);
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
 <div className="text-center py-20 text-muted">
 Accès réservé aux commerciaux.
 </div>
 );
 }

 if (loading || !data) {
 return <SkeletonCommercialView />;
 }

 const paginatedOrgs = paginateItems(data.organizations, orgsPage, orgsPageSize);
 const paginatedComms = paginateItems(data.commissions, commPage, commPageSize);

 return (
 <div className="space-y-6">
 <PageHeader
 title="Parrainage & commissions"
 description="Compte commercial plateforme — sans organisation. Gérez vos parrainages et suivez vos commissions."
 />

 <div className="grid sm:grid-cols-3 gap-4">
 <div className="bg-white dark:bg-background border rounded-2xl p-5">
 <div className="text-xs font-bold uppercase text-muted">Organisations</div>
 <div className="text-2xl font-black mt-1 flex items-center gap-2">
 <Building2 className="w-5 h-5 text-primary" />
 {data.stats.organizations}
 </div>
 </div>
 <div className="bg-white dark:bg-background border rounded-2xl p-5">
 <div className="text-xs font-bold uppercase text-muted">Commission ce mois</div>
 <div className="text-2xl font-black mt-1 flex items-center gap-2">
 <TrendingUp className="w-5 h-5 text-emerald-600" />
 {data.stats.monthlyCommission.toLocaleString('fr-FR')} FC
 </div>
 {(data.stats.monthlyDue ?? 0) > 0 && (
 <p className="text-[11px] text-amber-700 mt-1">Dont {data.stats.monthlyDue!.toLocaleString('fr-FR')} FC à verser</p>
 )}
 </div>
 <div className="bg-white dark:bg-background border rounded-2xl p-5">
 <div className="text-xs font-bold uppercase text-muted">Total commissions</div>
 <div className="text-2xl font-black mt-1 flex items-center gap-2">
 <Wallet className="w-5 h-5 text-amber-600" />
 {data.stats.totalCommission.toLocaleString('fr-FR')} FC
 </div>
 </div>
 </div>

 <div className="bg-primary text-white rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <p className="text-white/80 text-sm font-semibold">Votre code parrainage</p>
 <p className="text-2xl font-black tracking-wider">{data.referralCode}</p>
 <p className="text-white/80 text-xs mt-1">{Math.round(data.commissionRate * 100)} % au premier paiement, puis {Math.round((data.renewalCommissionRate ?? 0.2) * 100)} % sur les factures suivantes. Versement hors plateforme par EventMaster, notifié au Super Admin en début de mois.</p>
 </div>
 <ReferralShareButtons referralCode={data.referralCode} />
 </div>

 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
 <h2 className="font-bold text-lg">Organisations parrainées</h2>
 <Button onClick={() => setShowForm(!showForm)} className="w-full sm:w-auto">
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
 <form onSubmit={handleCreateOrg} className="bg-white dark:bg-background border rounded-2xl p-5 space-y-4">
 <div className="grid sm:grid-cols-2 gap-4">
 {(['organizationName', 'managerName', 'managerEmail', 'managerPassword'] as const).map((field) => (
 <input
 key={field}
 required
 type={field.includes('Password') ? 'password' : field.includes('Email') ? 'email' : 'text'}
 placeholder={
 field === 'organizationName' ? 'Nom organisation' :
 field === 'managerName' ? 'Nom du manager' :
 field === 'managerEmail' ? 'E-mail manager' :
 'Mot de passe manager (min. 6 car.)'
 }
 value={form[field]}
 onChange={(e) => setForm({ ...form, [field]: e.target.value })}
 className="px-4 py-2.5 rounded-xl border text-sm"
 />
 ))}
 <div className="sm:col-span-2">
 <PhoneInput
 id="manager-phone"
 label={verificationMethod === 'WHATSAPP' ? 'Téléphone WhatsApp' : 'Téléphone (optionnel)'}
 countryCode={phoneCountryCode}
 national={phoneNational}
 onCountryCodeChange={setPhoneCountryCode}
 onNationalChange={setPhoneNational}
 required={verificationMethod === 'WHATSAPP'}
 />
 </div>
 </div>
 <div>
 <label className="block text-xs font-bold text-muted uppercase mb-2">Validation du compte manager (OTP)</label>
 {canChooseOtpChannel ? (
 <div className="grid grid-cols-2 gap-3 max-w-md">
 <button type="button" onClick={() => setVerificationMethod('EMAIL')} className={`py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${verificationMethod === 'EMAIL' ? 'bg-primary/10 border-primary/40 text-primary' : 'border-border text-muted'}`}>
 <Mail className="w-4 h-4" /> OTP par e-mail
 </button>
 <button type="button" onClick={() => setVerificationMethod('WHATSAPP')} className={`py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${verificationMethod === 'WHATSAPP' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-border text-muted'}`}>
 <MessageSquare className="w-4 h-4" /> OTP WhatsApp
 </button>
 </div>
 ) : (
 <p className="text-xs text-muted">
 Code envoyé {verificationMethod === 'WHATSAPP' ? 'par WhatsApp' : 'par e-mail'} (réglage plateforme).
 </p>
 )}
 </div>
 <div className="flex gap-2">
 <Button type="submit" disabled={submitting}>{submitting ? 'Création…' : 'Créer l\'organisation'}</Button>
 <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Annuler</Button>
 </div>
 </form>
 )}

 <div className="md:hidden space-y-3">
 {paginatedOrgs.map((o) => (
 <div key={o.id} className="bg-white dark:bg-background border rounded-2xl p-4 space-y-2">
 <div className="flex items-start justify-between gap-2">
 <p className="font-semibold text-foreground dark:text-foreground">{o.name}</p>
 <span className="text-xs font-bold text-primary shrink-0">{o.plan}</span>
 </div>
 <div className="text-xs text-muted space-y-0.5">
 <p>{o.managerName || '—'}</p>
 {o.managerEmail && <p className="text-muted break-all">{o.managerEmail}</p>}
 </div>
 <div className="flex flex-wrap items-center gap-2 text-xs">
 {o.managerIsEmailVerified === false ? (
 <>
 <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
 En attente OTP
 </span>
 {o.managerId && (
 <button
 type="button"
 onClick={() => handleResendManagerOtp(o.managerId!)}
 disabled={resendingManagerId === o.managerId}
 className="text-[10px] font-bold text-amber-700 hover:underline inline-flex items-center gap-1"
 >
 {resendingManagerId === o.managerId ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
 Renvoyer OTP
 </button>
 )}
 </>
 ) : (
 <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
 Validé
 </span>
 )}
 <span className="text-muted">{o.eventsCount} événement{o.eventsCount !== 1 ? 's' : ''}</span>
 </div>
 </div>
 ))}
 </div>

 <div className="hidden md:block em-data-table-wrap">
 <table className="em-data-table min-w-[640px]">
 <thead>
 <tr>
 <th>Organisation</th>
 <th>Manager</th>
 <th>Compte</th>
 <th>Plan</th>
 <th>Événements</th>
 </tr>
 </thead>
 <tbody>
 {paginatedOrgs.map((o) => (
 <tr key={o.id}>
 <td className="font-semibold">{o.name}</td>
 <td>
 <div>{o.managerName || '—'}</div>
 {o.managerEmail && <div className="em-cell-muted">{o.managerEmail}</div>}
 </td>
 <td>
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
 <td>{o.plan}</td>
 <td>{o.eventsCount}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 <Pagination
 page={orgsPage}
 pageSize={orgsPageSize}
 total={data.organizations.length}
 onPageChange={setOrgsPage}
 onPageSizeChange={setOrgsPageSize}
 itemLabel="organisations"
 />

 {data.commissions.length > 0 && (
 <div>
 <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
 <Users className="w-5 h-5" /> Historique commissions
 </h2>
 <div className="md:hidden space-y-3">
 {paginatedComms.map((c) => (
 <div key={c.id} className="bg-white dark:bg-background border rounded-2xl p-4 space-y-1">
 <div className="flex items-start justify-between gap-2">
 <p className="font-semibold text-sm text-foreground dark:text-foreground">{c.tenant.name}</p>
 <p className="font-bold text-emerald-600 text-sm shrink-0">{c.commissionAmount.toLocaleString('fr-FR')} FC</p>
 </div>
 <p className="text-xs text-muted">
 {c.billingPeriod}{c.paidAt ? ' · versé' : ' · dû'}
 {c.payoutProofUrl ? (
 <>
 {' · '}
 <a href={c.payoutProofUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">Preuve</a>
 </>
 ) : null}
 </p>
 <p className="text-xs text-muted">Facture : {c.invoiceAmount.toLocaleString('fr-FR')} FC ({Math.round((c.commissionRate ?? data.commissionRate) * 100)} %)</p>
 </div>
 ))}
 </div>
 <div className="hidden md:block em-data-table-wrap">
 <table className="em-data-table min-w-[560px]">
 <thead>
 <tr>
 <th>Période</th>
 <th>Organisation</th>
 <th>Facture</th>
 <th>Commission</th>
 <th>Statut</th>
 </tr>
 </thead>
 <tbody>
 {paginatedComms.map((c) => (
 <tr key={c.id}>
 <td>{c.billingPeriod}</td>
 <td>{c.tenant.name}</td>
 <td>{c.invoiceAmount.toLocaleString('fr-FR')} FC</td>
 <td className="font-bold text-emerald-600">{c.commissionAmount.toLocaleString('fr-FR')} FC</td>
 <td className="text-xs text-muted">
 {c.paidAt ? 'Versé' : 'Dû'}
 {c.payoutProofUrl ? (
 <>
 {' · '}
 <a href={c.payoutProofUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">Preuve</a>
 </>
 ) : null}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <Pagination
 page={commPage}
 pageSize={commPageSize}
 total={data.commissions.length}
 onPageChange={setCommPage}
 onPageSizeChange={setCommPageSize}
 itemLabel="commissions"
 />
 </div>
 )}

 </div>
 );
}
