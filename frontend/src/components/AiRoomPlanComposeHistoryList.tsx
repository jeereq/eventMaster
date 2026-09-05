'use client';

import React from 'react';
import { Clock, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { AiRoomPlanComposeHistoryItem } from '@/lib/aiRoomPlanComposeHistory';

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

function composeTitle(item: AiRoomPlanComposeHistoryItem) {
  const prompt = (item.prompt || '').replace(/\s+/g, ' ').trim();
  if (prompt) return prompt.length > 72 ? `${prompt.slice(0, 71)}…` : prompt;
  return item.source === 'studio' ? 'Plan studio' : 'Plan généré';
}

function HistoryPreviewThumb({ src }: { src?: string | null }) {
  const [error, setError] = React.useState(false);

  if (!src || error) {
    return (
      <span className="absolute inset-0 flex items-center justify-center text-muted" aria-hidden>
        <LayoutGrid className="w-4 h-4" />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setError(true)}
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}

export default function AiRoomPlanComposeHistoryList({
  items,
  onOpen,
  activeId,
  className,
  listClassName,
  title = 'Plans générés',
}: {
  items: AiRoomPlanComposeHistoryItem[];
  onOpen: (item: AiRoomPlanComposeHistoryItem) => void;
  activeId?: string | null;
  className?: string;
  listClassName?: string;
  title?: string;
}) {
  if (!items.length) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs font-semibold text-foreground inline-flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-primary" aria-hidden />
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
          const count = item.itemCount || item.draft.items.length;
          const label = `Rouvrir : ${composeTitle(item)} · ${relativeTime(item.createdAt)}`;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onOpen(item)}
                aria-label={label}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'w-full text-left px-3 py-2.5 min-h-14 transition cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50',
                  active ? 'bg-primary/10' : 'hover:bg-surface-muted/70',
                )}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="relative w-12 h-14 shrink-0 rounded-md overflow-hidden border border-border bg-surface-muted">
                    <HistoryPreviewThumb src={item.imageUrl} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2 break-words">
                      {composeTitle(item)}
                    </p>
                    <p className="text-xs text-muted">
                      {[
                        item.source === 'studio' ? 'Studio' : 'Plans 3D',
                        count ? `${count} élément${count > 1 ? 's' : ''}` : null,
                        relativeTime(item.createdAt),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-primary shrink-0 pt-0.5" aria-hidden>
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
