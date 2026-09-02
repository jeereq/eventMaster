'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, CalendarCheck, Inbox, KeyRound, Loader2, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Alert, Button, Modal, StatusPill } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import {
  extraPrepVendorItems,
  matchPrepListingPipeline,
  prepListingCanBook,
  type MarketplaceBookingItem,
  type MarketplaceInquiryItem,
  type PrepListingPipeline,
} from '@/lib/marketplace';
import {
  isEventPrepRental,
  type EventPrepVendorGroup,
} from '@/lib/eventPrep';
import type { EventPrepListingView, EventPrepPreviewTarget } from '@/components/EventPrepListingModal';

type SheetOffer = {
  key: string;
  kind: 'venue' | 'service';
  lane: 'venue' | 'trade' | 'rental';
  slug: string;
  title: string;
  price: number | null;
  pipeline: PrepListingPipeline;
};

export default function EventPrepVendorSheet({
  group,
  eventId,
  eventTitle,
  dateKey,
  guestCount,
  inquiries,
  bookings,
  onClose,
  onOpenListing,
  onPipelineChange,
}: {
  group: EventPrepVendorGroup | null;
  eventId: string;
  eventTitle?: string;
  dateKey: string;
  guestCount?: number;
  inquiries: MarketplaceInquiryItem[];
  bookings: MarketplaceBookingItem[];
  onClose: () => void;
  onOpenListing: (target: EventPrepPreviewTarget, view?: EventPrepListingView) => void;
  onPipelineChange: () => void;
}) {
  const { user, token, tenant } = useAuth();
  const [bio, setBio] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');

  useEffect(() => {
    setBio(null);
    setCity(null);
    setError('');
    setSent('');
    if (!group?.orgSlug) return;
    let cancelled = false;
    setLoadingProfile(true);
    (async () => {
      try {
        const data = (await api.get(`/public/vendors/${encodeURIComponent(group.orgSlug!)}`)) as {
          bio?: string | null;
          city?: string | null;
        };
        if (!cancelled) {
          setBio(data.bio || null);
          setCity(data.city || null);
        }
      } catch {
        if (!cancelled) {
          setBio(null);
          setCity(null);
        }
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [group?.orgSlug]);

  const offers = useMemo<SheetOffer[]>(() => {
    if (!group) return [];
    const rows: SheetOffer[] = [];
    if (group.venue) {
      rows.push({
        key: `venue:${group.venue.slug}`,
        kind: 'venue',
        lane: 'venue',
        slug: group.venue.slug,
        title: group.venue.name,
        price: group.venue.priceFromFc ?? null,
        pipeline: matchPrepListingPipeline(group.venue.slug, 'venue', inquiries, bookings),
      });
    }
    for (const vendor of group.vendors) {
      rows.push({
        key: vendor.slug,
        kind: 'service',
        lane: isEventPrepRental(vendor) ? 'rental' : 'trade',
        slug: vendor.slug,
        title: vendor.title,
        price: vendor.priceFromFc ?? null,
        pipeline: matchPrepListingPipeline(vendor.slug, 'service', inquiries, bookings),
      });
    }
    return rows;
  }, [group, inquiries, bookings]);

  const retainedSlugs = useMemo(() => new Set(offers.map((item) => item.slug)), [offers]);
  const extras = useMemo(
    () => (group ? extraPrepVendorItems(group, retainedSlugs, inquiries, bookings) : { inquiries: [], bookings: [] }),
    [group, retainedSlugs, inquiries, bookings],
  );

  const missingQuotes = offers.filter((item) => item.pipeline.stage === 'none');
  const quoteCount = offers.filter((item) => item.pipeline.stage !== 'none').length;
  const bookingCount = offers.filter((item) => item.pipeline.stage === 'booking').length;
  const loggedIn = Boolean(token && tenant?.id);
  const followHref = `/dashboard/bookings?event=${encodeURIComponent(eventId)}`;

  const sendMissingQuotes = async () => {
    if (!group || !loggedIn || !user || missingQuotes.length === 0) return;
    setSending(true);
    setError('');
    setSent('');
    const message = eventTitle
      ? `Demande groupée pour l’événement « ${eventTitle} ».`
      : 'Demande groupée depuis la préparation de l’événement.';
    const failed: string[] = [];
    for (const offer of missingQuotes) {
      try {
        await api.post(
          offer.kind === 'venue'
            ? `/public/venues/${encodeURIComponent(offer.slug)}/inquire`
            : `/public/services/${encodeURIComponent(offer.slug)}/inquire`,
          {
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || undefined,
            eventDate: dateKey || undefined,
            guestCount: guestCount && guestCount > 0 ? guestCount : undefined,
            message,
            eventId,
          },
        );
      } catch {
        failed.push(offer.title);
      }
    }
    setSending(false);
    onPipelineChange();
    if (failed.length) {
      setError(`Impossible d’envoyer le devis pour : ${failed.join(', ')}.`);
    } else {
      setSent(
        missingQuotes.length === 1
          ? 'Devis envoyé au prestataire.'
          : `${missingQuotes.length} devis envoyés au prestataire.`,
      );
    }
  };

  const kindIcon = (lane: SheetOffer['lane']) => {
    if (lane === 'venue') return <Building2 className="w-3.5 h-3.5" />;
    if (lane === 'rental') return <KeyRound className="w-3.5 h-3.5" />;
    return <Sparkles className="w-3.5 h-3.5" />;
  };

  const kindLabel = (lane: SheetOffer['lane']) => {
    if (lane === 'venue') return 'Salle';
    if (lane === 'rental') return 'Matériel & Équipement';
    return 'Prestataire';
  };

  return (
    <Modal
      open={Boolean(group)}
      onClose={onClose}
      size="lg"
      title={group?.orgName || 'Prestataire'}
      description={
        group
          ? `${offers.length} offre${offers.length > 1 ? 's' : ''} retenue${offers.length > 1 ? 's' : ''}${city ? ` · ${city}` : ''}`
          : undefined
      }
      footer={
        group ? (
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 w-full">
            <Link href={followHref} className="inline-flex">
              <Button variant="secondary" leftIcon={<Inbox className="w-3.5 h-3.5" />}>
                Devis & résas
              </Button>
            </Link>
            {missingQuotes.length > 0 ? (
              <Button
                loading={sending}
                disabled={!loggedIn}
                onClick={() => void sendMissingQuotes()}
              >
                {missingQuotes.length === 1
                  ? 'Demander le devis manquant'
                  : `Demander les ${missingQuotes.length} devis manquants`}
              </Button>
            ) : null}
          </div>
        ) : null
      }
    >
      {group ? (
        <div className="space-y-4">
          {loadingProfile ? (
            <p className="text-xs text-muted inline-flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Fiche enseigne…
            </p>
          ) : null}
          {bio ? <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{bio}</p> : null}

          <div className="rounded-[var(--radius-card)] border border-border bg-surface-muted/40 px-3 py-2 text-xs">
            <p className="font-semibold text-foreground">
              {quoteCount} devis · {bookingCount} réservation{bookingCount > 1 ? 's' : ''}
              {missingQuotes.length ? ` · ${missingQuotes.length} sans devis` : ''}
            </p>
            <p className="text-muted mt-0.5">
              Les retenus ne bloquent pas la date. Le prestataire voit chaque offre séparément.
            </p>
          </div>

          {error ? <Alert variant="error">{error}</Alert> : null}
          {sent ? <Alert variant="success">{sent}</Alert> : null}
          {missingQuotes.length > 0 && !loggedIn ? (
            <p className="text-xs text-muted">Connectez-vous pour envoyer les devis groupés.</p>
          ) : null}

          <ul className="space-y-2">
            {offers.map((offer) => {
              const canBook = prepListingCanBook(offer.price, offer.pipeline);
              return (
                <li
                  key={offer.key}
                  className="rounded-[var(--radius-card)] border border-border px-3 py-2.5 space-y-2"
                >
                  <button
                    type="button"
                    onClick={() => onOpenListing({ kind: offer.kind, slug: offer.slug })}
                    className="w-full text-left"
                  >
                    <p className="text-sm font-semibold inline-flex items-center gap-1.5">
                      <span className="text-muted">{kindIcon(offer.lane)}</span>
                      {offer.title}
                    </p>
                    <p className="text-[11px] text-muted mt-0.5">
                      {kindLabel(offer.lane)}
                      {offer.price != null ? ` · dès ${formatFc(offer.price)}` : ' · sur devis'}
                    </p>
                  </button>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {offer.pipeline.stage !== 'none' ? (
                      <StatusPill tone={offer.pipeline.tone}>{offer.pipeline.label}</StatusPill>
                    ) : (
                      <StatusPill tone="slate">Pas de devis</StatusPill>
                    )}
                    <span className="flex-1" />
                    {offer.pipeline.stage === 'booking' ? (
                      <Link href={`${followHref}&tab=bookings`} className="inline-flex">
                        <Button size="sm" variant="secondary">Suivre</Button>
                      </Link>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onOpenListing({ kind: offer.kind, slug: offer.slug }, 'inquire')}
                        >
                          Devis
                        </Button>
                        {canBook ? (
                          <Button
                            size="sm"
                            leftIcon={<CalendarCheck className="w-3.5 h-3.5" />}
                            onClick={() => onOpenListing({ kind: offer.kind, slug: offer.slug }, 'book')}
                          >
                            Réserver
                          </Button>
                        ) : null}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {extras.inquiries.length > 0 || extras.bookings.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Aussi sur cet événement
              </p>
              <ul className="space-y-1">
                {extras.bookings.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`${followHref}&tab=bookings`}
                      className="flex items-center justify-between gap-2 text-xs rounded-[var(--radius-button)] border border-border px-3 py-2 hover:border-primary/40"
                    >
                      <span className="truncate">{item.title}</span>
                      <StatusPill tone="sky">{item.status === 'REQUESTED' ? 'Réservation' : 'Résa'}</StatusPill>
                    </Link>
                  </li>
                ))}
                {extras.inquiries.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`${followHref}&tab=quotes`}
                      className="flex items-center justify-between gap-2 text-xs rounded-[var(--radius-button)] border border-border px-3 py-2 hover:border-primary/40"
                    >
                      <span className="truncate">{item.title}</span>
                      <StatusPill tone="amber">Devis</StatusPill>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
