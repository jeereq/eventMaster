'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
 Building2, Loader2, TrendingUp, Users, Wallet,
} from 'lucide-react';
import { Button, PageHeader, SkeletonCommercialView, Pagination, paginateItems } from '@/components/ui';
import { CommercialNotificationsPanel } from '@/components/CommercialNotifications';
import ReferralShareButtons from '@/components/commercial/ReferralShareButtons';

interface OrgCommercialDashboard {
 referralCode: string;
 commissionRate: number;
 organizationName?: string;
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
 const [orgsPage, setOrgsPage] = useState(1);
 const [commPage, setCommPage] = useState(1);
 const ORGS_PER_PAGE = 10;
 const COMM_PER_PAGE = 10;

 useEffect(() => {
 if (access?.level !== 'commercial') return;
 api.get('/org-commercial/dashboard')
 .then(setData)
 .catch(console.error)
 .finally(() => setLoading(false));
 }, [access]);

 if (user?.orgRole !== 'COMMERCIAL' && access?.level !== 'commercial') {
 return (
 <div className="text-center py-20 text-muted">
 Accès réservé aux commerciaux de l&apos;organisation.
 </div>
 );
 }

 if (loading || !data) {
 return <SkeletonCommercialView />;
 }

 const paginatedOrgs = paginateItems(data.organizations, orgsPage, ORGS_PER_PAGE);
 const paginatedComms = paginateItems(data.commissions, commPage, COMM_PER_PAGE);

 return (
 <div className="space-y-6">
 <PageHeader
 title="Réseau commercial"
 description={`Parrainez de nouvelles organisations pour ${data.organizationName || 'votre organisation'} et suivez vos commissions.`}
 />

 <CommercialNotificationsPanel />

 <div className="grid sm:grid-cols-3 gap-4">
 <div className="bg-white dark:bg-background border rounded-2xl p-5">
 <div className="text-xs font-bold uppercase text-muted">Organisations parrainées</div>
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
 <p className="text-white/80 text-sm font-semibold">Votre code parrainage organisation</p>
 <p className="text-2xl font-black tracking-wider">{data.referralCode}</p>
 <p className="text-white/80 text-xs mt-1">
 {Math.round(data.commissionRate * 100)} % sur chaque facture des org. que vous parrainez
 </p>
 </div>
 <ReferralShareButtons referralCode={data.referralCode} />
 </div>

 <div className="md:hidden space-y-3">
 {data.organizations.length === 0 ? (
 <p className="text-center text-muted italic py-8 bg-white dark:bg-background border rounded-2xl">
 Aucune organisation parrainée pour le moment.
 </p>
 ) : (
 paginatedOrgs.map((o) => (
 <div key={o.id} className="bg-white dark:bg-background border rounded-2xl p-4 space-y-1">
 <div className="flex items-start justify-between gap-2">
 <p className="font-semibold text-foreground dark:text-foreground">{o.name}</p>
 <span className="text-xs font-bold text-primary shrink-0">{o.plan}</span>
 </div>
 <p className="text-xs text-muted">{o.managerName || '—'}</p>
 <p className="text-xs text-muted">{o.eventsCount} événement{o.eventsCount !== 1 ? 's' : ''}</p>
 </div>
 ))
 )}
 </div>

 <div className="hidden md:block em-data-table-wrap">
 <table className="em-data-table min-w-[560px]">
 <thead>
 <tr>
 <th>Organisation</th>
 <th>Manager</th>
 <th>Plan</th>
 <th>Événements</th>
 </tr>
 </thead>
 <tbody>
 {data.organizations.length === 0 ? (
 <tr>
 <td colSpan={4} className="text-center text-muted italic py-8">
 Aucune organisation parrainée pour le moment.
 </td>
 </tr>
 ) : (
 paginatedOrgs.map((o) => (
 <tr key={o.id}>
 <td className="font-semibold">{o.name}</td>
 <td className="text-muted">{o.managerName || '—'}</td>
 <td>{o.plan}</td>
 <td>{o.eventsCount}</td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>

 <Pagination
 page={orgsPage}
 pageSize={ORGS_PER_PAGE}
 total={data.organizations.length}
 onPageChange={setOrgsPage}
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
 <p className="text-xs text-muted">{c.billingPeriod}</p>
 <p className="text-xs text-muted">
 Facture : {c.invoiceAmount.toLocaleString('fr-FR')} FC
 {c.commissionRate != null && ` (${Math.round(c.commissionRate * 100)} %)`}
 </p>
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
 </tr>
 </thead>
 <tbody>
 {paginatedComms.map((c) => (
 <tr key={c.id}>
 <td>{c.billingPeriod}</td>
 <td>{c.tenant.name}</td>
 <td>{c.invoiceAmount.toLocaleString('fr-FR')} FC</td>
 <td className="font-bold text-emerald-600">
 {c.commissionAmount.toLocaleString('fr-FR')} FC
 {c.commissionRate != null && (
 <span className="text-muted font-normal ml-1">({Math.round(c.commissionRate * 100)} %)</span>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <Pagination
 page={commPage}
 pageSize={COMM_PER_PAGE}
 total={data.commissions.length}
 onPageChange={setCommPage}
 itemLabel="commissions"
 />
 </div>
 )}
 </div>
 );
}
