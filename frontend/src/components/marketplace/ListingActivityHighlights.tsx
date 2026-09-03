'use client';

import React, { useState } from 'react';
import { Rss, Heart, MessageCircle, ArrowRight, Sparkles, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MarketplaceActivityPreviewItem } from '@/lib/marketplace';
import { isVideoUrl } from '@/lib/marketplace';
import { cn } from '@/lib/cn';

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}

export default function ListingActivityHighlights({
  activityPreview,
  authorLabel,
  onViewAllActivity,
  className,
}: {
  activityPreview?: MarketplaceActivityPreviewItem[] | null;
  authorLabel: string;
  onViewAllActivity?: () => void;
  className?: string;
}) {
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);

  if (!activityPreview || activityPreview.length === 0) return null;

  const items = activityPreview.slice(0, 3);
  const allImages = items.flatMap((it) =>
    (it.mediaUrls || [])
      .filter((m) => m.type !== 'VIDEO' && !isVideoUrl(m.url))
      .map((m) => m.url),
  );

  return (
    <section className={cn('space-y-4 pt-4 border-t border-border/70', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Rss className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Actualités & Réalisations</h2>
            <p className="text-[11px] text-muted">Publications récentes de {authorLabel}</p>
          </div>
        </div>
        {onViewAllActivity && (
          <button
            type="button"
            onClick={onViewAllActivity}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline underline-offset-2"
          >
            <span>Voir tout</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map((post) => {
          const firstImage = post.mediaUrls?.find((m) => m.type !== 'VIDEO' && !isVideoUrl(m.url))?.url;
          const isVideo = !firstImage && Boolean(post.mediaUrls?.find((m) => m.type === 'VIDEO' || isVideoUrl(m.url)));

          return (
            <div
              key={post.id}
              className="group/card rounded-2xl border border-border bg-surface p-3 space-y-2.5 flex flex-col justify-between hover:border-primary/40 hover:shadow-xs transition-all duration-200"
            >
              <div className="space-y-2">
                {firstImage ? (
                  <button
                    type="button"
                    onClick={() => {
                      const idx = allImages.indexOf(firstImage);
                      setLightbox({ urls: allImages, index: Math.max(0, idx) });
                    }}
                    className="relative w-full aspect-16/10 rounded-xl overflow-hidden bg-surface-muted block text-left group-hover/card:opacity-95 transition"
                    aria-label="Agrandir la photo"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={firstImage}
                      alt=""
                      className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                    />
                    {post.mediaUrls.length > 1 && (
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold">
                        +{post.mediaUrls.length - 1}
                      </span>
                    )}
                  </button>
                ) : isVideo ? (
                  <div className="w-full aspect-16/10 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center text-white/70">
                    <Sparkles className="w-6 h-6" />
                  </div>
                ) : null}

                {post.content ? (
                  <p className="text-xs text-foreground/90 line-clamp-2 leading-relaxed font-normal">
                    {post.content}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted pt-2 border-t border-border/50">
                <span>{formatRelativeDate(post.createdAt)}</span>
                <div className="flex items-center gap-2.5">
                  {post.likeCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                      <Heart className="w-3 h-3 fill-current" /> {post.likeCount}
                    </span>
                  )}
                  {post.commentCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> {post.commentCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Visionneuse photo"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-4xl w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.urls[lightbox.index]}
              alt=""
              className="max-h-[85vh] max-w-full object-contain rounded-2xl"
            />
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white rounded-full bg-white/10"
              aria-label="Fermer"
            >
              <X className="w-6 h-6" />
            </button>
            {lightbox.urls.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-2 p-2.5 text-white rounded-full bg-black/60 hover:bg-black/90 transition"
                  aria-label="Précédente"
                  onClick={() =>
                    setLightbox((lb) =>
                      lb ? { ...lb, index: (lb.index - 1 + lb.urls.length) % lb.urls.length } : null,
                    )
                  }
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  className="absolute right-2 p-2.5 text-white rounded-full bg-black/60 hover:bg-black/90 transition"
                  aria-label="Suivante"
                  onClick={() =>
                    setLightbox((lb) =>
                      lb ? { ...lb, index: (lb.index + 1) % lb.urls.length } : lb,
                    )
                  }
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
