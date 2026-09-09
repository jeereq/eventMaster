'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Ticket,
  Heart,
  Building2,
  ExternalLink,
  Navigation,
  Download,
  CheckCircle2,
  Layers,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import { sizedMediaUrl, type PublicEventCard, type PublicEventPost } from '@/lib/marketplace';
import { normalizeEventProgram, type EventProgramSlot } from '@/lib/eventProgram';

export interface EventDetailOverviewProps {
  event: PublicEventCard;
  onStartRoute?: () => void;
  onGoToCheckout?: (tab?: 'ticket' | 'donation') => void;
  posts?: PublicEventPost[];
}

function formatDateFull(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function formatIsoForCalendar(dateStr: string, hourOffset = 3) {
  try {
    const d = new Date(dateStr);
    const end = new Date(d.getTime() + hourOffset * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const toUtcStr = (date: Date) =>
      `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00Z`;
    return { start: toUtcStr(d), end: toUtcStr(end) };
  } catch {
    return { start: '', end: '' };
  }
}

function downloadIcsCalendar(event: PublicEventCard) {
  try {
    const { start, end } = formatIsoForCalendar(event.date);
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//EventMaster//FR',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:eventmaster-${event.id}@eventmaster.cd`,
      `DTSTAMP:${start || '20260101T000000Z'}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${event.title.replace(/\n/g, ' ')}`,
      `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
      `LOCATION:${(event.location || '').replace(/\n/g, ' ')}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${(event.slug || 'evenement').replace(/[^a-z0-9_-]/gi, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch {
    // fallback ignoré
  }
}

function getGoogleCalendarLink(event: PublicEventCard) {
  const { start, end } = formatIsoForCalendar(event.date);
  const text = encodeURIComponent(event.title);
  const details = encodeURIComponent(event.description || '');
  const location = encodeURIComponent(event.location || '');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`;
}

function getGoogleMapsLink(event: PublicEventCard) {
  if (event.latitude != null && event.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`;
}

export default function EventDetailOverview({
  event,
  onStartRoute,
  onGoToCheckout,
  posts = [],
}: EventDetailOverviewProps) {
  const [calendarMenuOpen, setCalendarMenuOpen] = useState(false);
  const program = normalizeEventProgram(event.eventProgram);
  const hasProgram = program.slots.length > 0;
  const fullDateLabel = formatDateFull(event.date);
  const timeLabel = formatTime(event.date);
  const donations = event.donations;
  const hasDonations = Boolean(donations && donations.enabled);

  const donationProgress =
    hasDonations && donations?.targetAmountFc && donations.targetAmountFc > 0
      ? Math.min(100, Math.round(((donations.collectedAmountFc || 0) / donations.targetAmountFc) * 100))
      : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. GRILLE DES INFOS CLÉS (GLANCEABILITY) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Date & Horaires */}
        <div className="rounded-2xl border border-border bg-surface p-4 flex flex-col justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Date & Horaire</span>
              <p className="text-sm sm:text-base font-bold text-foreground capitalize mt-0.5 leading-snug">
                {fullDateLabel}
              </p>
              {timeLabel && (
                <p className="text-xs text-muted font-medium flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                  À partir de {timeLabel}
                </p>
              )}
            </div>
          </div>

          <div className="relative pt-1 border-t border-border/70 flex items-center justify-between">
            <span className="text-xs text-muted">Synchroniser :</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setCalendarMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg transition touch-manipulation"
                aria-expanded={calendarMenuOpen}
                aria-haspopup="true"
              >
                <span>Ajouter à l’agenda</span>
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', calendarMenuOpen && 'rotate-180')} />
              </button>

              {calendarMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setCalendarMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 bottom-full mb-1 w-48 rounded-xl border border-border bg-surface shadow-xl z-40 p-1 space-y-0.5 text-xs">
                    <a
                      href={getGoogleCalendarLink(event)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setCalendarMenuOpen(false)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-muted flex items-center gap-2 font-medium text-foreground transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-primary shrink-0" />
                      Google Agenda
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        downloadIcsCalendar(event);
                        setCalendarMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-muted flex items-center gap-2 font-medium text-foreground transition"
                    >
                      <Download className="w-3.5 h-3.5 text-primary shrink-0" />
                      Apple / Outlook (.ics)
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Lieu & Itinéraire */}
        <div className="rounded-2xl border border-border bg-surface p-4 flex flex-col justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Lieu & Accès</span>
              <p className="text-sm sm:text-base font-bold text-foreground mt-0.5 leading-snug line-clamp-2">
                {event.location || 'Lieu communiqué aux inscrits'}
              </p>
              {(event.commune || event.city) && (
                <p className="text-xs text-muted font-medium mt-0.5">
                  {[event.commune, event.city].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>

          <div className="pt-1 border-t border-border/70 flex items-center justify-between gap-2">
            {onStartRoute ? (
              <button
                type="button"
                onClick={onStartRoute}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg transition touch-manipulation"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Voir le plan</span>
              </button>
            ) : null}
            <a
              href={getGoogleMapsLink(event)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-muted rounded-lg transition"
            >
              <span>Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Accès, Billetterie & Places */}
        <div className="rounded-2xl border border-border bg-surface p-4 flex flex-col justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Ticket className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Billetterie & Entrées</span>
              <p className="text-sm sm:text-base font-bold text-foreground mt-0.5">
                {event.soldOut
                  ? 'Événement Complet'
                  : event.paid
                    ? `À partir de ${formatFc(event.priceFromFc || event.ticketPriceFc)}`
                    : 'Entrée gratuite / libre'}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {event.soldOut ? (
                  <Badge variant="danger">Complet</Badge>
                ) : event.ticketsRemaining != null ? (
                  <Badge variant={event.ticketsRemaining <= 10 ? 'warning' : 'success'}>
                    {event.ticketsRemaining} place{event.ticketsRemaining > 1 ? 's' : ''} disponible{event.ticketsRemaining > 1 ? 's' : ''}
                  </Badge>
                ) : (
                  <Badge variant="primary">Ouvert</Badge>
                )}
                {event.seatSelectionEnabled && (
                  <Badge variant="default" className="gap-1 inline-flex items-center">
                    <Layers className="w-3 h-3 text-primary" />
                    Choix des places 2D/3D
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="pt-1 border-t border-border/70 flex items-center justify-between">
            <span className="text-[11px] text-muted">Confirmation :</span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              RSVP instantané
            </span>
          </div>
        </div>

        {/* Organisateur */}
        <div className="rounded-2xl border border-border bg-surface p-4 flex flex-col justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Organisé par</span>
              <p className="text-sm sm:text-base font-bold text-foreground mt-0.5 truncate">
                {event.orgName || 'Organisation vérifiée'}
              </p>
              <p className="text-xs text-muted font-medium mt-0.5">
                Accueil sécurisé & protocole EventMaster
              </p>
            </div>
          </div>

          <div className="pt-1 border-t border-border/70 flex items-center justify-between">
            <span className="text-[11px] text-muted">Garantie :</span>
            <span className="text-xs font-medium text-primary flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Billet certifié avec QR Pass
            </span>
          </div>
        </div>
      </div>

      {/* 2. BANNIÈRE COLLECTE DE DONS SOLIDAIRES (SI ACTIVÉE) */}
      {hasDonations && donations && (
        <section className="rounded-2xl border border-rose-500/25 bg-gradient-to-br from-rose-500/5 via-surface to-rose-500/10 p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Heart className="w-4 h-4 fill-rose-500/30" />
                </span>
                <h2 className="text-base font-bold text-foreground">Collecte de dons solidaires</h2>
                <Badge variant="danger" className="text-[10px]">Action solidaire</Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted leading-relaxed pl-10">
                {donations.cause || 'Votre contribution soutient directement les initiatives et projets de cet événement.'}
              </p>
            </div>

            {onGoToCheckout && (
              <Button
                type="button"
                size="sm"
                onClick={() => onGoToCheckout('donation')}
                className="bg-rose-700 hover:bg-rose-800 text-white shrink-0 self-start sm:self-center font-bold min-h-10"
                leftIcon={<Heart className="w-4 h-4" />}
              >
                Faire un don solidaire
              </Button>
            )}
          </div>

          {donations.targetAmountFc && donations.targetAmountFc > 0 ? (
            <div className="space-y-2 pt-2 border-t border-rose-500/20">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-rose-700 dark:text-rose-300">
                  {formatFc(donations.collectedAmountFc || 0)} récoltés
                </span>
                <span className="text-muted">
                  Objectif : {formatFc(donations.targetAmountFc)} ({donationProgress}%)
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Progression de la collecte de dons"
                aria-valuenow={donations.collectedAmountFc || 0}
                aria-valuemin={0}
                aria-valuemax={donations.targetAmountFc}
                aria-valuetext={`${formatFc(donations.collectedAmountFc || 0)} récoltés sur ${formatFc(donations.targetAmountFc)}`}
                className="w-full h-2.5 rounded-full bg-rose-500/15 overflow-hidden"
              >
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-rose-600 transition-all duration-500 rounded-full"
                  style={{ width: `${Math.max(4, donationProgress)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>{donations.donorsCount || 0} donateur{(donations.donorsCount || 0) > 1 ? 's' : ''} mobilisé{(donations.donorsCount || 0) > 1 ? 's' : ''}</span>
                <span>Montant minimum d’un don : {formatFc(donations.minAmountFc || 1000)}</span>
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between text-xs text-muted">
              <span>{donations.donorsCount || 0} contribution{(donations.donorsCount || 0) > 1 ? 's' : ''} enregistrée{(donations.donorsCount || 0) > 1 ? 's' : ''}</span>
              <span>Montants libres à partir de {formatFc(donations.minAmountFc || 1000)}</span>
            </div>
          )}
        </section>
      )}

      {/* 3. PROGRAMME / DÉROULÉ DE L'ÉVÉNEMENT (SI PRÉSENT) */}
      {hasProgram && (
        <section className="rounded-2xl border border-border bg-surface p-5 space-y-4 shadow-2xs">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Programme & Déroulé
            </h2>
            <p className="text-xs text-muted">
              Les moments clés prévus lors de l’événement pour vous organiser au mieux.
            </p>
          </div>

          <ol className="relative border-l-2 border-primary/20 ml-3.5 space-y-4 my-2">
            {program.slots.map((slot: EventProgramSlot, sIdx: number) => (
              <li key={slot.id || sIdx} className="ml-5 group">
                <span className="absolute -left-[9px] mt-1.5 w-4 h-4 rounded-full border-2 border-surface bg-primary group-hover:scale-125 transition-transform" />
                <div className="rounded-xl border border-border/80 bg-surface-muted/50 p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-primary font-mono tracking-wide">
                      {slot.startsAt}
                      {slot.endsAt ? ` → ${slot.endsAt}` : ''}
                    </span>
                    {slot.exterior && (
                      <Badge variant="default" className="text-[10px]">Extérieur</Badge>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-foreground">{slot.label}</p>
                </div>
              </li>
            ))}
          </ol>

          {program.notes && (
            <p className="text-xs text-muted italic pt-2 border-t border-border">
              Note : {program.notes}
            </p>
          )}
        </section>
      )}

      {/* 4. DESCRIPTION COMPLÈTE */}
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6 space-y-3.5 shadow-2xs">
        <h2 className="text-base font-bold text-foreground">À propos de l’événement</h2>
        {event.description ? (
          <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line space-y-2">
            {event.description}
          </div>
        ) : (
          <p className="text-sm text-muted italic">
            Aucune description complémentaire fournie. Les inscriptions et accès sont ouverts.
          </p>
        )}
      </section>

      {/* 5. ACTUALITÉS / FEED PUBLIÉ PAR L'ORGANISATEUR */}
      {posts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Actualités de l’organisateur ({posts.length})</h2>
          </div>
          <div className="space-y-3.5">
            {posts.map((post) => (
              <article key={post.id} className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-3 shadow-2xs">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Publié le {new Date(post.createdAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
                {post.content && (
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                    {post.content}
                  </p>
                )}
                {post.media.length > 0 && (
                  <div className={cn('grid gap-2 rounded-xl overflow-hidden pt-1', post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
                    {post.media.map((media, mIdx) =>
                      media.type === 'VIDEO' ? (
                        <video key={media.url} src={media.url} controls preload="metadata" className="w-full max-h-80 object-contain bg-black rounded-lg" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={media.url}
                          src={sizedMediaUrl(media.url, 720)}
                          alt={`Média publication ${mIdx + 1}`}
                          loading="lazy"
                          decoding="async"
                          className="w-full max-h-80 object-cover rounded-lg"
                        />
                      ),
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
