import React from 'react';
import { Check } from '@/components/icons';
import { cn } from '@/lib/cn';

/**
 * Ligne de forfait pleine largeur : nom, prix et bouton à gauche, contenu du forfait à droite.
 * Les couleurs sont fixes (carte blanche ou carte d’accent) pour rester lisibles sur le fond vert foncé
 * de la page de tarifs, quel que soit le thème de l’application.
 */
export interface PlanPricingRowProps {
  name: string;
  /** Pastille à côté du nom (ex. « Le plus choisi », « 300 invités »). */
  badge?: string;
  description?: string;
  price: React.ReactNode;
  periodSuffix?: string;
  /** Lignes secondaires sous le prix (équivalent mensuel, facturation annuelle…). */
  notes?: React.ReactNode[];
  /** Ancien prix barré et libellé de promotion. */
  promo?: { label: string; savingsPercent?: number | null; catalogPrice?: string | null };
  highlights: React.ReactNode[];
  /** Carte colorée (forfait mis en avant). */
  accent?: boolean;
  /** Bouton ou lien d’action. */
  cta: React.ReactNode;
  /** Informations en plus sous la liste (ex. quotas). */
  footer?: React.ReactNode;
  className?: string;
}

export default function PlanPricingRow({
  name,
  badge,
  description,
  price,
  periodSuffix,
  notes,
  promo,
  highlights,
  accent = false,
  cta,
  footer,
  className,
}: PlanPricingRowProps) {
  return (
    <article
      className={cn(
        'rounded-[20px] border-t-4 px-6 py-6 sm:px-8 sm:py-7 text-[#10291c]',
        'grid gap-6 md:grid-cols-2 md:gap-10',
        accent ? 'border-t-[#34ad7a] bg-[#b0eed5]' : 'border-t-[#b0eed5] bg-white',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold tracking-tight">{name}</h3>
          {badge ? (
            <span className="rounded-full bg-[#10291c] px-2.5 py-0.5 text-xs font-semibold text-[#b0eed5]">{badge}</span>
          ) : null}
        </div>

        <div>
          {promo ? (
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-[#10291c]/10 px-2.5 py-0.5">{promo.label}</span>
              {promo.savingsPercent != null ? <span>−{promo.savingsPercent} %</span> : null}
              {promo.catalogPrice ? <span className="font-normal line-through opacity-60">{promo.catalogPrice}</span> : null}
            </div>
          ) : null}
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-4xl font-semibold tracking-tight sm:text-5xl">{price}</span>
            {periodSuffix ? <span className="text-sm opacity-70">{periodSuffix}</span> : null}
          </div>
          {notes && notes.length > 0 ? (
            <div className="mt-1.5 space-y-0.5 text-xs opacity-70">
              {notes.map((note, i) => (
                <p key={i}>{note}</p>
              ))}
            </div>
          ) : null}
        </div>

        {description ? <p className="max-w-md text-sm leading-relaxed">{description}</p> : null}

        <div className="mt-auto pt-1">{cta}</div>
      </div>

      <div className="min-w-0">
        <h4 className="mb-3 text-sm font-semibold">Inclus</h4>
        <ul className="space-y-2.5">
          {highlights.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm leading-snug">
              <span
                aria-hidden
                className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#10291c] text-[#b0eed5]"
              >
                <Check className="h-3 w-3" />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </article>
  );
}

/** Style du bouton d’une ligne de forfait : plein sombre, ou contour sur carte blanche. */
export function planRowButtonClass(variant: 'solid' | 'outline' = 'outline') {
  return cn(
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34ad7a] focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    variant === 'solid'
      ? 'bg-[#10291c] text-white hover:bg-[#1f4a33]'
      : 'border border-[#10291c]/40 bg-transparent text-[#10291c] hover:bg-[#10291c]/5',
  );
}
