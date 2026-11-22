'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { planRowSeatCode } from '@/lib/planRowSeats';
import type { SeatRowMeta } from '@/lib/seatSelectionLayout';

export type RowStripSeatState = 'mine' | 'taken' | 'free';

/**
 * Une rangée de cinéma / d’amphithéâtre vue de face : l’écran (ou la scène) devant,
 * les fauteuils dans l’ordre, l’allée centrale s’il y en a une, et la place de l’invité en évidence.
 * Remplace le schéma « table ronde entourée de chaises », qui n’avait pas de sens pour un rang.
 */
export default function GuestRowSeatStrip({
  name,
  rowMeta,
  capacity,
  seatIndex,
  seatState,
  seatTitle,
  compact = false,
  className,
}: {
  name: string;
  rowMeta?: SeatRowMeta | null;
  capacity: number;
  seatIndex?: number;
  /** État d’un fauteuil (occupé, libre) ; la place de l’invité est toujours « mine ». */
  seatState?: (index: number) => RowStripSeatState;
  seatTitle?: (index: number) => string;
  compact?: boolean;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const mineRef = useRef<HTMLDivElement | null>(null);
  const count = Math.max(0, Math.min(80, Math.round(capacity) || 0));
  const aisleAfter = rowMeta?.aisleSplit && count >= 4 ? Math.ceil(count / 2) - 1 : -1;
  const size = compact ? 18 : 26;

  // La place de l’invité est centrée dans le bandeau, même sur un rang de 30 fauteuils.
  useEffect(() => {
    const box = scrollRef.current;
    const mine = mineRef.current;
    if (!box || !mine) return;
    box.scrollLeft = mine.offsetLeft - box.clientWidth / 2 + mine.clientWidth / 2;
  }, [seatIndex, count]);

  return (
    <div className={cn('space-y-1.5', className)}>
      <div
        className="mx-auto h-1.5 w-4/5 rounded-full bg-gradient-to-r from-transparent via-foreground/35 to-transparent"
        aria-hidden
      />
      <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted">Écran · scène</p>
      <div ref={scrollRef} className="overflow-x-auto overscroll-contain pb-1">
        <div className="mx-auto flex w-max items-center gap-1 px-1">
          {Array.from({ length: count }).map((_, i) => {
            const state: RowStripSeatState = i === seatIndex ? 'mine' : seatState?.(i) ?? 'free';
            const code = planRowSeatCode(name, rowMeta, i);
            return (
              <React.Fragment key={i}>
                <div
                  ref={state === 'mine' ? mineRef : undefined}
                  title={seatTitle?.(i) ?? (state === 'mine' ? `Votre fauteuil (${code})` : code)}
                  className={cn(
                    'relative flex shrink-0 items-center justify-center rounded-[30%] border font-bold tabular-nums leading-none',
                    state === 'mine' && 'border-white bg-primary-solid text-primary-foreground ring-2 ring-primary/50 shadow-md',
                    state === 'taken' && 'border-border bg-surface-muted text-muted',
                    state === 'free' && 'border-border bg-surface text-foreground/70',
                  )}
                  style={{
                    width: state === 'mine' ? size + 6 : size,
                    height: state === 'mine' ? size + 6 : size,
                    fontSize: compact ? 8 : 10,
                  }}
                >
                  {/* Dossier côté spectateur : l’écran est en haut. */}
                  <span
                    aria-hidden
                    className={cn(
                      'absolute -bottom-[3px] left-[15%] right-[15%] h-[3px] rounded-full',
                      state === 'mine' ? 'bg-primary' : 'bg-foreground/25',
                    )}
                  />
                  {i + 1}
                </div>
                {i === aisleAfter ? <div className="w-3 shrink-0" aria-hidden /> : null}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
