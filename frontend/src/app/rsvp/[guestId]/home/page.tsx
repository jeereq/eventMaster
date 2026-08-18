'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import {
  Calendar, MapPin, Loader2, AlertCircle, CheckCircle2, XCircle,
  Clock, ArrowRight,
} from 'lucide-react';
import GuestPortalShell, { GuestPortalCard } from '@/components/GuestPortalShell';
import { cn } from '@/lib/cn';

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
  branding?: {
    primary?: string;
    accent?: string;
    sidebar?: string;
  } | null;
  eventPassed: boolean;
  rsvpLocked: boolean;
  isCurrent: boolean;
}

interface GuestInvitationsResponse {
  guest: { firstName: string; lastName: string; email: string | null; phone?: string | null };
  invitations: GuestInvitationItem[];
  total: number;
  upcomingCount: number;
  pastCount: number;
}

function RsvpBadge({ status }: { status: string }) {
  if (status === 'ACCEPTED') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-[var(--radius-button)] bg-emerald-50 text-emerald-700 border border-emerald-100">
        <CheckCircle2 className="w-3 h-3" /> Confirmé
      </span>
    );
  }
  if (status === 'DECLINED') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-[var(--radius-button)] bg-rose-50 text-rose-700 border border-rose-100">
        <XCircle className="w-3 h-3" /> Décliné
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-[var(--radius-button)] bg-amber-50 text-amber-800 border border-amber-100">
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
      className={cn(
        'block bg-surface border rounded-[var(--radius-card)] p-4 sm:p-5 shadow-[var(--shadow-soft)]',
        'hover:bg-card-hover hover:border-border-subtle transition group',
        item.isCurrent
          ? 'border-primary/40 ring-1 ring-primary/20'
          : 'border-border',
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="space-y-1 min-w-0">
          <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
            {item.organizationName}
          </span>
          <h3 className="font-semibold text-foreground text-base leading-snug group-hover:text-primary transition">
            {item.event.title}
          </h3>
        </div>
        <RsvpBadge status={item.rsvp} />
      </div>

      <div className="space-y-1.5 text-xs text-muted mb-3">
        <div className="flex items-start gap-2">
          <Calendar className="w-3.5 h-3.5 text-muted flex-shrink-0 mt-0.5" />
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-muted flex-shrink-0 mt-0.5" />
          <span>{item.event.location}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        {item.eventPassed ? (
          <span className="text-[10px] font-semibold text-muted">Terminé</span>
        ) : (
          <span className="text-[10px] font-semibold text-emerald-600">À venir</span>
        )}
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
          {item.rsvp === 'PENDING' ? 'Répondre' : item.rsvp === 'ACCEPTED' ? 'Mon espace' : 'Voir'}
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
      <div className="em-guest-page flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="em-guest-page flex items-center justify-center px-4">
        <GuestPortalCard className="max-w-md w-full text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm text-muted">{error || 'Erreur de chargement.'}</p>
        </GuestPortalCard>
      </div>
    );
  }

  const upcoming = data.invitations.filter((i) => !i.eventPassed);
  const past = data.invitations.filter((i) => i.eventPassed);
  const current = data.invitations.find((i) => i.isCurrent);

  return (
    <GuestPortalShell
      showBrand
      title={`Bonjour ${data.guest.firstName}`}
      eyebrow="Espace invité"
      organizationName={current?.organizationName}
      contentClassName="space-y-6"
    >
      <p className="text-sm text-muted -mt-3">
        Toutes vos invitations, regroupées par e-mail et téléphone.
      </p>

      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: 'Total', value: data.total, tone: 'text-foreground' },
          { label: 'À venir', value: data.upcomingCount, tone: 'text-emerald-600' },
          { label: 'Passés', value: data.pastCount, tone: 'text-muted' },
        ].map((stat) => (
          <GuestPortalCard key={stat.label} padding="sm" className="text-center">
            <div className={cn('text-xl font-semibold', stat.tone)}>{stat.value}</div>
            <div className="text-[10px] font-semibold text-muted uppercase tracking-wider mt-0.5">
              {stat.label}
            </div>
          </GuestPortalCard>
        ))}
      </div>

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">À venir</h2>
          <div className="grid gap-3">
            {upcoming.map((item) => (
              <InvitationCard key={item.guestId} item={item} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Passés</h2>
          <p className="text-xs text-muted">Les réponses RSVP ne peuvent plus être modifiées.</p>
          <div className="grid gap-3">
            {past.map((item) => (
              <InvitationCard key={item.guestId} item={item} />
            ))}
          </div>
        </section>
      )}

      {data.invitations.length === 0 && (
        <GuestPortalCard className="text-center py-10 text-sm text-muted">
          Aucune invitation trouvée pour votre profil.
        </GuestPortalCard>
      )}
    </GuestPortalShell>
  );
}
