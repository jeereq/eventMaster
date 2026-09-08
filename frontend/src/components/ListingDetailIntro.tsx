'use client';

import React from 'react';
import { Navigation } from 'lucide-react';

export default function ListingDetailIntro({
  facts,
  description,
  onItinerary,
  itineraryLabel = 'Itinéraire',
  children,
}: {
  facts: Array<{ label: string; value: string }>;
  description?: string | null;
  onItinerary?: () => void;
  itineraryLabel?: string;
  children?: React.ReactNode;
}) {
  if (!children && facts.length === 0 && !description && !onItinerary) return null;

  return (
    <div className="flex flex-col gap-5 max-w-prose">
      {children}
      {facts.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-xs font-semibold text-muted">{fact.label}</dt>
              <dd className="mt-1 text-sm font-medium text-foreground break-words">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {onItinerary ? (
        <button
          type="button"
          onClick={onItinerary}
          className="self-start inline-flex items-center gap-1.5 min-h-11 px-3 rounded-[var(--radius-button)] border border-border bg-surface text-xs font-semibold text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <Navigation className="w-3.5 h-3.5 text-primary" aria-hidden />
          {itineraryLabel}
        </button>
      ) : null}
      {description ? (
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{description}</p>
      ) : null}
    </div>
  );
}
