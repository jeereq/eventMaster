'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle, CheckCircle2, XCircle, Clock, Download, Plus, RefreshCw, ScanLine, UserCheck, Wallet } from '@/components/icons';
import Link from 'next/link';
import { Alert, EmptyState, Button, Skeleton, SkeletonAnalyticsView } from '@/components/ui';
import WorkspaceStatsOverview, { type WorkspaceStats } from '@/components/WorkspaceStatsOverview';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { CategoryTag } from '@/components/analytics/CategoryTag';
import VendorStatsView from '@/components/dashboard/VendorStatsView';
import { getWorkspaceModules } from '@/lib/planAccess';
import { cn } from '@/lib/cn';
import { SEGMENTED_TRACK, segmentedItem } from '@/components/ui/segmented';
import {
 ChartCard,
 RsvpDonut,
 CategoryBars,
 TimeColumns,
 bucketArrivals,
 bucketByDay,
 AnswerBreakdown,
} from '@/components/analytics/EventCharts';
import {
 extractRsvpFieldsFromTemplateContent,
 supplementFieldsFromGuestPreferences,
 getCustomFieldValue,
 formatCustomFieldValueForDisplay,
 isBooleanFieldType,
 isNumericFieldType,
} from '@/lib/rsvpFormFields';

interface EventItem {
 id: string;
 title: string;
 description: string;
 date: string;
 location: string;
}

interface GuestItem {
 id: string;
 firstName: string;
 lastName: string;
 email: string;
 phone?: string;
 category: string;
 rsvp: 'ACCEPTED' | 'DECLINED' | 'PENDING';
 checkedInAt?: string | null;
 preferences?: {
 specialMeal?: string;
 allergies?: string;
 notes?: string;
 customFields?: Record<string, any>;
 };
}

interface TicketOrderItem {
 status: string;
 quantity: number;
 amountFc: number;
 paidAt?: string | null;
 createdAt: string;
}

interface TemplateItem {
 id: string;
 name: string;
 content: any;
}

interface InvitationItem {
 id: string;
 template?: {
 id: string;
 };
 templateId?: string;
}

const MEAL_OPTIONS = [
 { value: 'none', label: 'Standard' },
 { value: 'vegetarian', label: 'Végétarien' },
 { value: 'vegan', label: 'Végétalien' },
 { value: 'halal', label: 'Halal' },
 { value: 'kosher', label: 'Casher' },
] as const;

