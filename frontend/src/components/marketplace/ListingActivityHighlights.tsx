'use client';

import React, { useState } from 'react';
import { Rss, Heart, MessageCircle, ArrowRight, Sparkles } from 'lucide-react';
import type { MarketplaceActivityPreviewItem } from '@/lib/marketplace';
import { isVideoUrl, sizedMediaUrl } from '@/lib/marketplace';
import { cn } from '@/lib/cn';
import ImageLightbox from '@/components/marketplace/ImageLightbox';

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
            <h2 className="text-sm font-bold text-foreground">Publications</h2>
            <p className="text-[11px] text-muted">Publications récentes de {authorLabel}</p>
          </div>
        </div>
        {onViewAllActivity && (
          <button
            type="button"
            onClick={onViewAllActivity}
            className="inline-flex items-center gap-1 min-h-10 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-primary hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <span>Voir tout</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory sm:grid sm:grid-cols-3 gap-3 pb-1 sm:pb-0">
        {items.map((post) => {
          const firstImage = post.mediaUrls?.find((m) => m.type !== 'VIDEO' && !isVideoUrl(m.url))?.url;
          const isVideo = !firstImage && Boolean(post.mediaUrls?.find((m) => m.type === 'VIDEO' || isVideoUrl(m.url)));

          return (
            <div
              key={post.id}
              className="group/card rounded-2xl border border-border bg-surface p-3 space-y-2.5 flex flex-col justify-between hover:border-primary/40 hover:shadow-xs transition-all duration-200 snap-start w-[82%] sm:w-auto shrink-0 sm:shrink"
            >
              <div className="space-y-2">
                {firstImage ? (
                  <button
                    type="button"
                    onClick={() => {
                      const idx = allImages.indexOf(firstImage);
                      setLightbox({ urls: allImages, index: Math.max(0, idx) });
                    }}
                    className="relative w-full aspect-16/10 rounded-xl overflow-hidden bg-surface-muted block text-left group-hover/card:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition"
                    aria-label={`Agrandir la photo de ${authorLabel}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sizedMediaUrl(firstImage, 640)}
                      alt={post.content ? `Photo de publication : ${post.content.slice(0, 80)}` : `Publication de ${authorLabel}`}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                    />
                    {post.mediaUrls.length > 1 && (
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold">
                        +{post.mediaUrls.length - 1}
                      </span>
                    )}
                  </button>
                ) : isVideo ? (
                  <div className="w-full aspect-16/10 rounded-xl overflow-hidden bg-surface-muted border border-border/50 flex items-center justify-center text-muted">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                ) : null}

                {post.content ? (
                  <p className="text-xs text-foreground/90 line-clamp-2 leading-relaxed font-normal break-words">
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
        <ImageLightbox
          urls={lightbox.urls}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
          title={`Publications — ${authorLabel}`}
        />
      )}
    </section>
  );
}
