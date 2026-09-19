'use client';

import React, { useMemo } from 'react';
import { Check, Crown, Sparkles, Star, Ticket, ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatFc } from '@/config/landingPricing';
import {
  sortPricingZones,
  getPricingTierMeta,
  type PricingZone,
  type PricingTierBadgeType,
} from '@/lib/ticketPricing';

const DEFAULT_ZONE_COLOR = 'var(--festive-accent, #c4a35a)';

export interface TicketPricingGridProps {
  /** Liste des zones tarifaires définies pour l’événement */
  zones: PricingZone[];
  /** Identifiant de la zone actuellement sélectionnée */
  selectedZoneId?: string;
  /** Rappel lors du choix d’une zone */
  onSelectZone: (zoneId: string) => void;
  /** Style compact (sidebar de paiement) ou étendu (page de présentation) */
  variant?: 'compact' | 'full';
  /** Ordre de tri par prix (croissant par défaut) */
  sortOrder?: 'asc' | 'desc';
  /** Afficher le titre et sous-titre de présentation */
  showHeading?: boolean;
  /** Libellé du bouton d’action */
  ctaLabel?: string;
  className?: string;
}

function TierIcon({ type }: { type: PricingTierBadgeType }) {
  switch (type) {
    case 'vip':
      return <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    case 'popular':
      return <Star className="w-3.5 h-3.5 text-primary shrink-0 fill-primary/20" />;
    case 'entry':
      return <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
    default:
      return <Ticket className="w-3.5 h-3.5 text-muted shrink-0" />;
  }
}

