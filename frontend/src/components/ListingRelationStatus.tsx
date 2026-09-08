'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarCheck, CheckCircle2, Clock, FileText, Inbox } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/cn';
import type { MarketplaceBookingStatus } from '@/lib/marketplace';

type InquiryStatus = 'NEW' | 'CONTACTED';

type ListingRelation = {
  viewerRole: 'vendor' | 'organizer';
  inquiry: {
    id: string;
    status: InquiryStatus;
    eventDate: string | null;
    createdAt: string;
  } | null;
  booking: {
    id: string;
    status: MarketplaceBookingStatus;
    eventDate: string;
    eventEndDate: string | null;
    depositMarkedAt: string | null;
    createdAt: string;
  } | null;
};

function formatShortDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ListingRelationStatus({
  kind,
  slug,
  className,
}: {
  kind: 'venue' | 'service';
  slug?: string | null;
  className?: string;
}) {
  const { user, tenant } = useAuth();
  const [relation, setRelation] = useState<ListingRelation | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user || !tenant?.id || !slug) {
        setRelation(null);
        return;
      }
      try {
        const data = await api.get(`/marketplace/listing-relation?kind=${kind}&slug=${encodeURIComponent(slug)}`);
        if (!cancelled) setRelation(data);
      } catch {
        if (!cancelled) setRelation(null);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user, tenant?.id, kind, slug]);

  if (!relation || (!relation.inquiry && !relation.booking)) return null;

  const asVendor = relation.viewerRole === 'vendor';
  const inquiry = relation.inquiry;
  const booking = relation.booking;
  const inquiryDate = formatShortDate(inquiry?.eventDate || inquiry?.createdAt);
  const bookingDate = formatShortDate(booking?.eventDate);

  const inquiryLabel = !inquiry
    ? null
    : asVendor
      ? inquiry.status === 'CONTACTED'
        ? 'Devis pris en charge'
        : 'Devis reçu'
      : inquiry.status === 'CONTACTED'
        ? 'Retenu pour le devis'
        : 'Devis déjà envoyé';

  const bookingLabel = !booking
    ? null
    : booking.status === 'REQUESTED'
      ? asVendor ? 'Réservation reçue' : 'Réservation déjà envoyée'
      : booking.status === 'ACCEPTED'
        ? asVendor ? 'Vous êtes retenu — acompte' : 'Retenu pour la réservation'
        : booking.status === 'CONFIRMED'
          ? 'Réservation confirmée'
          : booking.status === 'COMPLETED'
            ? 'Prestation terminée'
            : 'Réservation annulée';

  return (
    <div className={cn('rounded-[var(--radius-card)] border border-border bg-surface p-4 space-y-3', className)}>
      <h2 className="text-sm font-semibold text-foreground">Suivi devis & réservation</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <StatusTile
          icon={inquiry?.status === 'CONTACTED' ? <CheckCircle2 className="w-4 h-4" /> : inquiry ? <FileText className="w-4 h-4" /> : <Inbox className="w-4 h-4" />}
          title={inquiryLabel || 'Aucun devis'}
          detail={inquiry ? (inquiryDate ? `Pour le ${inquiryDate}` : 'Demande enregistrée') : 'Pas encore de demande envoyée'}
          tone={inquiry?.status === 'CONTACTED' ? 'ok' : inquiry ? 'pending' : 'idle'}
        />
        <StatusTile
          icon={booking && booking.status !== 'CANCELLED' && booking.status !== 'REQUESTED'
            ? <CheckCircle2 className="w-4 h-4" />
            : booking ? <CalendarCheck className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
          title={bookingLabel || 'Aucune réservation'}
          detail={booking
            ? bookingDate
              ? `${bookingDate}${booking.status === 'ACCEPTED' && !booking.depositMarkedAt ? ' · acompte à verser' : ''}`
              : 'Demande enregistrée'
            : 'Pas encore de date bloquée'}
          tone={
            !booking || booking.status === 'CANCELLED'
              ? 'idle'
              : booking.status === 'REQUESTED'
                ? 'pending'
                : 'ok'
          }
        />
      </div>
      <Link
        href={asVendor ? '/dashboard/marketplace' : '/dashboard/bookings'}
        className="inline-flex min-h-11 items-center text-xs font-semibold text-primary hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-[var(--radius-button)]"
      >
        Voir tout le suivi
      </Link>
    </div>
  );
}

function StatusTile({
  icon,
  title,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  tone: 'ok' | 'pending' | 'idle';
}) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border px-3 py-2.5 min-w-0',
        tone === 'ok' && 'border-primary/20 bg-primary/10',
        tone === 'pending' && 'border-festive-accent/20 bg-festive-accent/10',
        tone === 'idle' && 'border-border bg-surface-muted',
      )}
    >
      <p className={cn(
        'text-xs font-semibold inline-flex items-center gap-1.5',
        tone === 'ok' && 'text-primary',
        tone === 'pending' && 'text-festive-accent',
        tone === 'idle' && 'text-muted',
      )}>
        {icon}
        {title}
      </p>
      <p className="text-xs text-muted mt-1 leading-relaxed">{detail}</p>
    </div>
  );
}
