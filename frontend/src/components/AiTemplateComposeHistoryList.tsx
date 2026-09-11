'use client';

import React from 'react';
import { Clock, ImageIcon, Layers } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  type AiTemplateComposeHistoryItem,
  extractItemVariants,
} from '@/lib/aiTemplateComposeHistory';
import { StudioAiEmpty } from '@/components/StudioAiTabs';

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

function HistoryPreviewThumb({ src }: { src?: string | null }) {
  const [error, setError] = React.useState(false);

  if (!src || error) {
    return (
      <span className="absolute inset-0 flex items-center justify-center text-muted" aria-hidden>
        <ImageIcon className="w-4 h-4" />
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

export default function AiTemplateComposeHistoryList({
  items,
  onOpen,
  activeId,
  className,
  listClassName,
  title = 'Générations précédentes',
  showEmpty = false,
  emptyAction,
}: {
  items: AiTemplateComposeHistoryItem[];
  onOpen: (item: AiTemplateComposeHistoryItem, preferredVariantUrl?: string) => void;
  activeId?: string | null;
  className?: string;
  listClassName?: string;
  title?: string;
  showEmpty?: boolean;
  emptyAction?: React.ReactNode;
}) {
  if (!items.length) {
    if (!showEmpty) return null;
    return (
      <StudioAiEmpty
        icon={Clock}
        title="Aucun historique"
        hint="Vos cartes générées dans ce studio s’afficheront ici. Vous pourrez les rouvrir d’un tap."
        action={emptyAction}
      />
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs font-semibold text-foreground inline-flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-primary" aria-hidden />
        {title}
        <span className="text-muted font-medium">({items.length})</span>
      </p>
      <ul
        className={cn(
          'max-h-80 sm:max-h-96 overflow-y-auto overscroll-contain divide-y divide-border border border-border rounded-[var(--radius-card)] bg-surface',
          listClassName,
        )}
      >
        {items.map((item) => {
          const active = activeId === item.id;
          const refs = item.referenceUrls?.length || 0;
          const variants = extractItemVariants(item);
          const hasDualVariants = variants.length >= 2;

          return (
            <li
              key={item.id}
              className={cn(
                'px-3 py-2.5 transition min-h-14',
                active ? 'bg-primary/10' : 'hover:bg-surface-muted/70',
              )}
            >
              <div className="flex items-start gap-3 min-w-0">
                {/* Vignette(s) : Affiche les 2 propositions côte-à-côte si disponibles */}
                {hasDualVariants ? (
                  <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    {variants.slice(0, 2).map((vUrl, vIdx) => {
                      const propLetter = String.fromCharCode(65 + vIdx);
                      return (
                        <button
                          key={vUrl}
                          type="button"
                          onClick={() => onOpen(item, vUrl)}
                          title={`Charger la Proposition ${propLetter}`}
                          aria-label={`Charger la Proposition ${propLetter}`}
                          className="relative w-10 sm:w-11 h-14 rounded-md overflow-hidden border-2 border-border hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition group/thumb shadow-xs cursor-pointer touch-manipulation"
                        >
                          <HistoryPreviewThumb src={vUrl} />
                          <span className="absolute bottom-0.5 inset-x-0.5 text-center text-[9px] font-black uppercase bg-black/75 text-white rounded-[3px] py-0.5 group-hover/thumb:bg-primary transition">
                            {propLetter}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpen(item)}
                    title="Rouvrir cette génération"
                    aria-label="Rouvrir cette génération"
                    className="relative w-12 h-14 shrink-0 rounded-md overflow-hidden border border-border bg-surface-muted hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition cursor-pointer touch-manipulation"
                  >
                    <HistoryPreviewThumb src={item.previewImageUrl} />
                  </button>
                )}

                {/* Contenu textuel et métadonnées */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpen(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpen(item);
                    }
                  }}
                  className="min-w-0 flex-1 space-y-1 cursor-pointer focus-visible:outline-none"
                >
                  <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2 break-words hover:text-primary transition-colors">
                    {composeTitle(item)}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                    {hasDualVariants && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                        <Layers className="w-2.5 h-2.5" />
                        2 propositions (A/B)
                      </span>
                    )}
                    <span>{item.source === 'studio' ? 'Studio' : 'Modèles'}</span>
                    {refs > 0 && <span>· {refs} photo{refs > 1 ? 's' : ''} réf.</span>}
                    <span>· {relativeTime(item.createdAt)}</span>
                  </div>
                </div>

                {/* Actions directes A / B ou Rouvrir standard */}
                <div className="shrink-0 pt-0.5 flex flex-col sm:flex-row items-end gap-1">
                  {hasDualVariants ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onOpen(item, variants[0])}
                        title="Rouvrir avec la Proposition A"
                        className="text-[11px] font-bold px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition cursor-pointer touch-manipulation"
                      >
                        Prop. A
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpen(item, variants[1])}
                        title="Rouvrir avec la Proposition B"
                        className="text-[11px] font-bold px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition cursor-pointer touch-manipulation"
                      >
                        Prop. B
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpen(item)}
                      className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                      Rouvrir
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
