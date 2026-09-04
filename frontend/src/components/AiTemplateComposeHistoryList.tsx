'use client';

import React from 'react';
import { Clock, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { AiTemplateComposeHistoryItem } from '@/lib/aiTemplateComposeHistory';

function relativeTime(iso: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '—';
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return 'À l’instant';
  if (diff < 3_600_000) return `Il y a ${Math.max(1, Math.floor(diff / 60_000))} min`;
  if (diff < 86_400_000) return `Il y a ${Math.max(1, Math.floor(diff / 3_600_000))} h`;
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function composeTitle(item: AiTemplateComposeHistoryItem) {
  const prompt = (item.prompt || '').replace(/\s+/g, ' ').trim();
  if (prompt) return prompt.length > 72 ? `${prompt.slice(0, 71)}…` : prompt;
  return item.source === 'studio' ? 'Génération studio' : 'Génération modèle';
}

export default function AiTemplateComposeHistoryList({
  items,
  onOpen,
  activeId,
  className,
  listClassName,
  title = 'Générations précédentes',
}: {
  items: AiTemplateComposeHistoryItem[];
  onOpen: (item: AiTemplateComposeHistoryItem) => void;
  activeId?: string | null;
  className?: string;
  listClassName?: string;
  title?: string;
}) {
  if (!items.length) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs font-semibold text-foreground inline-flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-primary" />
        {title}
        <span className="text-muted font-medium">({items.length})</span>
      </p>
      <ul
        className={cn(
          'max-h-80 sm:max-h-96 overflow-y-auto overscroll-contain divide-y divide-border border border-border rounded-xl bg-surface',
          listClassName,
        )}
      >
        {items.map((item) => {
          const active = activeId === item.id;
          const refs = item.referenceUrls?.length || 0;
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
                <div className="flex items-start gap-3">
                  <div className="relative w-12 h-14 shrink-0 rounded-md overflow-hidden border border-border bg-surface-muted">
                    {item.previewImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.previewImageUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-muted">
                        <ImageIcon className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                      {composeTitle(item)}
                    </p>
                    <p className="text-[11px] text-muted">
                      {[
                        item.source === 'studio' ? 'Studio' : 'Modèles',
                        refs ? `${refs} image${refs > 1 ? 's' : ''}` : null,
                        relativeTime(item.createdAt),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-primary shrink-0 pt-0.5">
                    Rouvrir
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
