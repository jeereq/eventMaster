'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Breadcrumbs, Alert, Button, EmptyState } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import { Calendar, ExternalLink, Loader2, QrCode, Ticket } from 'lucide-react';

type MyTicket = {
  orderId: string;
  quantity: number;
  amountFc: number;
  paidAt: string | null;
  buyerName: string;
  event: {
    title: string;
    slug: string | null;
    date: string;
    location: string;
    isPublic: boolean;
  };
  guestId: string | null;
  rsvpUrl: string | null;
  publicHref: string | null;
};

export default function ClientTicketsPage() {
  const { access } = useAuth();
  const [tickets, setTickets] = useState<MyTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/marketplace/my-tickets');
      setTickets(data.tickets || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger vos billets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Mes billets"
        description="Inscriptions et achats rattachés à votre compte (ou à votre e-mail). Conservez le lien RSVP pour le badge QR."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: access?.level === 'client' ? 'Marketplace' : 'Accueil', href: access?.level === 'client' ? '/dashboard/catalogue' : '/dashboard' },
              { label: 'Mes billets' },
            ]}
          />
        }
        action={
          <Link href="/marketplace/evenements" className="inline-flex">
            <Button size="sm" leftIcon={<Calendar className="w-4 h-4" />}>
              Agenda public
            </Button>
          </Link>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={<Ticket className="w-5 h-5" />}
          title="Aucun billet pour le moment"
          description="Inscrivez-vous à un événement public ou achetez un billet — il apparaîtra ici si vous êtes connecté, ou si l’e-mail du compte correspond."
          action={
            <Link href="/marketplace/evenements">
              <Button size="sm">Voir l’agenda</Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {tickets.map((ticket) => (
            <li
              key={ticket.orderId}
              className="rounded-[var(--radius-card)] border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
            >
              <div className="space-y-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{ticket.event.title}</p>
                <p className="text-xs text-muted inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  {new Date(ticket.event.date).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}
                </p>
                <p className="text-xs text-muted">{ticket.event.location}</p>
                <p className="text-xs text-muted">
                  {ticket.quantity} place{ticket.quantity > 1 ? 's' : ''}
                  {ticket.amountFc > 0 ? ` · ${formatFc(ticket.amountFc)}` : ' · entrée libre'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {ticket.guestId && (
                  <Link href={`/rsvp/${ticket.guestId}`} className="inline-flex">
                    <Button size="sm" leftIcon={<QrCode className="w-4 h-4" />}>
                      Badge QR
                    </Button>
                  </Link>
                )}
                {ticket.publicHref && (
                  <Link href={ticket.publicHref} className="inline-flex">
                    <Button size="sm" variant="secondary" leftIcon={<ExternalLink className="w-4 h-4" />}>
                      Fiche
                    </Button>
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
