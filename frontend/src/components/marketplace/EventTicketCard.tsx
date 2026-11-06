'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { formatFc } from '@/config/landingPricing';
import { listingSrcSet, sizedMediaUrl, type CatalogueItem, type PublicEventCard } from '@/lib/marketplace';
import { rememberCurrentCatalogueList } from '@/lib/catalogueQuery';

const COVER_WIDTHS = [360, 480, 640, 800] as const;

function dateParts(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const fmt = (opts: Intl.DateTimeFormatOptions) => d.toLocaleString('fr-FR', opts);
  return {
    dow: fmt({ weekday: 'short' }).replace('.', ''),
    day: fmt({ day: 'numeric' }),
    mon: fmt({ month: 'short' }).replace('.', ''),
    when: `${fmt({ weekday: 'short', day: 'numeric', month: 'short' })} · ${fmt({ hour: '2-digit', minute: '2-digit' })}`,
  };
}

/** Places restantes : ton chaud quand il en reste peu, gris quand c’est complet. */
function stockLabel(event: PublicEventCard | undefined): { text: string; tone: 'hot' | 'calm' | 'full' } | null {
  if (!event) return null;
  if (event.soldOut) return { text: 'Complet', tone: 'full' };
  const left = event.ticketsRemaining;
  if (left == null) return null;
  if (left <= 30) return { text: `Plus que ${left} place${left > 1 ? 's' : ''}`, tone: 'hot' };
  return { text: `${left} places`, tone: 'calm' };
}

/**
 * Carte « billet » d’un événement public : date en pastille, souche pointillée, prix et places.
 * Utilisée par la liste des événements (vue grille).
 */
export default function EventTicketCard({
  item,
  event,
  eager = false,
}: {
  item: CatalogueItem;
  event?: PublicEventCard;
  eager?: boolean;
}) {
  const parts = dateParts(item.eventDate);
  const stock = stockLabel(event);
  const place = [event?.neighborhood, event?.commune].filter(Boolean).join(', ') || item.location;
  const city = event?.city || '';
  const priceText = item.priceFromFc != null
    ? `${item.priceUnitLabel === 'à partir de' ? 'Dès ' : ''}${formatFc(item.priceFromFc)}`
    : 'Entrée libre';

  return (
    <Link
      href={item.href}
      onClick={() => rememberCurrentCatalogueList()}
      className={cn(
        'group flex flex-col rounded-2xl border border-border bg-surface overflow-hidden text-foreground transition',
        'hover:border-primary/40 hover:shadow-[0_12px_28px_-18px_rgba(16,41,28,0.45)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
    >
      <div className="relative aspect-[16/10] bg-[#1f4a33] text-white p-3 sm:p-3.5 flex flex-col justify-between">
        {item.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary/Unsplash srcset, comme les autres cartes du catalogue
          <img
            src={sizedMediaUrl(item.coverUrl, 640)}
            srcSet={listingSrcSet(item.coverUrl, [...COVER_WIDTHS])}
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw"
            alt=""
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            className="absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : null}
        <span aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/5 to-black/45" />

        <div className="relative flex items-start justify-between gap-2">
          {parts ? (
            <span className="rounded-[10px] bg-white text-[#1e1f21] px-2 sm:px-2.5 pt-1.5 pb-1 text-center leading-[1.05] min-w-[46px] shadow-sm">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-amber-700">{parts.dow}</span>
              <span className="block font-display text-xl sm:text-2xl font-bold">{parts.day}</span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.06em]">{parts.mon}</span>
            </span>
          ) : <span />}
          {stock?.tone === 'full' ? (
            <span className="rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold">Complet</span>
          ) : null}
        </div>
        {city ? (
          <span className="relative font-display text-[11px] sm:text-[13px] uppercase tracking-[0.14em] opacity-85">{city}</span>
        ) : null}

        {/* Encoches de la souche du billet */}
        <span aria-hidden className="absolute -left-[9px] -bottom-[9px] w-[18px] h-[18px] rounded-full bg-background" />
        <span aria-hidden className="absolute -right-[9px] -bottom-[9px] w-[18px] h-[18px] rounded-full bg-background" />
      </div>

      <div className="border-t-2 border-dashed border-border px-3 sm:px-4 pt-3 sm:pt-3.5 pb-3.5 sm:pb-4 flex flex-col gap-1 sm:gap-1.5 flex-1 min-w-0">
        {parts ? <span className="text-xs sm:text-[13px] font-semibold text-primary-solid first-letter:uppercase">{parts.when}</span> : null}
        <h3 className="font-display text-[15px] sm:text-lg font-semibold leading-snug line-clamp-2">{item.title}</h3>
        <span className="text-xs sm:text-sm text-muted line-clamp-1">{place}</span>
        <div className="mt-auto pt-2.5 sm:pt-3 border-t border-border/70 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
          <span className="text-sm sm:text-base font-semibold tabular-nums">{priceText}</span>
          {stock && stock.tone !== 'full' ? (
            <span
              className={cn(
                'text-xs sm:text-[13px] font-semibold',
                stock.tone === 'hot' ? 'text-amber-700 dark:text-amber-300' : 'text-muted',
              )}
            >
              {stock.text}
            </span>
          ) : stock?.tone === 'full' ? (
            <span className="text-xs sm:text-[13px] font-semibold text-muted">Complet</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