function mealLabel(value?: string) {
 if (!value || value === 'none') return 'Standard';
 return MEAL_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

const RSVP_META = {
 ACCEPTED: { label: 'Confirmé', Icon: CheckCircle, iconClass: 'text-primary' },
 DECLINED: { label: 'Décliné', Icon: XCircle, iconClass: 'text-danger' },
 PENDING: { label: 'Sans réponse', Icon: Clock, iconClass: 'text-festive-accent' },
} as const;

/** « 1 confirmé », « 2 confirmés » (0 et 1 au singulier). */
function countLabel(n: number, singular: string, pluralForm = `${singular}s`) {
 return `${n} ${n > 1 ? pluralForm : singular}`;
}

const pct = (n: number) => `${n} %`;

/** Bloc de détail : titre en casse normale, puis une liste groupée à filets fins. */
function DetailSection({ title, value, children }: { title: string; value?: React.ReactNode; children: React.ReactNode }) {
 return (
 <ChartCard title={title} value={value}>
 <ul className="-my-3 grid grid-cols-1 gap-x-10 md:grid-cols-2 [&>li]:border-t [&>li]:border-border [&>li:first-child]:border-t-0 md:[&>li:nth-child(2)]:border-t-0">
 {children}
 </ul>
 </ChartCard>
 );
}

function EventAnalyticsView() {
 const { user, planFeatures, access } = useAuth();
 const canExportReports = user?.role === 'SUPER_ADMIN' || planFeatures?.adminReports === true;
 const protocolView = Boolean(access?.isProtocolOnly);
 const [workspace, setWorkspace] = useState<WorkspaceStats | null>(null);
 const [events, setEvents] = useState<EventItem[]>([]);
 const [selectedEventId, setSelectedEventId] = useState<string>('');
 const [guests, setGuests] = useState<GuestItem[]>([]);
 const [templates, setTemplates] = useState<TemplateItem[]>([]);
 const [invitations, setInvitations] = useState<InvitationItem[]>([]);
 const [ticketOrders, setTicketOrders] = useState<TicketOrderItem[]>([]);
 
 const [loadingEvents, setLoadingEvents] = useState(true);
 const [loadingStats, setLoadingStats] = useState(false);
 const [error, setError] = useState('');
 const [refreshing, setRefreshing] = useState(false);

 const loadEvents = async () => {
 try {
 setError('');
 const [data, stats] = await Promise.all([
 api.get('/events'),
 api.get('/events/workspace-stats').catch(() => null),
 ]);
 const eventsList = Array.isArray(data) ? data : data.events || [];
 setEvents(eventsList);
 if (stats && stats.events) setWorkspace(stats as WorkspaceStats);
 if (eventsList.length > 0) {
 setSelectedEventId(eventsList[0].id);
 }
 } catch (err: any) {
 console.error('Error loading events for analytics:', err);
 setError('Impossible de charger la liste des événements.');
 } finally {
 setLoadingEvents(false);
 }
 };

 const loadStatsForEvent = async (eventId: string) => {
 if (!eventId) return;
 setLoadingStats(true);
 setError('');
 try {
 const [guestsResult, templatesResult, invitesResult, ordersResult] = await Promise.allSettled([
 api.get(`/events/${eventId}/guests`),
 api.get('/templates'),
 api.get(`/events/${eventId}/invitations`),
 api.get(`/events/${eventId}/ticket-orders`),
 ]);

 if (guestsResult.status === 'rejected') {
 throw guestsResult.reason;
 }

 setGuests(guestsResult.value);
 setTemplates(templatesResult.status === 'fulfilled' ? templatesResult.value : []);
 setInvitations(invitesResult.status === 'fulfilled' ? invitesResult.value : []);
 // Billetterie absente ou non autorisée : pas de graphique des ventes, sans erreur.
 setTicketOrders(
 ordersResult.status === 'fulfilled' && Array.isArray(ordersResult.value?.orders) ? ordersResult.value.orders : [],
 );

 if (templatesResult.status === 'rejected' || invitesResult.status === 'rejected') {
 console.warn('Partial analytics load:', {
 templates: templatesResult.status,
 invitations: invitesResult.status,
 });
 }
 } catch (err: any) {
 console.error('Error loading stats for event:', err);
 setError(err?.message || 'Erreur lors du chargement des données statistiques de l\'événement.');
 } finally {
 setLoadingStats(false);
 }
 };

 useEffect(() => {
 if (user) {
 loadEvents();
 }
 }, [user]);

 useEffect(() => {
 if (selectedEventId) {
 loadStatsForEvent(selectedEventId);
 }
 }, [selectedEventId]);

 const handleRefresh = async () => {
 setRefreshing(true);
 try {
 const stats = await api.get('/events/workspace-stats').catch(() => null);
 if (stats && stats.events) setWorkspace(stats as WorkspaceStats);
 if (selectedEventId) await loadStatsForEvent(selectedEventId);
 } finally {
 setRefreshing(false);
 }
 };

 const selectedEvent = events.find(e => e.id === selectedEventId);

 // Statistics calculations
 const totalGuests = guests.length;
 const acceptedCount = guests.filter(g => g.rsvp === 'ACCEPTED').length;
 const declinedCount = guests.filter(g => g.rsvp === 'DECLINED').length;
 const pendingCount = guests.filter(g => g.rsvp === 'PENDING').length;

 const responseRate = totalGuests > 0 ? Math.round(((acceptedCount + declinedCount) / totalGuests) * 100) : 0;
 const checkedInCount = guests.filter((g) => Boolean(g.checkedInAt)).length;

 const uniqueCategories = Array.from(new Set(guests.map(g => g.category || 'Général')));

 const getCustomRsvpFields = () => {
 const fields = invitations.flatMap((invite) => {
 const templateId = invite.template?.id || invite.templateId;
 const template = templates.find((t) => t.id === templateId);
 if (!template?.content) return [];
 return extractRsvpFieldsFromTemplateContent(template.content);
 });

 return supplementFieldsFromGuestPreferences(fields, guests);
 };

 const exportToCSV = () => {
 if (!canExportReports) {
 setError('L\'export de rapports avancés nécessite un forfait Enterprise. Consultez la page Facturation.');
 return;
 }
 if (guests.length === 0) return;
 
 const customFields = getCustomRsvpFields();
 const headers = ['Nom', 'Prénom', 'Email', 'Catégorie', 'Statut de réponse', 'Allergies', 'Repas Spécial', 'Notes'];
 customFields.forEach(f => headers.push(f.label));
 
 const csvRows = [
 headers.join(','),
 ...guests.map(g => {
 const row = [
 `"${g.lastName.replace(/"/g, '""')}"`,
 `"${g.firstName.replace(/"/g, '""')}"`,
 `"${g.email.replace(/"/g, '""')}"`,
 `"${(g.category || 'Général').replace(/"/g, '""')}"`,
 `"${g.rsvp}"`,
 `"${(g.preferences?.allergies || 'Aucune').replace(/"/g, '""')}"`,
 `"${(g.preferences?.specialMeal || 'Standard').replace(/"/g, '""')}"`,
 `"${(g.preferences?.notes || '').replace(/"/g, '""')}"`
 ];
 
 customFields.forEach(f => {
 const val = getCustomFieldValue(g.preferences, f);
 if (val === undefined || val === null) {
 row.push('""');
 } else {
 row.push(`"${formatCustomFieldValueForDisplay(val).replace(/"/g, '""')}"`);
 }
 });
 
 return row.join(',');
 })
 ];
 
 const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.join('\n');
 const encodedUri = encodeURI(csvContent);
 const link = document.createElement('a');
 link.setAttribute('href', encodedUri);
 link.setAttribute('download', `statistiques_${selectedEvent?.title || 'evenement'}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 };

 if (loadingEvents) {
 return <SkeletonAnalyticsView />;
 }

 // Les totaux de l’espace ne recoupent la bande de l’événement que s’ils portent sur ce seul événement.
 const singleEvent = events.length === 1 && (workspace?.events.total ?? 0) <= 1;
 const mealRows = MEAL_OPTIONS.map((option) => ({
 label: option.label,
 count: guests.filter((g) =>
 g.rsvp === 'ACCEPTED' &&
 (option.value === 'none'
 ? !g.preferences?.specialMeal || g.preferences?.specialMeal === 'none'
 : g.preferences?.specialMeal === option.value),
 ).length,
 })).filter((row) => row.count > 0);

 const customFields = getCustomRsvpFields();

 const categoryRows = uniqueCategories
 .map((cat) => {
 const catGuests = guests.filter((g) => (g.category || 'Général') === cat);
 return {
 label: cat,
 accepted: catGuests.filter((g) => g.rsvp === 'ACCEPTED').length,
 pending: catGuests.filter((g) => g.rsvp === 'PENDING').length,
 declined: catGuests.filter((g) => g.rsvp === 'DECLINED').length,
 };
 })
 .sort((a, b) => b.accepted + b.pending + b.declined - (a.accepted + a.pending + a.declined));
 const arrivalBuckets = bucketArrivals(
 guests.filter((g) => g.checkedInAt).map((g) => new Date(g.checkedInAt as string)),
 );
 const paidOrders = ticketOrders.filter((o) => o.status === 'PAID');
 const ticketsSold = paidOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
 const ticketRevenue = paidOrders.reduce((sum, o) => sum + (o.amountFc || 0), 0);
 const salesBuckets = bucketByDay(
 paidOrders.map((o) => ({ at: new Date(o.paidAt || o.createdAt), value: o.quantity || 0 })),
 );
 const plural = (singular: string, pluralForm = `${singular}s`) => (n: number) => (n > 1 ? pluralForm : singular);

 const pendingPct = totalGuests > 0 ? Math.round((pendingCount / totalGuests) * 100) : 0;
 const rsvpKpis = [
 <KpiCard
 key="confirmed"
 icon={<UserCheck className="w-[18px] h-[18px]" />}
 label="Confirmés"
 value={`${acceptedCount} / ${totalGuests}`}
 hint={`${countLabel(declinedCount, 'décliné')}`}
 />,
 <KpiCard
 key="pending"
 icon={<Clock className="w-[18px] h-[18px]" />}
 label="Sans réponse"
 value={String(pendingCount)}
 hint={`${pct(pendingPct)} des invités`}
 tone={pendingCount > 0 ? 'warning' : 'default'}
 />,
 <KpiCard
 key="rate"
 icon={<CheckCircle2 className="w-[18px] h-[18px]" />}
 label="Taux de réponse"
 value={pct(responseRate)}
 hint={`${countLabel(acceptedCount + declinedCount, 'réponse')} sur ${totalGuests}`}
 />,
 ];
 const entryKpi = (
 <KpiCard
 key="entries"
 icon={<ScanLine className="w-[18px] h-[18px]" />}
 label="Arrivés"
 value={String(checkedInCount)}
 hint={acceptedCount > 0 ? `sur ${countLabel(acceptedCount, 'confirmé')}` : undefined}
 />
 );
 const ticketKpi = ticketOrders.length > 0 ? (
 <KpiCard
 key="tickets"
 icon={<Wallet className="w-[18px] h-[18px]" />}
 label="Billetterie"
 value={`${new Intl.NumberFormat('fr-FR').format(ticketRevenue)} FC`}
 hint={`${countLabel(ticketsSold, 'billet')} payé${ticketsSold > 1 ? 's' : ''}`}
 className="col-span-2 xl:col-span-1"
 />
 ) : null;
 const kpis = [...(protocolView ? [entryKpi, ...rsvpKpis] : [...rsvpKpis, entryKpi]), ticketKpi].filter(Boolean);

 // Une seule catégorie reprendrait mot pour mot les chiffres de la bande : on ne l’affiche pas.
 const showMeals = acceptedCount > 0 && mealRows.length > 0;
 const showCategories = uniqueCategories.length > 1;
 const showQuestions = customFields.length > 0;
 const detailCount = [showMeals, showQuestions].filter(Boolean).length;

 return (
 <div className="space-y-10 w-full">
 {events.length > 0 ? (
 <section className="em-header-wash rounded-[26px] p-5 sm:p-7 space-y-6">
 <div className="flex items-center gap-2">
 <label htmlFor="analytics-event" className="sr-only">Événement</label>
 <select
 id="analytics-event"
 value={selectedEventId}
 onChange={(e) => setSelectedEventId(e.target.value)}
 className="h-11 min-w-0 flex-1 sm:flex-none sm:max-w-md rounded-full border border-border bg-surface pl-4 pr-9 text-[15px] font-semibold text-foreground shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
 >
 {events.map((e) => (
 <option key={e.id} value={e.id}>{e.title}</option>
 ))}
 </select>
 <Button
 variant="ghost"
 size="sm"
 onClick={handleRefresh}
 disabled={loadingStats || refreshing}
 title="Rafraîchir les données"
 aria-label="Rafraîchir les données"
 className="w-11 shrink-0 rounded-full px-0"
 leftIcon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
 />
 </div>

 {loadingStats ? (
 <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-busy="true">
 {Array.from({ length: 4 }).map((_, i) => (
 <div key={i} className="space-y-4 rounded-[20px] bg-surface p-4 sm:p-5">
 <Skeleton className="h-4 w-24" />
 <Skeleton className="h-7 w-14" />
 </div>
 ))}
 </div>
 ) : guests.length > 0 ? (
 <div className={cn('grid grid-cols-2 gap-3 sm:gap-4', ticketKpi ? 'xl:grid-cols-5' : 'xl:grid-cols-4')}>
 {kpis}
 </div>
 ) : null}
 </section>
 ) : null}

 {error && <Alert variant="error">{error}</Alert>}

 {events.length === 0 ? (
 <EmptyState
 illustration="events"
 title="Aucun événement"
 action={
 <Button href="/dashboard/events" leftIcon={<Plus className="w-4 h-4" />}>Créer un événement</Button>
 }
 />
 ) : loadingStats ? (
 <Skeleton className="h-48 w-full rounded-[var(--radius-card)]" aria-busy="true" />
 ) : guests.length === 0 ? (
 <EmptyState illustration="guests" title="Aucun invité pour cet événement" />
 ) : (
 <div className="space-y-10">

 {(() => {
 const cards = [
 <ChartCard key="rsvp" title="Réponses" value={countLabel(totalGuests, 'invité')}>
 <RsvpDonut counts={{ accepted: acceptedCount, pending: pendingCount, declined: declinedCount }} />
 </ChartCard>,
 showCategories ? (
 <ChartCard key="cat" title="Par catégorie" value={countLabel(categoryRows.length, 'catégorie')}>
 <CategoryBars rows={categoryRows} />
 </ChartCard>
 ) : null,
 arrivalBuckets.length > 0 ? (
 <ChartCard key="arrivals" title="Arrivées" value={countLabel(checkedInCount, 'arrivé')}>
 <TimeColumns buckets={arrivalBuckets} unit={plural('arrivé')} />
 </ChartCard>
 ) : null,
 salesBuckets.length > 0 ? (
 <ChartCard
 key="sales"
 title="Billets vendus"
 value={`${countLabel(ticketsSold, 'billet')} · ${new Intl.NumberFormat('fr-FR').format(ticketRevenue)} FC`}
 >
 <TimeColumns buckets={salesBuckets} unit={plural('billet')} />
 </ChartCard>
 ) : null,
 ].filter(Boolean) as React.ReactElement[];
 return (
 <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
 {cards.map((card, i) =>
 cards.length % 2 === 1 && i === cards.length - 1 && cards.length > 1
 ? <div key={card.key} className="lg:col-span-2">{card}</div>
 : card,
 )}
 </div>
 );
 })()}

 {detailCount > 0 ? (
 <DetailSection title="Préférences des confirmés" value={countLabel(acceptedCount, 'confirmé')}>
 {showMeals ? (
 <li className="space-y-2 py-3">
 <p className="text-sm font-medium text-foreground">Régime</p>
 <AnswerBreakdown items={mealRows} order={MEAL_OPTIONS.map((o) => o.label)} />
 </li>
 ) : null}

 {showQuestions ? (
 customFields.map((field) => {
 const answers = guests
 .filter((g) => g.rsvp === 'ACCEPTED' && getCustomFieldValue(g.preferences, field) !== undefined)
 .map((g) => getCustomFieldValue(g.preferences, field)!);

 const totalAnswers = answers.length;
 const heading = (
 <p className="break-words text-sm font-medium text-foreground" title={field.analyticsKey}>
 {field.label}
 </p>
 );
 const noAnswer = <p className="text-xs text-muted">Aucune réponse</p>;

 if (isBooleanFieldType(field.type)) {
 const yesCount = answers.filter((a) => a === true).length;
 const noCount = totalAnswers - yesCount;
 return (
 <li key={field.id} className="space-y-2 py-3">
 {heading}
 {totalAnswers === 0 ? noAnswer : (
 <AnswerBreakdown items={[{ label: 'Oui', count: yesCount }, { label: 'Non', count: noCount }]} order={['Oui', 'Non']} />
 )}
 </li>
 );
 }

 if (isNumericFieldType(field.type)) {
 const numericAnswers = answers.map((a) => Number(a)).filter((n) => Number.isFinite(n));
 if (numericAnswers.length === 0) {
 return (
 <li key={field.id} className="space-y-2 py-3">
 {heading}
 {noAnswer}
 </li>
 );
 }
 const avg = (numericAnswers.reduce((s, n) => s + n, 0) / numericAnswers.length).toFixed(1);
 const min = Math.min(...numericAnswers);
 const max = Math.max(...numericAnswers);
 return (
 <li key={field.id} className="space-y-2 py-3">
 {heading}
 <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums text-muted">
 <span>Moy. : {avg}</span>
 <span>Min : {min}</span>
 <span>Max : {max}</span>
 <span>{countLabel(totalAnswers, 'réponse')}</span>
 </p>
 </li>
 );
 }

 {
 const counts: Record<string, number> = {};
 answers.forEach((ans) => {
 const strVal = ans === null || ans === undefined ? 'Non renseigné' : formatCustomFieldValueForDisplay(ans);
 counts[strVal] = (counts[strVal] || 0) + 1;
 });

 return (
 <li key={field.id} className="space-y-2 py-3">
 {heading}
 {totalAnswers === 0 ? noAnswer : (
 <AnswerBreakdown items={Object.entries(counts).map(([label, count]) => ({ label, count }))} />
 )}
 </li>
 );
 }
 })
 ) : null}
 </DetailSection>
 ) : null}

 <section className="space-y-3">
 <div className="flex flex-wrap items-center justify-between gap-3">
 <h2 className="text-[15px] font-semibold text-foreground">
 Réponses
 {guests.length > 10 ? (
 <span className="ml-2 font-normal tabular-nums text-muted">10 sur {guests.length}</span>
 ) : null}
 </h2>
 {canExportReports ? (
 <Button
 type="button"
 size="sm"
 variant="secondary"
 onClick={exportToCSV}
 leftIcon={<Download className="w-4 h-4" />}
 >
 Exporter en CSV
 </Button>
 ) : (
 <div className="flex items-center gap-3">
 <Link
 href="/dashboard/billing"
 className="text-xs font-medium text-muted underline underline-offset-2 hover:text-foreground"
 >
 Réservé Enterprise
 </Link>
 <Button
 type="button"
 size="sm"
 variant="secondary"
 disabled
 leftIcon={<Download className="w-4 h-4" />}
 >
 Exporter en CSV
 </Button>
 </div>
 )}
 </div>

 <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border bg-surface">
 <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
 <thead>
 <tr className="border-b border-border text-xs text-muted">
 <th className="px-4 py-2.5 font-medium">Invité</th>
 <th className="px-4 py-2.5 font-medium">Catégorie</th>
 <th className="px-4 py-2.5 font-medium">Statut de réponse</th>
 <th className="px-4 py-2.5 font-medium">Régime</th>
 <th className="px-4 py-2.5 font-medium">Allergies</th>
 <th className="px-4 py-2.5 font-medium">Notes</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border text-foreground">
 {guests.slice(0, 10).map((g) => {
 const rsvp = RSVP_META[g.rsvp] ?? RSVP_META.PENDING;
 return (
 <tr key={g.id} className="transition-colors hover:bg-surface-muted/50">
 <td className="px-4 py-3 font-medium">{g.firstName} {g.lastName}</td>
 <td className="px-4 py-3"><CategoryTag label={g.category || 'Général'} /></td>
 <td className="px-4 py-3">
 <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
 <rsvp.Icon className={`w-3.5 h-3.5 ${rsvp.iconClass}`} aria-hidden />
 {rsvp.label}
 </span>
 </td>
 <td className="px-4 py-3 capitalize">{mealLabel(g.preferences?.specialMeal)}</td>
 <td className="px-4 py-3 max-w-[160px] truncate text-muted" title={g.preferences?.allergies}>
 {g.preferences?.allergies || ''}
 </td>
 <td className="px-4 py-3 max-w-[200px] truncate text-muted" title={g.preferences?.notes}>
 {g.preferences?.notes || ''}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </section>
 </div>
 )}

 {workspace && events.length > 0 ? (
 singleEvent ? (
 // Un seul événement : ses invités et entrées sont déjà dans la bande du haut ; restent les tâches.
 <WorkspaceStatsOverview stats={workspace} protocol={protocolView} hideEventTotals hideUpcoming />
 ) : (
 <section aria-labelledby="analytics-all-events" className="space-y-4">
 <h2 id="analytics-all-events" className="text-lg font-semibold text-foreground">Tous les événements</h2>
 <WorkspaceStatsOverview stats={workspace} protocol={protocolView} hideUpcoming />
 </section>
 )
 ) : null}
 </div>
 );
}


/**
 * Statistiques : un prestataire (salle, prestations) voit ses demandes, réservations et
 * revenus ; un compte « Salle & presta » qui organise aussi des événements passe d'une vue à l'autre.
 */
export default function AnalyticsPage() {
 const { tenant, access, planQuota, planFeatures } = useAuth();
 const accountKind = tenant?.accountKind;
 const workspace = getWorkspaceModules({ accountKind, access, planQuota, planFeatures });
 const vendorDesk = (accountKind === 'VENDOR' || accountKind === 'BOTH') && !access?.isProtocolOnly;
 const hasEvents = accountKind !== 'VENDOR' && workspace.showEvents;
 const [view, setView] = useState<'vendor' | 'events'>('vendor');

 if (!vendorDesk) return <EventAnalyticsView />;

 const vendorPanel = (
 <VendorStatsView isVenue={workspace.showRooms} />
 );

 if (!hasEvents) {
 return (
 <div className="space-y-6 w-full">
 {vendorPanel}
 </div>
 );
 }

 return (
 <div className="space-y-6 w-full">
 <div role="tablist" aria-label="Statistiques" className={cn('inline-flex', SEGMENTED_TRACK)}>
 {([
 ['vendor', 'Ventes marketplace'],
 ['events', 'Mes événements'],
 ] as const).map(([id, label]) => (
 <button
 key={id}
 type="button"
 role="tab"
 aria-selected={view === id}
 onClick={() => setView(id)}
 className={segmentedItem(view === id, 'text-xs')}
 >
 {label}
 </button>
 ))}
 </div>
 {view === 'vendor' ? (
 <div className="space-y-6">
 {vendorPanel}
 </div>
 ) : (
 <EventAnalyticsView />
 )}
 </div>
 );
}
