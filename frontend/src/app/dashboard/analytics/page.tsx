'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  BarChart3, Calendar, Users, Utensils, Sparkles, 
  Loader2, AlertCircle, ChevronRight, CheckCircle, XCircle, 
  Clock, Download, FileSpreadsheet, RefreshCw, HelpCircle
} from 'lucide-react';
import Link from 'next/link';
import { PageHeader, Alert, EmptyState, Button } from '@/components/ui';
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

export default function AnalyticsPage() {
  const { user } = useAuth();
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
      const data = await api.get('/events');
      const eventsList = Array.isArray(data) ? data : data.events || [];
      setEvents(eventsList);
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
    if (!selectedEventId) return;
    setRefreshing(true);
    await loadStatsForEvent(selectedEventId);
    setRefreshing(false);
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  // Statistics calculations
  const totalGuests = guests.length;
  const acceptedCount = guests.filter(g => g.rsvp === 'ACCEPTED').length;
  const declinedCount = guests.filter(g => g.rsvp === 'DECLINED').length;
  const pendingCount = guests.filter(g => g.rsvp === 'PENDING').length;

  const acceptedPct = totalGuests > 0 ? Math.round((acceptedCount / totalGuests) * 100) : 0;
  const declinedPct = totalGuests > 0 ? Math.round((declinedCount / totalGuests) * 100) : 0;
  const pendingPct = totalGuests > 0 ? Math.round((pendingCount / totalGuests) * 100) : 0;
  const responseRate = totalGuests > 0 ? Math.round(((acceptedCount + declinedCount) / totalGuests) * 100) : 0;

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
    if (guests.length === 0) return;
    
    const customFields = getCustomRsvpFields();
    const headers = ['Nom', 'Prénom', 'Email', 'Catégorie', 'Statut RSVP', 'Allergies', 'Repas Spécial', 'Notes'];
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
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Chargement de vos statistiques...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full">
      <PageHeader
        title="Statistiques des événements"
        description="Analyse approfondie des réponses RSVP, préférences de repas et questions personnalisées."
        action={
          events.length > 0 ? (
            <div className="flex items-center gap-2">
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100 transition"
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRefresh}
                disabled={loadingStats || refreshing}
                title="Rafraîchir les données"
                leftIcon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
              />
            </div>
          ) : undefined
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      {events.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-7 h-7" />}
          title="Aucun événement disponible"
          description="Créez votre premier événement pour accéder aux statistiques détaillées."
          action={
            <Link href="/dashboard/events">
              <Button leftIcon={<ChevronRight className="w-4 h-4" />}>Créer un événement</Button>
            </Link>
          }
        />
      ) : loadingStats ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Calcul des statistiques de l'événement...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Invités Totaux</span>
              <div className="flex items-baseline justify-between mt-3">
                <span className="text-3xl font-black text-slate-900 dark:text-white">{totalGuests}</span>
                <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md font-bold">100%</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Présents (Acceptés)</span>
              <div className="flex items-baseline justify-between mt-3">
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{acceptedCount}</span>
                <span className="text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md font-bold">{acceptedPct}%</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Absents (Déclinés)</span>
              <div className="flex items-baseline justify-between mt-3">
                <span className="text-3xl font-black text-rose-600 dark:text-rose-400">{declinedCount}</span>
                <span className="text-xs bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded-md font-bold">{declinedPct}%</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Taux de Réponse</span>
              <div className="flex items-baseline justify-between mt-3">
                <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{responseRate}%</span>
                <span className="text-xs bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-md font-bold">En attente: {pendingCount}</span>
              </div>
            </div>
          </div>

          {/* Detailed Stats Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Diet/Menu Stats */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Utensils className="w-4 h-4 text-indigo-500" />
                Régimes Alimentaires (Présents)
              </h3>
              <div className="space-y-3.5">
                {[
                  { label: 'Standard', count: guests.filter(g => g.rsvp === 'ACCEPTED' && (!g.preferences?.specialMeal || g.preferences?.specialMeal === 'none')).length },
                  { label: 'Végétarien', count: guests.filter(g => g.rsvp === 'ACCEPTED' && g.preferences?.specialMeal === 'vegetarian').length },
                  { label: 'Végétalien (Vegan)', count: guests.filter(g => g.rsvp === 'ACCEPTED' && g.preferences?.specialMeal === 'vegan').length },
                  { label: 'Halal', count: guests.filter(g => g.rsvp === 'ACCEPTED' && g.preferences?.specialMeal === 'halal').length },
                  { label: 'Casher', count: guests.filter(g => g.rsvp === 'ACCEPTED' && g.preferences?.specialMeal === 'kosher').length },
                ].map(item => {
                  const pct = acceptedCount > 0 ? Math.round((item.count / acceptedCount) * 100) : 0;
                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span>{item.label}</span>
                        <span>{item.count} <span className="text-slate-400 dark:text-slate-500 font-normal">({pct}%)</span></span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div style={{ width: `${pct}%` }} className="bg-indigo-500 h-full rounded-full" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category Stats */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Users className="w-4 h-4 text-indigo-500" />
                Participation par Catégorie
              </h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {uniqueCategories.map(cat => {
                  const catGuests = guests.filter(g => (g.category || 'Général') === cat);
                  const total = catGuests.length;
                  const accepted = catGuests.filter(g => g.rsvp === 'ACCEPTED').length;
                  const declined = catGuests.filter(g => g.rsvp === 'DECLINED').length;
                  const pending = catGuests.filter(g => g.rsvp === 'PENDING').length;
                  return (
                    <div key={cat} className="space-y-1.5 border-b border-slate-100 dark:border-slate-800/60 pb-3 last:border-0 last:pb-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex justify-between">
                        <span>{cat}</span>
                        <span className="text-slate-400 dark:text-slate-500">Total: {total}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[10px] text-center font-bold">
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 py-1 rounded">Présent: {accepted}</div>
                        <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 py-1 rounded">Absent: {declined}</div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 py-1 rounded">Attente: {pending}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Questions Stats */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Questions Personnalisées (Présents)
              </h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {getCustomRsvpFields().length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400 dark:text-slate-500 italic">
                    Aucune question personnalisée définie pour cet événement.
                  </div>
                ) : (
                  getCustomRsvpFields().map(field => {
                    const answers = guests
                      .filter(g => g.rsvp === 'ACCEPTED' && getCustomFieldValue(g.preferences, field) !== undefined)
                      .map(g => getCustomFieldValue(g.preferences, field)!);
                    
                    const totalAnswers = answers.length;

                    if (isBooleanFieldType(field.type)) {
                      const yesCount = answers.filter(a => a === true).length;
                      const noCount = totalAnswers - yesCount;
                      const yesPct = totalAnswers > 0 ? Math.round((yesCount / totalAnswers) * 100) : 0;
                      return (
                        <div key={field.id} className="space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{field.label}</div>
                          <div className="text-[9px] text-slate-400 font-mono">{field.analyticsKey}</div>
                          <div className="flex justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                            <span>Oui : {yesCount} ({yesPct}%)</span>
                            <span>Non : {noCount}</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div style={{ width: `${yesPct}%` }} className="bg-indigo-500 h-full rounded-full" />
                          </div>
                        </div>
                      );
                    }

                    if (isNumericFieldType(field.type)) {
                      const numericAnswers = answers.map(a => Number(a)).filter(n => Number.isFinite(n));
                      const avg = numericAnswers.length > 0
                        ? (numericAnswers.reduce((s, n) => s + n, 0) / numericAnswers.length).toFixed(1)
                        : '—';
                      const min = numericAnswers.length > 0 ? Math.min(...numericAnswers) : '—';
                      const max = numericAnswers.length > 0 ? Math.max(...numericAnswers) : '—';
                      return (
                        <div key={field.id} className="space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{field.label}</div>
                          <div className="text-[9px] text-slate-400 font-mono">{field.analyticsKey}</div>
                          <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                            <span>Moy. : {avg}</span>
                            <span>Min : {min}</span>
                            <span>Max : {max}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{totalAnswers} réponse(s)</div>
                        </div>
                      );
                    }

                    {
                      const counts: Record<string, number> = {};
                      answers.forEach(ans => {
                        const strVal = ans === null || ans === undefined ? 'Non renseigné' : formatCustomFieldValueForDisplay(ans);
                        counts[strVal] = (counts[strVal] || 0) + 1;
                      });

                      return (
                        <div key={field.id} className="space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{field.label}</div>
                          <div className="text-[9px] text-slate-400 font-mono">{field.analyticsKey}</div>
                          <div className="space-y-1 max-h-24 overflow-y-auto">
                            {Object.entries(counts).map(([val, count]) => {
                              const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
                              return (
                                <div key={val} className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400">
                                  <span className="truncate max-w-[150px] font-semibold">{val}</span>
                                  <span>{count} ({pct}%)</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                  })
                )}
              </div>
            </div>
          </div>

          {/* Recent Responses & Export Actions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Liste des Réponses & Préférences</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Exportez ou parcourez les réponses individuelles de vos invités.</p>
              </div>

              {guests.length > 0 && (
                <button
                  onClick={exportToCSV}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Exporter en CSV
                </button>
              )}
            </div>

            {guests.length === 0 ? (
              <div className="text-center py-8 text-slate-400 italic text-sm">
                Aucun invité enregistré pour cet événement.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Invité</th>
                      <th className="py-3 px-4">Catégorie</th>
                      <th className="py-3 px-4">Statut RSVP</th>
                      <th className="py-3 px-4">Régime</th>
                      <th className="py-3 px-4">Allergies</th>
                      <th className="py-3 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                    {guests.slice(0, 10).map((g) => (
                      <tr key={g.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {g.firstName} {g.lastName}
                          <span className="block text-[10px] text-slate-400 font-normal">{g.email}</span>
                        </td>
                        <td className="py-3.5 px-4">{g.category || 'Général'}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            g.rsvp === 'ACCEPTED' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400' :
                            g.rsvp === 'DECLINED' ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400' :
                            'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400'
                          }`}>
                            {g.rsvp === 'ACCEPTED' ? <CheckCircle className="w-3 h-3" /> :
                             g.rsvp === 'DECLINED' ? <XCircle className="w-3 h-3" /> :
                             <Clock className="w-3 h-3" />}
                            {g.rsvp === 'ACCEPTED' ? 'Présent' :
                             g.rsvp === 'DECLINED' ? 'Absent' :
                             'En attente'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 capitalize">{g.preferences?.specialMeal || 'Standard'}</td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 truncate max-w-[120px]" title={g.preferences?.allergies}>
                          {g.preferences?.allergies || 'Aucune'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 truncate max-w-[150px]" title={g.preferences?.notes}>
                          {g.preferences?.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {guests.length > 10 && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-4">
                    Affichage des 10 premières réponses. Utilisez l'export CSV pour obtenir la liste complète.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
