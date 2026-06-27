'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  Calendar, Users, Mail, CreditCard, ChevronRight, 
  PlusCircle, AlertCircle, Award, CheckCircle, Shield,
  Building2, Activity, TrendingUp, Clock
} from 'lucide-react';

interface BillingStatus {
  plan: 'FREE' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
  usage: {
    events: number;
    guests: number;
    templates: number;
  };
  limits: {
    maxEvents: number;
    maxGuests: number;
    maxTemplates: number;
    customTemplates: boolean;
  };
}

interface EventItem {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
}

interface AdminStats {
  stats: {
    tenants: number;
    users: number;
    events: number;
    guests: number;
  };
  tenants: Array<{
    id: string;
    name: string;
    plan: string;
    createdAt: string;
    managerName: string;
    managerEmail: string;
    eventsCount: number;
    usersCount: number;
  }>;
}

export default function DashboardPage() {
  const { user, tenant } = useAuth();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [adminData, setAdminData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboardData() {
      try {
        if (user?.role === 'SUPER_ADMIN') {
          const data = await api.get('/admin/stats');
          setAdminData(data);
        } else {
          const [billingData, eventsData] = await Promise.all([
            api.get('/billing/status'),
            api.get('/events'),
          ]);
          setBilling(billingData);
          setEvents(eventsData.slice(0, 3)); // Display only 3 recent events
        }
      } catch (err: any) {
        console.error('Error loading dashboard data:', err);
        setError('Impossible de charger les données du tableau de bord.');
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-200 rounded-lg w-1/3 animate-pulse" />
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="h-32 bg-slate-200 rounded-2xl animate-pulse" />
          <div className="h-32 bg-slate-200 rounded-2xl animate-pulse" />
          <div className="h-32 bg-slate-200 rounded-2xl animate-pulse" />
        </div>
        <div className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  // Calculate percentages for quotas
  const getPercentage = (value: number, max: number) => {
    if (max === 0) return 0;
    return Math.min(Math.round((value / max) * 100), 100);
  };

  // Render Super Admin Dashboard
  if (user?.role === 'SUPER_ADMIN') {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Shield className="w-8 h-8 text-indigo-600" />
              Espace Super Admin
            </h1>
            <p className="text-slate-500 mt-1">Vue d'ensemble globale de la plateforme SaaS EventMaster.</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Global Statistics Widgets */}
        {adminData && (
          <div className="grid sm:grid-cols-4 gap-6">
            {/* Tenants Widget */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Organisations</span>
                <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-slate-900">{adminData.stats.tenants}</span>
                <p className="text-xs text-slate-400 mt-1.5 font-medium">Inscrites sur la plateforme</p>
              </div>
            </div>

            {/* Users Widget */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Utilisateurs</span>
                <div className="bg-violet-50 text-violet-600 p-2 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-slate-900">{adminData.stats.users}</span>
                <p className="text-xs text-slate-400 mt-1.5 font-medium">Comptes actifs créés</p>
              </div>
            </div>

            {/* Events Widget */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Événements</span>
                <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-slate-900">{adminData.stats.events}</span>
                <p className="text-xs text-slate-400 mt-1.5 font-medium">Organisés au total</p>
              </div>
            </div>

            {/* Guests Widget */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Invités</span>
                <div className="bg-amber-50 text-amber-600 p-2 rounded-xl">
                  <Mail className="w-5 h-5" />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-slate-900">{adminData.stats.guests}</span>
                <p className="text-xs text-slate-400 mt-1.5 font-medium">Enregistrés dans le système</p>
              </div>
            </div>
          </div>
        )}

        {/* Tenants List */}
        {adminData && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                Organisations Actives (Tenants)
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                {adminData.tenants.length} au total
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Nom de l'organisation</th>
                    <th className="pb-3 font-semibold">Plan</th>
                    <th className="pb-3 font-semibold">Administrateur</th>
                    <th className="pb-3 font-semibold text-center">Membres</th>
                    <th className="pb-3 font-semibold text-center">Événements</th>
                    <th className="pb-3 font-semibold text-right">Date d'inscription</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {adminData.tenants.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 font-bold text-slate-900">{t.name}</td>
                      <td className="py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                          t.plan === 'FREE' ? 'bg-slate-50 border-slate-200 text-slate-600' :
                          t.plan === 'STANDARD' ? 'bg-blue-50 border-blue-100 text-blue-700' :
                          t.plan === 'PREMIUM' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' :
                          'bg-amber-50 border-amber-100 text-amber-700'
                        }`}>
                          {t.plan}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800">{t.managerName}</span>
                          <span className="text-xs text-slate-400">{t.managerEmail}</span>
                        </div>
                      </td>
                      <td className="py-4 text-center font-bold text-slate-700">{t.usersCount}</td>
                      <td className="py-4 text-center font-bold text-indigo-600">{t.eventsCount}</td>
                      <td className="py-4 text-right text-slate-500 font-medium">
                        {new Date(t.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })}
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

  // Render Regular Tenant Dashboard
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Tableau de Bord</h1>
          <p className="text-slate-500 mt-1">Bienvenue dans votre espace d'administration de gestion d'événements privés.</p>
        </div>
        <Link 
          href="/dashboard/events" 
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition shadow-md shadow-indigo-100 text-sm"
        >
          <PlusCircle className="w-4.5 h-4.5" />
          Créer un événement
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quotas & Usage Widgets */}
      {billing && (
        <div className="grid sm:grid-cols-3 gap-6">
          {/* Events Widget */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Événements</span>
              <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-900">{billing.usage.events}</span>
                <span className="text-slate-500 text-sm">/ {billing.limits.maxEvents === 9999 ? 'illimité' : billing.limits.maxEvents}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${getPercentage(billing.usage.events, billing.limits.maxEvents)}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5 font-medium">
                {getPercentage(billing.usage.events, billing.limits.maxEvents)}% du quota utilisé
              </p>
            </div>
          </div>

          {/* Guests Widget */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Invités Totaux</span>
              <div className="bg-violet-50 text-violet-600 p-2 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-900">{billing.usage.guests}</span>
                <span className="text-slate-500 text-sm">/ {billing.limits.maxGuests === 99999 ? 'illimité' : billing.limits.maxGuests}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                <div 
                  className="bg-violet-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${getPercentage(billing.usage.guests, billing.limits.maxGuests)}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5 font-medium">
                {getPercentage(billing.usage.guests, billing.limits.maxGuests)}% du quota utilisé
              </p>
            </div>
          </div>

          {/* Templates Widget */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Modèles d'Invitation</span>
              <div className="bg-amber-50 text-amber-600 p-2 rounded-xl">
                <Mail className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-900">{billing.usage.templates}</span>
                <span className="text-slate-500 text-sm">/ {billing.limits.maxTemplates === 9999 ? 'illimité' : billing.limits.maxTemplates}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${getPercentage(billing.usage.templates, billing.limits.maxTemplates)}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5 font-medium">
                {getPercentage(billing.usage.templates, billing.limits.maxTemplates)}% du quota utilisé
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Row */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Events List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Événements Récents</h2>
            <Link href="/dashboard/events" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition flex items-center gap-1">
              Voir tout
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-700">Aucun événement</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">Vous n'avez pas encore d'événement. Créez-en un pour commencer à inviter des personnes.</p>
              <Link 
                href="/dashboard/events" 
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition"
              >
                Créer mon premier événement
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="p-4 border border-slate-150 rounded-xl hover:bg-slate-50 transition flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900">{event.title}</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • {event.location}
                    </p>
                    {event.description && <p className="text-sm text-slate-600 line-clamp-1">{event.description}</p>}
                  </div>
                  <Link 
                    href={`/dashboard/events?id=${event.id}`}
                    className="p-2 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg transition"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Plan Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 font-sans">Statut d'Abonnement</h2>
            
            {billing && (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl flex items-center gap-4">
                  <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-md shadow-indigo-150">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Forfait Actuel</div>
                    <div className="text-xl font-black text-indigo-950 mt-0.5">{billing.plan}</div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Isolation Stricte des Données</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>RSVP Web Dynamique</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    {billing.limits.customTemplates ? (
                      <span>Modèles d'Invitation Customisés</span>
                    ) : (
                      <span className="line-through text-slate-400">Modèles d'Invitation Customisés</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8">
            <Link 
              href="/dashboard/billing" 
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-slate-100"
            >
              <CreditCard className="w-4.5 h-4.5" />
              Gérer la facturation
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
