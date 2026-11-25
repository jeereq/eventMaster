'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle, XCircle, Clock, Download, Plus, RefreshCw } from '@/components/icons';
import Link from 'next/link';
import { Alert, EmptyState, Button, Skeleton, SkeletonAnalyticsView } from '@/components/ui';
import WorkspaceStatsOverview, { StatStrip, type StatMetric, type WorkspaceStats } from '@/components/WorkspaceStatsOverview';
import VendorStatsView from '@/components/dashboard/VendorStatsView';
import { getWorkspaceModules } from '@/lib/planAccess';
import { cn } from '@/lib/cn';
import { SEGMENTED_TRACK, segmentedItem } from '@/components/ui/segmented';
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
 PENDING: { label: 'En attente', Icon: Clock, iconClass: 'text-festive-accent' },
} as const;

/** « 1 confirmé », « 2 confirmés » (0 et 1 au singulier). */
function countLabel(n: number, singular: string, pluralForm = `${singular}s`) {
 return `${n} ${n > 1 ? pluralForm : singular}`;
}

const pct = (n: number) => `${n} %`;

/** Bloc de détail : titre en casse normale, puis une liste groupée à filets fins. */
function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
 return (
 <section className="min-w-0 space-y-3">
 <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
 <ul className="max-h-[360px] overflow-y-auto rounded-[var(--radius-card)] border border-border bg-surface divide-y divide-border">
 {children}
 </ul>
 </section>
 );
}

