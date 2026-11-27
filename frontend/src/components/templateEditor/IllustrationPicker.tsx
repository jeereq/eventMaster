'use client';
/* eslint-disable @next/next/no-img-element -- vignettes SVG générées localement */

import React, { useMemo, useState } from 'react';
import { TEMPLATE_ILLUSTRATIONS, illustrationDataUri } from '@/lib/templateIllustrations';

const CATEGORIES = ['Tout', ...Array.from(new Set(TEMPLATE_ILLUSTRATIONS.map((i) => i.category)))];

/** Bibliothèque d’illustrations à poser sur la carte (recolorables, superposables). */
export default function IllustrationPicker({
  color,
  onPick,
}: {
  color: string;
  onPick: (id: string) => void;
}) {
  const [category, setCategory] = useState('Tout');
  const items = useMemo(
    () =>
      TEMPLATE_ILLUSTRATIONS.filter((i) => category === 'Tout' || i.category === category).map((i) => ({
        ...i,
        src: illustrationDataUri(i.id, color) || '',
      })),
    [category, color],
  );
  return (
    <div className="space-y-2" data-testid="illustration-picker">
      <div className="flex flex-wrap gap-1">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border transition cursor-pointer ${
              category === c ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted hover:bg-surface-muted'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {items.map((i) => (
          <button
            key={i.id}
            type="button"
            onClick={() => onPick(i.id)}
            title={`Ajouter : ${i.label}`}
            className="aspect-square rounded-lg border border-border bg-surface hover:border-primary hover:bg-primary/5 p-1.5 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <img src={i.src} alt={i.label} className="w-full h-full object-contain" draggable={false} />
          </button>
        ))}
      </div>
    </div>
  );
}
