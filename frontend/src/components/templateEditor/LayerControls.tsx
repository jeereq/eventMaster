'use client';

import React from 'react';
import { BringForward, BringToFront, Layers, SendBackward, SendToBack } from '@/components/icons';
import type { LayerAction } from '@/lib/templateLayers';

const ACTIONS: Array<{ id: LayerAction; label: string; hint: string; Icon: typeof Layers }> = [
  { id: 'front', label: 'Premier plan', hint: 'Passer devant tous les éléments', Icon: BringToFront },
  { id: 'forward', label: 'Avancer', hint: 'Passer devant l’élément suivant', Icon: BringForward },
  { id: 'backward', label: 'Reculer', hint: 'Passer derrière l’élément précédent', Icon: SendBackward },
  { id: 'back', label: 'Arrière-plan', hint: 'Passer derrière tous les éléments', Icon: SendToBack },
];

/** Réglage de superposition (calques) d’un élément en placement libre. */
export default function LayerControls({
  position,
  total,
  freeLayout,
  onAction,
  onEnableFreeLayout,
}: {
  position: number;
  total: number;
  freeLayout: boolean;
  onAction: (action: LayerAction) => void;
  onEnableFreeLayout: () => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-surface p-3" data-testid="layer-controls">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <Layers className="w-3.5 h-3.5 text-primary" aria-hidden /> Superposition
        </span>
        {freeLayout && total > 1 && (
          <span className="text-[11px] text-muted tabular-nums">
            Plan {position} / {total}
          </span>
        )}
      </div>
      {freeLayout ? (
        <div className="grid grid-cols-4 gap-1.5">
          {ACTIONS.map(({ id, label, hint, Icon }) => {
            const disabled = total < 2 || ((id === 'front' || id === 'forward') && position === total) || ((id === 'back' || id === 'backward') && position === 1);
            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                onClick={() => onAction(id)}
                title={hint}
                className="min-h-11 flex flex-col items-center justify-center gap-0.5 rounded-lg border border-border bg-surface text-foreground text-[10px] font-semibold leading-tight hover:bg-surface-muted transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <Icon className="w-4 h-4" aria-hidden />
                {label}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted leading-snug">
            Pour poser une image ou une illustration sur une autre, passez en placement « Glisser où je veux ».
          </p>
          <button
            type="button"
            onClick={onEnableFreeLayout}
            className="w-full min-h-9 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs font-bold hover:bg-primary/15 transition cursor-pointer"
          >
            Activer « Glisser où je veux »
          </button>
        </div>
      )}
    </div>
  );
}
