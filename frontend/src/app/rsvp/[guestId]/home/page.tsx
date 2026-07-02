'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import {
  Calendar, MapPin, Loader2, AlertCircle, CheckCircle2, XCircle,
  Clock, Sparkles, ArrowRight, PartyPopper,
} from 'lucide-react';

interface GuestInvitationItem {
  guestId: string;
  rsvp: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  event: {
    id: string;
    title: string;
    description: string | null;
    date: string;
    location: string;
  };
  organizationName: string;
  eventPassed: boolean;
  rsvpLocked: boolean;
  isCurrent: boolean;
}

interface GuestInvitationsResponse {
  guest: { firstName: string; lastName: string; email: string };
  invitations: GuestInvitationItem[];
  total: number;
  upcomingCount: number;
  pastCount: number;
}

function RsvpBadge({ status }: { status: string }) {
  if (status === 'ACCEPTED') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> Confirmé
      </span>
    );
  }
  if (status === 'DECLINED') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle className="w-3 h-3" /> Décliné
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      <Clock className="w-3 h-3" /> En attente
    </span>
  );
}

function InvitationCard({ item }: { item: GuestInvitationItem }) {
  const formattedDate = new Date(item.event.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Link
      href={`/rsvp/${item.guestId}`}
      className={`block bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs hover:shadow-md transition group ${
        item.isCurrent
          ? 'border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500/20'
          : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="space-y-1 min-w-0">
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            {item.organizationName}
          </span>
          <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
            {item.event.title}
          </h3>
        </div>
        <RsvpBadge status={item.rsvp} />
      </div>

      <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 mb-4">
        <div className="flex items-start gap-2">
          <Calendar className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
          <span>{item.event.location}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
        {item.eventPassed ? (
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Événement terminé</span>
        ) : (
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">À venir</span>
        )}
        <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:gap-2 transition-all">
          Ouvrir
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );
}

export default function GuestHomePage() {
  const params = useParams();
  const guestId = params.guestId as string;

  const [data, setData] = useState<GuestInvitationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      if (!guestId) return;
      try {
        const response = await api.get(`/rsvp/${guestId}/invitations`);
        setData(response);
      } catch (err: any) {
        setError(err.message || 'Impossible de charger vos invitations.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [guestId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <p className="text-sm text-slate-600">{error || 'Erreur de chargement.'}</p>
        </div>
      </div>
    );
  }

  const upcoming = data.invitations.filter((i) => !i.eventPassed);
  const past = data.invitations.filter((i) => i.eventPassed);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-slate-50 to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <header className="border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <PartyPopper className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">EventMaster</span>
          </Link>
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Espace Invité
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            Portail invité
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Bonjour {data.guest.firstName} !
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Retrouvez ici toutes les célébrations auxquelles vous avez été invité(e).
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
            <div className="text-2xl font-black text-slate-900 dark:text-white">{data.total}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Total</div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
            <div className="text-2xl font-black text-emerald-600">{data.upcomingCount}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">À venir</div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
            <div className="text-2xl font-black text-slate-400">{data.pastCount}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Passés</div>
          </div>
        </div>

        {upcoming.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Événements à venir</h2>
            <div className="grid gap-4">
              {upcoming.map((item) => (
                <InvitationCard key={item.guestId} item={item} />
              ))}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Événements passés</h2>
            <p className="text-xs text-slate-500">
              Les réponses RSVP ne peuvent plus être modifiées pour ces événements.
            </p>
            <div className="grid gap-4 opacity-90">
              {past.map((item) => (
                <InvitationCard key={item.guestId} item={item} />
              ))}
            </div>
          </section>
        )}

        {data.invitations.length === 0 && (
          <div className="text-center py-16 text-slate-500 text-sm">
            Aucune invitation trouvée pour votre profil.
          </div>
        )}
      </main>
    </div>
  );
}
