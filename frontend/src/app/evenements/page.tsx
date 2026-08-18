'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import { Button, EmptyState, Input } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import { Calendar, MapPin, Ticket } from 'lucide-react';

export type PublicEventCard = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  date: string;
  location: string;
  orgName: string;
  paid: boolean;
  ticketPriceFc: number;
  ticketsRemaining: number | null;
  soldOut: boolean;
  coverUrl?: string | null;
  photos?: string[];
};

export default function PublicEventsPage() {
  const [events, setEvents] = useState<PublicEventCard[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const qs = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
        const data = await api.get(`/public/events${qs}`);
        if (!cancelled) setEvents(data.events || []);
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [query]);

  return (
    <PublicPageShell>
      <PublicPageHero
        chip="Agenda public"
        title="Événements ouverts"
        description="Concerts, galas, conférences… Inscrivez-vous gratuitement ou achetez votre billet en ligne. Les événements privés (mariages, listes d’invités) n’apparaissent pas ici."
        compact
      >
        <div className="max-w-md">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un titre, un lieu…" />
        </div>
      </PublicPageHero>
      <section className="page-container py-10 space-y-4">
        {loading ? (
          <p className="text-sm text-muted">Chargement…</p>
        ) : events.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-5 h-5" />}
            title="Aucun événement public pour le moment"
            description="Les organisateurs publient ici les événements ouverts à tous."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/evenements/${event.slug}`}
                  className="block h-full rounded-[var(--radius-card)] border border-border bg-surface overflow-hidden hover:border-primary/40 transition"
                >
                  {event.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={event.coverUrl} alt="" className="w-full aspect-[16/9] object-cover bg-surface-muted" />
                  ) : null}
                  <div className="p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{event.orgName}</p>
                  <h2 className="font-semibold text-foreground mt-1">{event.title}</h2>
                  <p className="text-xs text-muted mt-2 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(event.date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                  <p className="text-xs text-muted mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {event.location}
                  </p>
                  <p className="text-sm font-semibold mt-3 inline-flex items-center gap-1.5">
                    <Ticket className="w-4 h-4" />
                    {event.soldOut
                      ? 'Complet'
                      : event.paid
                        ? `Dès ${formatFc(event.ticketPriceFc)}`
                        : 'Entrée libre'}
                  </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="pt-4">
          <Link href="/register">
            <Button variant="secondary" size="sm">Organiser un événement</Button>
          </Link>
        </div>
      </section>
    </PublicPageShell>
  );
}
