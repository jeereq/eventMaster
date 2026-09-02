'use client';

import React from 'react';
import { Clock, RotateCcw } from 'lucide-react';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import type { AiSimulationHistoryItem } from '@/lib/aiSimulationHistory';

export default function AiSimulationHistoryList({
  items,
  onRestore,
  activeId,
}: {
  items: AiSimulationHistoryItem[];
  onRestore: (item: AiSimulationHistoryItem) => void;
  activeId?: string | null;
}) {
  if (!items.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted inline-flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        Historique ({items.length})
      </p>
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
        {items.slice(0, 8).map((item) => {
          const date = new Date(item.createdAt);
          const label = [item.city, item.eventType].filter(Boolean).join(' · ') || 'Simulation';
          const active = activeId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onRestore(item)}
              className={cn(
                'shrink-0 min-w-[11rem] text-left rounded-xl border px-3 py-2 space-y-0.5 transition cursor-pointer touch-manipulation',
                active
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-surface hover:border-primary/40',
              )}
            >
              <p className="text-[11px] font-bold text-foreground truncate">{label}</p>
              <p className="text-[10px] text-muted">
                {Number.isFinite(date.getTime())
                  ? date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : '—'}
                {item.budgetMaxFc ? ` · ${formatFc(item.budgetMaxFc)}` : ''}
              </p>
              <span className="text-[10px] font-semibold text-primary inline-flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />
                Rouvrir
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
