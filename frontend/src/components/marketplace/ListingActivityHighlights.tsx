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
          const mediaTotal = post.mediaUrls?.length ?? 0;

          return (
            <div
              key={post.id}
              className="group/card rounded-2xl sm:rounded-3xl border border-border/80 bg-slate-950 overflow-hidden relative shadow-xs hover:shadow-lg transition-all duration-300 snap-start w-[78%] sm:w-auto shrink-0 sm:shrink aspect-[3/4] flex flex-col justify-between"
            >
              {/* Segmented bar façon story si multi-photos */}
              {mediaTotal > 1 && (
                <div className="absolute top-2 inset-x-2.5 z-20 flex gap-1 pointer-events-none">
                  {Array.from({ length: Math.min(mediaTotal, 4) }).map((_, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'h-0.5 flex-1 rounded-full',
                        idx === 0 ? 'bg-white' : 'bg-white/40',
                      )}
                    />
                  ))}
                </div>
              )}

              {/* Média en arrière-plan */}
              {firstImage ? (
                <button
                  type="button"
                  onClick={() => {
                    const idx = allImages.indexOf(firstImage);
                    setLightbox({ urls: allImages, index: Math.max(0, idx) });
                  }}
                  className="absolute inset-0 w-full h-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  aria-label={`Ouvrir la story de ${authorLabel}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sizedMediaUrl(firstImage, 640)}
                    alt={post.content ? `Snap de ${authorLabel} : ${post.content.slice(0, 60)}` : `Snap de ${authorLabel}`}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                  />
                  {mediaTotal > 1 && (
                    <span className="absolute top-4 right-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold border border-white/15">
                      {mediaTotal} snaps
                    </span>
                  )}
                </button>
              ) : isVideo ? (
                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center text-primary">
                  <Sparkles className="w-8 h-8" />
                </div>
              ) : (
                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary/80 via-teal-800 to-slate-950 p-4 flex items-center justify-center text-center">
                  <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed line-clamp-4">
                    « {post.content} »
                  </p>
                </div>
              )}

              {/* Gradient immersif & interactions façon Snapchat */}
              <div className="relative z-10 mt-auto p-3 pt-12 bg-gradient-to-t from-black/95 via-black/60 to-transparent text-white space-y-2 pointer-events-none">
                {firstImage && post.content && (
                  <p className="text-xs text-white/95 line-clamp-2 leading-relaxed drop-shadow-xs font-medium">
                    {post.content}
                  </p>
                )}

                <div className="flex items-center justify-between text-[10px] text-white/75 pt-1">
                  <span>{formatRelativeDate(post.createdAt)}</span>
                  <div className="flex items-center gap-2">
                    {post.likeCount > 0 && (
                      <span className="inline-flex items-center gap-1 font-semibold text-rose-400">
                        <Heart className="w-3 h-3 fill-current" /> {post.likeCount}
                      </span>
                    )}
                    {post.commentCount > 0 && (
                      <span className="inline-flex items-center gap-1 font-semibold text-white/90">
                        <MessageCircle className="w-3 h-3" /> {post.commentCount}
                      </span>
                    )}
                  </div>
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