function ShareBar({ value }: { value: number }) {
 return (
 <div className="h-1 w-full overflow-hidden rounded-full bg-surface-muted">
 <div style={{ width: `${value}%` }} className="h-full rounded-full bg-primary" />
 </div>
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
 const [guestsResult, templatesResult, invitesResult] = await Promise.allSettled([
 api.get(`/events/${eventId}/guests`),
 api.get('/templates'),
 api.get(`/events/${eventId}/invitations`),
 ]);

 if (guestsResult.status === 'rejected') {
 throw guestsResult.reason;
 }

 setGuests(guestsResult.value);
 setTemplates(templatesResult.status === 'fulfilled' ? templatesResult.value : []);
 setInvitations(invitesResult.status === 'fulfilled' ? invitesResult.value : []);

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

 const acceptedPct = totalGuests > 0 ? Math.round((acceptedCount / totalGuests) * 100) : 0;
 const declinedPct = totalGuests > 0 ? Math.round((declinedCount / totalGuests) * 100) : 0;
 const responseRate = totalGuests > 0 ? Math.round(((acceptedCount + declinedCount) / totalGuests) * 100) : 0;
 const checkedInCount = guests.filter((g) => Boolean(g.checkedInAt)).length;
 const checkInPct = acceptedCount > 0 ? Math.round((checkedInCount / acceptedCount) * 100) : 0;

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

 const toScanCount = Math.max(0, acceptedCount - checkedInCount);
 const rsvpMetrics: StatMetric[] = [
 { label: 'Invités totaux', value: totalGuests },
 { label: 'Confirmés', value: acceptedCount, hint: acceptedCount > 0 ? pct(acceptedPct) : null },
 { label: 'Déclinés', value: declinedCount, hint: declinedCount > 0 ? pct(declinedPct) : null },
 { label: 'Taux de réponse', value: pct(responseRate), hint: pendingCount > 0 ? `En attente : ${pendingCount}` : null },
 ];
 const entryMetrics: StatMetric[] = [
 { label: 'Entrées', value: checkedInCount, hint: checkedInCount > 0 ? pct(checkInPct) : null },
 { label: 'Reste à scanner', value: toScanCount },
 ];
 const eventMetrics = protocolView ? [...entryMetrics, ...rsvpMetrics] : [...rsvpMetrics, ...entryMetrics];

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
 // Une seule catégorie reprendrait mot pour mot les chiffres de la bande : on ne l’affiche pas.
 const showMeals = acceptedCount > 0 && mealRows.length > 0;
 const showCategories = uniqueCategories.length > 1;
 const showQuestions = customFields.length > 0;
 const detailCount = [showMeals, showCategories, showQuestions].filter(Boolean).length;
 const detailCols = detailCount === 3 ? 'lg:grid-cols-3' : detailCount === 2 ? 'lg:grid-cols-2' : '';

 return (
 <div className="space-y-10 w-full">
 {events.length > 0 ? (
 <div className="flex items-center gap-2">
 <label htmlFor="analytics-event" className="sr-only">Événement</label>
 <select
 id="analytics-event"
 value={selectedEventId}
 onChange={(e) => setSelectedEventId(e.target.value)}
 className="h-11 min-w-0 flex-1 sm:flex-none sm:max-w-md rounded-[var(--radius-button)] border border-border bg-surface pl-3.5 pr-9 text-[15px] font-semibold text-foreground transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
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
 className="w-11 shrink-0 px-0"
 leftIcon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
 />
 </div>
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
 <div className="space-y-10" aria-busy="true">
 <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-px overflow-hidden rounded-[var(--radius-card)] border border-border bg-border">
 {Array.from({ length: 6 }).map((_, i) => (
 <div key={i} className="space-y-3 bg-surface px-4 py-4 sm:px-5">
 <Skeleton className="h-3 w-20" />
 <Skeleton className="h-6 w-12" />
 </div>
 ))}
 </div>
 <Skeleton className="h-48 w-full rounded-[var(--radius-card)]" />
 </div>
 ) : guests.length === 0 ? (
 <EmptyState illustration="guests" title="Aucun invité pour cet événement" />
 ) : (
 <div className="space-y-10">
 <StatStrip metrics={eventMetrics} />

 {detailCount > 0 ? (
 <div className={`grid grid-cols-1 gap-10 lg:gap-6 ${detailCols}`}>
 {showMeals ? (
 <DetailSection title="Régimes des confirmés">
 {mealRows.map((item) => {
 const share = acceptedCount > 0 ? Math.round((item.count / acceptedCount) * 100) : 0;
 return (
 <li key={item.label} className="space-y-2 px-4 py-3">
 <div className="flex items-baseline justify-between gap-3 text-sm">
 <span className="text-foreground">{item.label}</span>
 <span className="shrink-0 tabular-nums font-medium text-foreground">
 {item.count} <span className="font-normal text-muted">· {pct(share)}</span>
 </span>
 </div>
 <ShareBar value={share} />
 </li>
 );
 })}
 </DetailSection>
 ) : null}

 {showCategories ? (
 <DetailSection title="Participation par catégorie">
 {uniqueCategories.map((cat) => {
 const catGuests = guests.filter((g) => (g.category || 'Général') === cat);
 const total = catGuests.length;
 const accepted = catGuests.filter((g) => g.rsvp === 'ACCEPTED').length;
 const declined = catGuests.filter((g) => g.rsvp === 'DECLINED').length;
 const pending = catGuests.filter((g) => g.rsvp === 'PENDING').length;
 const parts = [
 accepted > 0 ? countLabel(accepted, 'confirmé') : null,
 declined > 0 ? countLabel(declined, 'décliné') : null,
 pending > 0 ? `${pending} en attente` : null,
 ].filter(Boolean);
 return (
 <li key={cat} className="px-4 py-3">
 <div className="flex items-baseline justify-between gap-3 text-sm">
 <span className="min-w-0 break-words font-medium text-foreground">{cat}</span>
 <span className="shrink-0 tabular-nums text-muted">{countLabel(total, 'invité')}</span>
 </div>
 {parts.length > 0 ? (
 <p className="mt-1 text-xs tabular-nums text-muted">{parts.join(' · ')}</p>
 ) : null}
 </li>
 );
 })}
 </DetailSection>
 ) : null}

 {showQuestions ? (
 <DetailSection title="Questions personnalisées">
 {customFields.map((field) => {
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
 const yesPct = totalAnswers > 0 ? Math.round((yesCount / totalAnswers) * 100) : 0;
 return (
 <li key={field.id} className="space-y-2 px-4 py-3">
 {heading}
 {totalAnswers === 0 ? noAnswer : (
 <>
 <div className="flex justify-between gap-3 text-xs tabular-nums text-muted">
 <span>Oui : {yesCount} · {pct(yesPct)}</span>
 <span>Non : {noCount}</span>
 </div>
 <ShareBar value={yesPct} />
 </>
 )}
 </li>
 );
 }

 if (isNumericFieldType(field.type)) {
 const numericAnswers = answers.map((a) => Number(a)).filter((n) => Number.isFinite(n));
 if (numericAnswers.length === 0) {
 return (
 <li key={field.id} className="space-y-2 px-4 py-3">
 {heading}
 {noAnswer}
 </li>
 );
 }
 const avg = (numericAnswers.reduce((s, n) => s + n, 0) / numericAnswers.length).toFixed(1);
 const min = Math.min(...numericAnswers);
 const max = Math.max(...numericAnswers);
 return (
 <li key={field.id} className="space-y-2 px-4 py-3">
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
 <li key={field.id} className="space-y-2 px-4 py-3">
 {heading}
 {totalAnswers === 0 ? noAnswer : (
 <ul className="space-y-1">
 {Object.entries(counts).map(([val, count]) => {
 const share = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
 return (
 <li key={val} className="flex items-baseline justify-between gap-3 text-xs">
 <span className="min-w-0 break-words text-foreground">{val}</span>
 <span className="shrink-0 tabular-nums text-muted">{count} · {pct(share)}</span>
 </li>
 );
 })}
 </ul>
 )}
 </li>
 );
 }
 })}
 </DetailSection>
 ) : null}
 </div>
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
 <td className="px-4 py-3">
 <span className="block font-medium">{g.firstName} {g.lastName}</span>
 {g.email ? <span className="block text-xs text-muted">{g.email}</span> : null}
 </td>
 <td className="px-4 py-3">{g.category || 'Général'}</td>
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

 {workspace && events.length > 1 ? (
 <section aria-labelledby="analytics-all-events" className="space-y-4">
 <h2 id="analytics-all-events" className="text-lg font-semibold text-foreground">Tous les événements</h2>
 <WorkspaceStatsOverview stats={workspace} protocol={protocolView} />
 </section>
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
