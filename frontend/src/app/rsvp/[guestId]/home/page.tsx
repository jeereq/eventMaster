'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import {
  Calendar, AlertCircle, CheckCircle2, XCircle,
  Clock, ArrowRight, ChevronRight,
} from 'lucide-react';
import GuestPortalShell, { GuestPortalCard, GuestEventHero } from '@/components/GuestPortalShell';
import { guestDateBlock, guestShortDate } from '@/lib/guestDates';
import ShareButton from '@/components/ShareButton';
import { guestRsvpUrl } from '@/lib/share';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { Skeleton } from '@/components/ui/Skeleton';
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

function RsvpBadge({ status, passed }: { status: string; passed?: boolean }) {
  const base = 'inline-flex items-center gap-1 shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full';
  if (status === 'ACCEPTED') {
    return (
      <span className={cn(base, 'bg-primary/10 text-primary')}>
        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden /> {passed ? 'Présent' : 'Confirmé'}
      </span>
    );
  }
  if (status === 'DECLINED') {
    return (
      <span className={cn(base, 'bg-surface-muted text-muted')}>
        <XCircle className="w-3.5 h-3.5" aria-hidden /> Décliné
      </span>
    );
  }
  if (passed) {
    return <span className={cn(base, 'bg-surface-muted text-muted')}>Sans réponse</span>;
  }
  return (
    <span className={cn(base, 'bg-festive-accent-soft text-[#92400e] dark:text-festive-on-stage')}>
      <Clock className="w-3.5 h-3.5" aria-hidden /> À répondre
    </span>
  );
}

function InvitationRow({ item }: { item: GuestInvitationItem }) {
  const block = guestDateBlock(item.event.date);
  return (
    <Link
      href={`/rsvp/${item.guestId}`}
      className={cn(
        'flex items-center gap-3 p-3 rounded-[1.125rem] border border-border bg-surface transition touch-manipulation',
        'hover:bg-[var(--card-hover)] active:scale-[0.99]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        item.eventPassed && 'opacity-80',
      )}
    >
      <span className="em-guest-date" aria-hidden>
        <span className="em-guest-date__month">{block.month}</span>
        <span className="em-guest-date__day">{block.day}</span>
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="block font-semibold text-[15px] text-foreground leading-snug truncate">{item.event.title}</span>
        <span className="block text-xs text-muted truncate">
          {guestShortDate(item.event.date)}
          {item.event.location ? ` · ${item.event.location}` : ''}
        </span>
      </span>
      <RsvpBadge status={item.rsvp} passed={item.eventPassed} />
      <ChevronRight className="w-4 h-4 text-muted shrink-0 hidden min-[400px]:block" aria-hidden />
    </Link>
  );
}

export default function GuestHomePage() {
  const params = useParams();
  const guestId = params.guestId as string;
  const { site } = usePlatformSite();

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
      <div className="em-guest-page flex flex-col items-center p-4 pt-20" role="status" aria-busy="true">
        <span className="sr-only">Chargement de vos invitations…</span>
        <div className="w-full max-w-xl space-y-5">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <div className="rounded-3xl bg-[#064e3b] p-5 space-y-4">
            <Skeleton className="h-6 w-28 rounded-full !bg-white/15" />
            <Skeleton className="h-8 w-3/4 rounded-lg !bg-white/15" />
            <Skeleton className="h-4 w-2/3 rounded-full !bg-white/10" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-[1.125rem] border border-border bg-surface p-3">
                <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <Skeleton className="h-4 w-3/5 rounded-lg" />
                  <Skeleton className="h-3 w-2/5 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="em-guest-page flex items-center justify-center px-4">
        <GuestPortalCard className="max-w-sm w-full text-center space-y-4 !p-7">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-muted">
            <AlertCircle className="w-7 h-7" aria-hidden />
          </span>
          <div className="space-y-1.5">
            <p className="font-display text-xl font-semibold text-foreground">Chargement impossible</p>
            <p className="text-sm text-muted">{error || 'Vérifiez votre connexion.'}</p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full inline-flex items-center justify-center min-h-12 rounded-2xl bg-primary-solid text-primary-foreground text-sm font-semibold hover:bg-primary-solid-hover transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            Réessayer
          </button>
        </GuestPortalCard>
      </div>
    );
  }

  const upcoming = data.invitations
    .filter((i) => !i.eventPassed)
    .sort((x, y) => new Date(x.event.date).getTime() - new Date(y.event.date).getTime());
  const past = data.invitations.filter((i) => i.eventPassed);
  const current = data.invitations.find((i) => i.isCurrent);
  // Carte principale : d’abord une invitation qui attend une réponse, sinon la plus proche.
  const featured = upcoming.find((item) => item.rsvp === 'PENDING') || upcoming[0] || null;
  const others = upcoming.filter((item) => item !== featured);

  return (
    <GuestPortalShell
      showBrand
      title={`Mbote, ${data.guest.firstName}`}
      eyebrow={
        upcoming.length
          ? `${upcoming.length} invitation${upcoming.length > 1 ? 's' : ''} à venir`
          : undefined
      }
      organizationName={current?.organizationName}
      headerRight={
        <ShareButton
          title={`Mes invitations ${site.platformName}`}
          text="Retrouvez vos invitations et votre badge QR."
          url={guestRsvpUrl(guestId)}
          className="!rounded-full !shadow-none !text-foreground"
        />
      }
      contentClassName="space-y-6"
    >
      {featured ? (
        <Link
          href={`/rsvp/${featured.guestId}`}
          className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <GuestEventHero
            title={featured.event.title}
            date={featured.event.date}
            location={featured.event.location}
            greeting={featured.organizationName}
            badge={
              featured.rsvp === 'ACCEPTED' ? (
                <span className="em-guest-chip em-guest-chip--glass">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden />
                  Confirmé
                </span>
              ) : featured.rsvp === 'DECLINED' ? (
                <span className="em-guest-chip em-guest-chip--glass">Décliné</span>
              ) : null
            }
            className="transition group-hover:bg-[#065f46]"
          >
            <span
              className={cn(
                'inline-flex items-center justify-center gap-2 self-start min-h-11 px-5 rounded-full text-sm font-semibold transition',
                featured.rsvp === 'PENDING'
                  ? 'bg-white text-[#064e3b] group-hover:bg-[#ecfdf5]'
                  : 'bg-white/14 text-white group-hover:bg-white/20',
              )}
            >
              {featured.rsvp === 'PENDING' ? 'Répondre à l’invitation' : featured.rsvp === 'ACCEPTED' ? 'Voir mon pass' : 'Revoir l’invitation'}
              <ArrowRight className="w-4 h-4 transition group-hover:translate-x-0.5" aria-hidden />
            </span>
          </GuestEventHero>
        </Link>
      ) : null}

      {others.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="px-1 font-display text-lg font-semibold text-foreground">À venir</h2>
          <div className="space-y-2">
            {others.map((item) => (
              <InvitationRow key={item.guestId} item={item} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="px-1 font-display text-lg font-semibold text-foreground">Passées</h2>
          <div className="space-y-2">
            {past.map((item) => (
              <InvitationRow key={item.guestId} item={item} />
            ))}
          </div>
        </section>
      )}

      {data.invitations.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Calendar className="w-7 h-7" aria-hidden />
          </span>
          <p className="font-display text-lg font-semibold text-foreground">Aucune invitation ici</p>
          <p className="text-sm text-muted max-w-xs mx-auto">
            Ouvrez le lien reçu par WhatsApp, ou demandez-le à l’organisateur.
          </p>
        </div>
      )}
    </GuestPortalShell>
  );
}