export default function TicketPricingGrid({
  zones,
  selectedZoneId,
  onSelectZone,
  variant = 'compact',
  sortOrder = 'asc',
  showHeading = false,
  ctaLabel,
  className,
}: TicketPricingGridProps) {
  const sortedZones = useMemo(() => {
    return sortPricingZones(zones, sortOrder);
  }, [zones, sortOrder]);

  if (!sortedZones.length) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <div className={cn('space-y-2.5', className)}>
        {showHeading && (
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Ticket className="w-3.5 h-3.5 text-primary" />
              Catégorie de place
            </p>
            <span className="text-[11px] text-muted">Classé par prix croissant</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {sortedZones.map((zone) => {
            const isSelected = selectedZoneId === zone.id;
            const meta = getPricingTierMeta(zone, sortedZones);
            const zoneColor = zone.color || DEFAULT_ZONE_COLOR;

            return (
              <button
                key={zone.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelectZone(zone.id)}
                className={cn(
                  'group relative text-left p-3.5 rounded-xl border transition-all duration-150 flex flex-col justify-between gap-2.5 min-h-[5.5rem] touch-manipulation',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/40 shadow-xs'
                    : 'border-border bg-surface hover:border-primary/50 hover:bg-surface-muted/50',
                )}
              >
                {/* En-tête : Badge & indicateur de couleur */}
                <div className="flex items-center justify-between gap-2 w-full">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border',
                      meta.badgeClass,
                    )}
                  >
                    <TierIcon type={meta.badgeType} />
                    {meta.badgeLabel}
                  </span>

                  <span
                    className="w-3 h-3 rounded-full shrink-0 border border-border"
                    style={{ backgroundColor: zoneColor }}
                    title={`Couleur : ${zone.name}`}
                  />
                </div>

                {/* Nom et tarif */}
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-foreground leading-snug line-clamp-1">
                    {zone.name}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-black text-primary font-mono tabular-nums">
                      {formatFc(zone.priceFc)}
                    </span>
                    <span className="text-[11px] text-muted font-normal">/ place</span>
                  </div>
                </div>

                {/* État de sélection */}
                <div className="pt-1.5 border-t border-border/60 flex items-center justify-between text-[11px] w-full">
                  {zone.maxSeats != null && zone.maxSeats > 0 ? (
                    <span className="text-[10px] text-muted">
                      Capacité : {zone.maxSeats} places
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-muted/70" />
                      Place garantie
                    </span>
                  )}

                  <span
                    className={cn(
                      'font-bold inline-flex items-center gap-1 transition-colors',
                      isSelected ? 'text-primary' : 'text-muted group-hover:text-foreground',
                    )}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        Sélectionné
                      </>
                    ) : (
                      'Choisir'
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Variant "full" : Grille comparative complète
  return (
    <section className={cn('space-y-4', className)}>
      {showHeading && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Ticket className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Formules & Billets disponibles
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-muted">
            Sélectionnez votre niveau d’accès pour cet événement. Les tarifs sont présentés par ordre de prix croissant.
          </p>
        </div>
      )}

      <div
        className={cn(
          'grid gap-4 sm:gap-5',
          sortedZones.length === 1
            ? 'grid-cols-1 max-w-md mx-auto'
            : sortedZones.length === 2
              ? 'grid-cols-1 sm:grid-cols-2'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        )}
      >
        {sortedZones.map((zone) => {
          const isSelected = selectedZoneId === zone.id;
          const meta = getPricingTierMeta(zone, sortedZones);
          const zoneColor = zone.color || DEFAULT_ZONE_COLOR;

          return (
            <div
              key={zone.id}
              className={cn(
                'relative rounded-2xl border bg-surface p-5 flex flex-col justify-between gap-4 transition-all duration-200 shadow-2xs hover:shadow-md',
                isSelected
                  ? 'border-primary ring-2 ring-primary/40 bg-primary/[0.02]'
                  : meta.isPopular
                    ? 'border-primary/50 shadow-sm'
                    : 'border-border hover:border-primary/40',
              )}
            >
              {meta.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary text-primary-foreground shadow-xs">
                    <Star className="w-3 h-3 fill-current" />
                    Le plus populaire
                  </span>
                </div>
              )}

              <div className="space-y-3.5">
                {/* En-tête : Badge & Nom */}
                <div className="flex items-start justify-between gap-2 pt-1">
                  <div className="space-y-1">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border',
                        meta.badgeClass,
                      )}
                    >
                      <TierIcon type={meta.badgeType} />
                      {meta.badgeLabel}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-foreground">
                      {zone.name}
                    </h3>
                  </div>

                  <span
                    className="w-4 h-4 rounded-full shrink-0 border border-border mt-1"
                    style={{ backgroundColor: zoneColor }}
                    title={`Code couleur : ${zone.name}`}
                  />
                </div>

                {/* Bloc Prix */}
                <div className="pt-2 border-t border-border/70">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-foreground font-mono tabular-nums tracking-tight">
                      {formatFc(zone.priceFc)}
                    </span>
                    <span className="text-xs text-muted font-medium">/ personne</span>
                  </div>
                  {zone.maxSeats != null && zone.maxSeats > 0 && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">
                      Places limitées : {zone.maxSeats} places au total
                    </p>
                  )}
                </div>

                {/* Liste d'avantages & garanties */}
                <ul className="space-y-2 pt-2 border-t border-border/70 text-xs text-muted">
                  {meta.perks.map((perk, pIdx) => (
                    <li key={pIdx} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-tight text-foreground/90">{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bouton de sélection */}
              <div className="pt-3 border-t border-border/70">
                <button
                  type="button"
                  onClick={() => onSelectZone(zone.id)}
                  className={cn(
                    'w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 min-h-11 shadow-xs touch-manipulation',
                    isSelected
                      ? 'bg-primary text-primary-foreground hover:bg-primary-hover ring-2 ring-primary/30'
                      : 'border border-border bg-surface hover:border-primary hover:bg-primary/5 text-foreground',
                  )}
                >
                  {isSelected ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      Billet sélectionné
                    </>
                  ) : (
                    <>
                      {ctaLabel || 'Choisir ce billet'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
