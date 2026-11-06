'use client';

import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Étoiles en lecture seule ; la note est aussi écrite en texte pour les lecteurs d'écran. */
export function ReviewStars({ rating, size = 'sm', className }: { rating: number; size?: 'sm' | 'md'; className?: string }) {
  const px = size === 'md' ? 'h-5 w-5' : 'h-3.5 w-3.5';
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={`${rating} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cn(px, n <= Math.round(rating) ? 'fill-festive-accent text-festive-accent' : 'text-border')}
        />
      ))}
    </span>
  );
}

/** Sélecteur 1 à 5 étoiles (boutons radio). */
export function ReviewStarsInput({ value, onChange }: { value: number; onChange: (rating: number) => void }) {
  const labels = ['Décevant', 'Moyen', 'Bien', 'Très bien', 'Excellent'];
  return (
    <div className="space-y-1">
      <div role="radiogroup" aria-label="Note" className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} sur 5 : ${labels[n - 1]}`}
            onClick={() => onChange(n)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Star aria-hidden className={cn('h-7 w-7', n <= value ? 'fill-festive-accent text-festive-accent' : 'text-border')} />
          </button>
        ))}
      </div>
      <p className="text-xs text-muted min-h-4">{value ? labels[value - 1] : 'Touchez une étoile'}</p>
    </div>
  );
}
