'use client';

import React from 'react';
import { Clock, Users } from 'lucide-react';
import { formatFc } from '@/config/landingPricing';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { cn } from '@/lib/cn';
import { eventTypeLabel } from '@/lib/listingDetails';
import type { AiSimulationHistoryItem } from '@/lib/aiSimulationHistory';

function relativeTime(iso: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '—';
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return 'À l’instant';
  if (diff < 3_600_000) return `Il y a ${Math.max(1, Math.floor(diff / 60_000))} min`;
  if (diff < 86_400_000) return `Il y a ${Math.max(1, Math.floor(diff / 3_600_000))} h`;
  return date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function simulationTitle(item: AiSimulationHistoryItem) {
  const prompt = (item.prompt || '').replace(/\s+/g, ' ').trim();
  if (prompt) return prompt.length > 72 ? `${prompt.slice(0, 71)}…` : prompt;
  const type = item.eventType ? eventTypeLabel(item.eventType) : 'Simulation';
  const place = [item.commune, item.city].filter(Boolean).join(', ');
  return place ? `${type} · ${place}` : type;
}

export default function AiSimulationHistoryList({
  items,
  onOpen,
  activeId,
  className,
  listClassName,
}: {
  items: AiSimulationHistoryItem[];
  onOpen: (item: AiSimulationHistoryItem) => void;
  activeId?: string | null;
  className?: string;
  listClassName?: string;
}) {
  const { site } = usePlatformSite();
  const exchangeRate = Number(site?.usdExchangeRateCdf) > 0 ? Number(site.usdExchangeRateCdf) : 2800;

  if (!items.length) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs font-semibold text-foreground inline-flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-primary" />
        Simulations précédentes
        <span className="text-muted font-medium">({items.length})</span>
      </p>
      <ul className={cn(
        'max-h-80 sm:max-h-96 overflow-y-auto overscroll-contain divide-y divide-border border border-border rounded-xl bg-surface',
        listClassName,
      )}>
        {items.map((item) => {
          const active = activeId === item.id;
          const packs = item.result?.packages || [];
          const place = [item.commune, item.city].filter(Boolean).join(', ');
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onOpen(item)}
                className={cn(
                  'w-full text-left px-3 py-2.5 transition cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50',
                  active ? 'bg-primary/10' : 'hover:bg-surface-muted/70',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                      {simulationTitle(item)}
                    </p>
                    <p className="text-[11px] text-muted">
                      {[item.eventType ? eventTypeLabel(item.eventType) : null, place, relativeTime(item.createdAt)]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    <p className="text-[11px] text-muted inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      {item.guestCount ? (
                        <span className="inline-flex items-center gap-0.5">
                          <Users className="w-3 h-3" />
                          {item.guestCount}
                        </span>
                      ) : null}
                      {item.budgetMaxFc ? (
                        <span>
                          {Math.round(item.budgetMaxFc / exchangeRate).toLocaleString('fr-FR')} $ ({formatFc(item.budgetMaxFc)})
                        </span>
                      ) : null}
                      {packs.length ? (
                        <span>
                          {packs.length} formule{packs.length > 1 ? 's' : ''}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-primary shrink-0 pt-0.5">Voir</span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
