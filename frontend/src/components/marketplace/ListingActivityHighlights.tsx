'use client';

import React, { useState } from 'react';
import { Rss, Heart, MessageCircle, ArrowRight } from 'lucide-react';
import type { MarketplaceActivityPreviewItem } from '@/lib/marketplace';
import { isVideoUrl, sizedMediaUrl } from '@/lib/marketplace';
import { cn } from '@/lib/cn';
import ImageLightbox from '@/components/marketplace/ImageLightbox';

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Récemment';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "À l'instant";
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
    <section className={cn('space-y-3 pt-4 border-t border-border', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-sm font-semibold text-foreground">Réalisations</h2>
          <p className="text-xs text-muted">Récents clichés de {authorLabel}</p>
        </div>
        {onViewAllActivity ? (
          <button
            type="button"
            onClick={onViewAllActivity}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-[var(--radius-button)] px-2.5 text-xs font-semibold text-primary hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            Voir tout
            <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="flex overflow-x-auto snap-x snap-mandatory overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch] sm:grid sm:grid-cols-3 gap-3 pb-1 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((post) => {
          const firstImage = post.mediaUrls?.find((m) => m.type !== 'VIDEO' && !isVideoUrl(m.url))?.url;
          const mediaTotal = post.mediaUrls?.length ?? 0;

          return (
            <article
              key={post.id}
              className="relative flex aspect-[3/4] w-[80%] shrink-0 snap-start flex-col justify-end overflow-hidden rounded-[var(--radius-card)] border border-border bg-stage sm:w-auto sm:shrink"
            >
              {firstImage ? (
                <button
                  type="button"
                  onClick={() => {
                    const idx = allImages.indexOf(firstImage);
                    setLightbox({ urls: allImages, index: Math.max(0, idx) });
                  }}
                  className="absolute inset-0 w-full h-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  aria-label={`Ouvrir les photos de ${authorLabel}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sizedMediaUrl(firstImage, 640)}
                    alt={post.content ? `Réalisation de ${authorLabel} : ${post.content.slice(0, 60)}` : `Réalisation de ${authorLabel}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  {mediaTotal > 1 ? (
                    <span className="absolute top-2 right-2 rounded-full bg-stage/80 px-2 py-0.5 text-xs font-semibold text-stage-foreground">
                      {mediaTotal} photos
                    </span>
                  ) : null}
                </button>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-stage p-4 text-center">
                  <p className="text-sm font-semibold text-stage-foreground leading-relaxed line-clamp-4">
                    {post.content || 'Réalisation récente'}
                  </p>
                </div>
              )}

              <div className="relative z-10 mt-auto space-y-2 bg-gradient-to-t from-stage via-stage/70 to-transparent p-3 pt-10 text-stage-foreground pointer-events-none">
                {firstImage && post.content ? (
                  <p className="text-xs leading-relaxed line-clamp-2">{post.content}</p>
                ) : null}
                <div className="flex items-center justify-between pt-1 text-xs font-medium tabular-nums text-stage-foreground/85">
                  <span>{formatRelativeDate(post.createdAt)}</span>
                  <div className="flex items-center gap-2">
                    {post.likeCount > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Heart className="w-3 h-3" aria-hidden /> {post.likeCount}
                      </span>
                    ) : null}
                    {post.commentCount > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" aria-hidden /> {post.commentCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {lightbox ? (
        <ImageLightbox
          urls={lightbox.urls}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
          title={`Réalisations — ${authorLabel}`}
        />
      ) : null}
    </section>
  );
}
