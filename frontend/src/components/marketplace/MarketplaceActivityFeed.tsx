'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { uploadMarketplaceMedia } from '@/lib/cloudinaryUpload';
import { clientLoginHref } from '@/lib/safeAppPath';
import { cn } from '@/lib/cn';
import { isVideoUrl, sizedMediaUrl } from '@/lib/marketplace';
import ImageLightbox from '@/components/marketplace/ImageLightbox';
import {
  Heart, MessageCircle, Send, Trash2, Loader2, Image as ImageIcon,
  Video, X, ChevronLeft, ChevronRight, Plus, Building2, Sparkles,
  Share2, Check, Maximize2,
} from 'lucide-react';

export type MarketplaceFeedMedia = { url: string; type: 'IMAGE' | 'VIDEO' };

export type MarketplaceFeedComment = {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
  userId?: string;
};

export type MarketplaceFeedPost = {
  id: string;
  content: string | null;
  mediaUrls: MarketplaceFeedMedia[];
  likes?: string[] | null;
  likeCount?: number;
  createdAt: string;
  comments: MarketplaceFeedComment[];
};

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
    hour: '2-digit',
    minute: '2-digit',
  });
}

function likeKey(userId?: string | null) {
  return userId ? `user_${userId}` : '';
}

type Scope =
  | { kind: 'venue'; listingId: string }
  | { kind: 'vendor' };

type PublicScope =
  | { kind: 'venue'; slug: string }
  | { kind: 'vendor'; slug: string };

/** Grille de médias adaptative et responsive */
export function PostMediaGrid({
  media,
  onOpenImage,
  className,
}: {
  media: MarketplaceFeedMedia[];
  onOpenImage?: (url: string) => void;
  className?: string;
}) {
  if (!media.length) return null;

  return (
    <div className={cn('rounded-2xl overflow-hidden border border-border/70 bg-surface-muted/40', className)}>
      <div
        className={cn(
          'grid gap-1.5',
          media.length === 1 && 'grid-cols-1',
          media.length === 2 && 'grid-cols-2 aspect-4/3 sm:aspect-16/9',
          media.length === 3 && 'grid-cols-2 sm:grid-cols-3 aspect-4/3 sm:aspect-16/9',
          media.length >= 4 && 'grid-cols-2 aspect-square sm:aspect-16/10',
        )}
      >
        {media.slice(0, 4).map((m, i) => {
          const video = m.type === 'VIDEO' || isVideoUrl(m.url);
          const isFourthAndMore = i === 3 && media.length > 4;
          const extraCount = media.length - 4;
          const isFirstOfThree = media.length === 3 && i === 0;

          return (
            <div
              key={`${m.url}-${i}`}
              className={cn(
                'relative overflow-hidden group/media bg-surface-muted',
                media.length === 1 ? 'aspect-16/10 max-h-[460px]' : 'h-full w-full',
                isFirstOfThree && 'col-span-2 sm:col-span-1',
              )}
            >
              {video ? (
                <video src={m.url} controls className="w-full h-full object-cover" />
              ) : (
                <button
                  type="button"
                  className="w-full h-full text-left relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  onClick={() => onOpenImage?.(m.url)}
                  aria-label={`Agrandir la photo ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sizedMediaUrl(m.url, 800)}
                    alt={`Média ${i + 1} de la publication`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover/media:scale-105"
                    loading="lazy"
                  />
                  {isFourthAndMore && (
                    <div className="absolute inset-0 bg-black/65 backdrop-blur-2xs flex items-center justify-center text-white text-base font-bold">
                      +{extraCount + 1} photos
                    </div>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Composer + liste pour le propriétaire dans l'espace administration. */
export function MarketplaceActivityFeedManager({
  scope,
  authorLabel = 'Vous',
  className,
}: {
  scope: Scope;
  authorLabel?: string;
  className?: string;
}) {
  const [posts, setPosts] = useState<MarketplaceFeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<MarketplaceFeedMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const listPath =
    scope.kind === 'venue'
      ? `/marketplace/venues/${scope.listingId}/feed`
      : '/marketplace/vendors/me/feed';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get(listPath);
      setPosts(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le fil.');
    } finally {
      setLoading(false);
    }
  }, [listPath]);

  useEffect(() => {
    void load();
  }, [load]);

  const onPickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError('');
    try {
      const next = [...media];
      for (const file of Array.from(files).slice(0, 8 - next.length)) {
        const uploaded = await uploadMarketplaceMedia(file);
        const type: 'IMAGE' | 'VIDEO' = file.type.startsWith('video/') || isVideoUrl(uploaded.url) ? 'VIDEO' : 'IMAGE';
        next.push({ url: uploaded.url, type });
      }
      setMedia(next);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Échec du téléversement.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const publish = async () => {
    if (!content.trim() && media.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const created = await api.post(listPath, {
        content: content.trim() || null,
        mediaUrls: media,
      });
      setPosts((prev) => [created, ...prev]);
      setContent('');
      setMedia([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Publication impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (postId: string) => {
    if (!window.confirm('Supprimer cette publication ?')) return;
    try {
      await api.delete(`/marketplace/feed/${postId}`);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Suppression impossible.');
    }
  };

  return (
    <div className={cn('space-y-5', className)}>
      {/* Composer moderne */}
      <div className="rounded-3xl border border-border bg-surface p-4 sm:p-5 space-y-3.5 shadow-sm">
        <label htmlFor="marketplace-activity-composer" className="sr-only">
          Nouvelle publication
        </label>
        <textarea
          id="marketplace-activity-composer"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder="Partagez une nouvelle décoration, un événement récent, une promo…"
          className="w-full rounded-2xl border border-border bg-surface-muted/50 px-3.5 py-3 text-sm text-foreground placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-primary/40 resize-y min-h-[5.5rem]"
        />

        {media.length > 0 && (
          <div className="flex flex-wrap gap-2.5 pt-1">
            {media.map((m, i) => (
              <div key={`${m.url}-${i}`} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-border bg-surface-muted shadow-2xs">
                {m.type === 'VIDEO' || isVideoUrl(m.url) ? (
                  <video src={m.url} className="w-full h-full object-cover" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => setMedia((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-black transition"
                  aria-label="Retirer le média"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => void onPickFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || media.length >= 8}
            className="inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-xl border border-border text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Ajouter photos / vidéos
          </button>
          <button
            type="button"
            onClick={() => void publish()}
            disabled={submitting || uploading || (!content.trim() && media.length === 0)}
            className="inline-flex items-center gap-1.5 min-h-10 px-4 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:opacity-95 transition disabled:opacity-50 shadow-xs"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Publier
          </button>
        </div>
      </div>

      {error ? (
        <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 text-xs font-medium" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-10 space-y-1.5 rounded-2xl border border-dashed border-border bg-surface/30">
          <p className="text-sm font-bold text-foreground">Aucune publication</p>
          <p className="text-xs text-muted">Vos publications apparaîtront sur votre fiche et sur le fil public.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <article key={post.id} className="rounded-3xl border border-border bg-surface p-4 sm:p-5 space-y-3 shadow-2xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-foreground">{authorLabel}</p>
                  <p className="text-[11px] text-muted">{formatRelativeDate(post.createdAt)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(post.id)}
                  className="p-2 rounded-xl text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                  aria-label="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {post.content ? (
                <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">{post.content}</p>
              ) : null}

              <PostMediaGrid media={post.mediaUrls || []} />

              <div className="flex items-center gap-4 text-xs text-muted pt-1 border-t border-border/50">
                <span className="inline-flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-rose-500" /> {post.likeCount ?? post.likes?.length ?? 0}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5" /> {post.comments?.length ?? 0}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/** Champ commentaire isolé : la frappe ne provoque aucun re-rendu de la liste */
function VenueCommentBox({
  postId,
  onSubmit,
  busy,
  authorLabel,
}: {
  postId: string;
  onSubmit: (postId: string, text: string) => Promise<boolean>;
  busy?: boolean;
  authorLabel: string;
}) {
  const [draft, setDraft] = useState('');

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    const ok = await onSubmit(postId, text);
    if (ok) {
      setDraft('');
    }
  };

  return (
    <div className="flex gap-2 items-center pt-1">
      <div className="relative flex-1">
        <input
          type="text"
          value={draft}
          maxLength={600}
          disabled={busy}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSend();
          }}
          placeholder="Envoyer un message ou commenter…"
          className="w-full min-h-11 pl-4 pr-10 rounded-full border border-border bg-surface text-base sm:text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-2xs"
          aria-label={`Commenter la publication de ${authorLabel}`}
        />
      </div>
      <button
        type="button"
        onClick={() => void handleSend()}
        disabled={busy || !draft.trim()}
        className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90 active:scale-95 transition shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-label="Publier le commentaire"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      </button>
    </div>
  );
}

/** Carte de publication format Snapchat Spotlight / Stories */
const VenueActivityPostCard = React.memo(function VenueActivityPostCard({
  post,
  authorLabel,
  isVenue,
  user,
  loginHref,
  myLike,
  isLikeBusy,
  isCommentBusy,
  isCopied,
  onToggleLike,
  onSubmitComment,
  onShare,
  onOpenLightbox,
}: {
  post: MarketplaceFeedPost;
  authorLabel: string;
  isVenue: boolean;
  user: unknown;
  loginHref: string;
  myLike: string;
  isLikeBusy?: boolean;
  isCommentBusy?: boolean;
  isCopied?: boolean;
  onToggleLike: (postId: string) => void;
  onSubmitComment: (postId: string, text: string) => Promise<boolean>;
  onShare: (postId: string) => void;
  onOpenLightbox: (urls: string[], index: number) => void;
}) {
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [activeSnapIndex, setActiveSnapIndex] = useState(0);
  const [textExpanded, setTextExpanded] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const likes = Array.isArray(post.likes) ? post.likes : [];
  const liked = Boolean(myLike && likes.includes(myLike));
  const media = (post.mediaUrls || []) as MarketplaceFeedMedia[];
  const images = media
    .filter((m) => m.type !== 'VIDEO' && !isVideoUrl(m.url))
    .map((m) => m.url);
  const hasMedia = media.length > 0;
  const commentCount = post.comments?.length ?? 0;
  const visibleComments = commentsExpanded ? post.comments ?? [] : (post.comments ?? []).slice(0, 2);

  const currentMedia = media[activeSnapIndex] || media[0];
  const isCurrentVideo = currentMedia ? currentMedia.type === 'VIDEO' || isVideoUrl(currentMedia.url) : false;

  const handlePrevSnap = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveSnapIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1));
  };

  const handleNextSnap = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveSnapIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || media.length <= 1) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0) {
        handleNextSnap();
      } else {
        handlePrevSnap();
      }
    }
  };

  return (
    <article
      id={`post-${post.id}`}
      className="group/card rounded-xl sm:rounded-2xl border border-border/80 bg-surface shadow-xs hover:shadow-md transition-all duration-300 p-2 sm:p-2.5 space-y-2.5 [content-visibility:auto] [contain-intrinsic-size:0_480px]"
    >
      {/* ─── CAS 1 : Publication avec Médias (Format Snap Spotlight) ─── */}
      {hasMedia ? (
        <div
          className="relative w-full aspect-[4/5] sm:aspect-[4/5] md:aspect-[3/4] max-h-[620px] rounded-lg sm:rounded-xl overflow-hidden bg-slate-950 select-none shadow-inner touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Barres de progression segmented façon Story Snapchat en cas de multi-snaps */}
          {media.length > 1 && (
            <div className="absolute top-2.5 inset-x-3.5 z-30 flex gap-1.5 pointer-events-none">
              {media.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-all duration-300',
                    idx === activeSnapIndex
                      ? 'bg-white shadow-xs'
                      : idx < activeSnapIndex
                        ? 'bg-white/80'
                        : 'bg-white/30 backdrop-blur-xs',
                  )}
                />
              ))}
            </div>
          )}

          {/* En-tête flottant Story (Profil) */}
          <div className={cn(
            'absolute inset-x-3 sm:inset-x-4 z-20 flex items-center justify-between pointer-events-none',
            media.length > 1 ? 'top-6' : 'top-3 sm:top-4',
          )}>
            <div className="pointer-events-auto inline-flex items-center gap-2 p-1 pr-3 sm:pr-3.5 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-white shadow-lg transition-transform hover:scale-[1.02]">
              <div className={cn(
                'w-8 h-8 rounded-full p-[1.5px] overflow-hidden shrink-0 flex items-center justify-center',
                isVenue
                  ? 'bg-gradient-to-tr from-emerald-400 via-teal-400 to-cyan-500'
                  : 'bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-500',
              )}>
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white">
                  {isVenue ? <Building2 className="w-3.5 h-3.5 text-emerald-400" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                </div>
              </div>
              <div className="min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-[13px] font-bold tracking-tight text-white truncate max-w-[140px] sm:max-w-[200px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    {authorLabel}
                  </span>
                  <span className={cn(
                    'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border',
                    isVenue
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-400/30',
                  )}>
                    {isVenue ? 'Salle' : 'Pro'}
                  </span>
                </div>
                <span className="text-[11px] text-white/85 font-medium truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
                  {formatRelativeDate(post.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Affichage du média avec interactions Story (Zones gauche/droite pour multi-snaps) */}
          {isCurrentVideo ? (
            <video
              key={currentMedia.url}
              src={currentMedia.url}
              controls
              className="w-full h-full object-cover animate-fade-in"
            />
          ) : (
            <div
              className="relative w-full h-full cursor-pointer group/image"
              onClick={() => {
                const idx = images.indexOf(currentMedia.url);
                onOpenLightbox(images, Math.max(0, idx));
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={currentMedia.url}
                src={sizedMediaUrl(currentMedia.url, 1200)}
                alt={`Snap publié par ${authorLabel}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover/image:scale-[1.02] animate-fade-in"
                loading="lazy"
              />

              {/* Zones tactiles Snapchat directes (snap précédent / snap suivant) */}
              {media.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevSnap}
                    className="absolute left-0 inset-y-0 w-1/4 z-10 cursor-w-resize focus-visible:outline-none"
                    aria-label="Snap précédent (cliquer ou glisser vers la droite)"
                  />
                  <button
                    type="button"
                    onClick={handleNextSnap}
                    className="absolute right-0 inset-y-0 w-1/4 z-10 cursor-e-resize focus-visible:outline-none"
                    aria-label="Snap suivant (cliquer ou glisser vers la gauche)"
                  />
                </>
              )}
            </div>
          )}

          {/* Dock d'actions flottant façon Snapchat Spotlight (sur le côté droit) */}
          <div className="absolute right-3 bottom-14 sm:bottom-16 z-20 flex flex-col items-center gap-2.5 pointer-events-auto">
            {/* Bouton Like (Heart) */}
            <button
              type="button"
              onClick={() => onToggleLike(post.id)}
              disabled={isLikeBusy}
              className={cn(
                'w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center text-white hover:bg-black/70 hover:scale-110 active:scale-90 transition shadow-lg',
                liked && 'border-rose-500/40 bg-black/60 shadow-rose-500/20',
              )}
              aria-pressed={liked}
              aria-label={liked ? "Je n'aime plus cette publication" : `Aimer cette publication (${post.likeCount ?? likes.length} mentions j'aime)`}
              title="J'aime"
            >
              <Heart className={cn(
                'w-5 h-5 transition-transform duration-200',
                liked ? 'text-rose-500 fill-rose-500 scale-110 drop-shadow-[0_0_8px_rgba(244,63,94,0.7)]' : 'text-white',
              )} />
              <span className="text-[10px] font-bold text-white drop-shadow-xs -mt-0.5 tabular-nums tracking-tight">
                {post.likeCount ?? likes.length}
              </span>
            </button>

            {/* Bouton Commentaires */}
            <button
              type="button"
              onClick={() => setCommentsExpanded((prev) => !prev)}
              className={cn(
                'w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center text-white hover:bg-black/70 hover:scale-110 active:scale-90 transition shadow-lg',
                commentsExpanded && 'border-primary/60 bg-black/70',
              )}
              aria-expanded={commentsExpanded}
              aria-controls={`venue-comments-${post.id}`}
              aria-label={commentsExpanded ? "Masquer les commentaires" : `Afficher les commentaires (${commentCount})`}
              title="Commentaires"
            >
              <MessageCircle className="w-5 h-5 text-white" />
              <span className="text-[10px] font-bold text-white drop-shadow-xs -mt-0.5 tabular-nums tracking-tight">
                {commentCount}
              </span>
            </button>

            {/* Bouton Partage */}
            <button
              type="button"
              onClick={() => onShare(post.id)}
              className={cn(
                'w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center text-white hover:bg-black/70 hover:scale-110 active:scale-90 transition shadow-lg',
                isCopied && 'border-emerald-400/60 bg-emerald-950/60 text-emerald-300',
              )}
              aria-label={isCopied ? "Lien copié dans le presse-papier" : "Partager cette publication ou copier le lien"}
              title="Partager"
            >
              {isCopied ? (
                <Check className="w-5 h-5 text-emerald-400 animate-in zoom-in-75" />
              ) : (
                <Share2 className="w-5 h-5 text-white" />
              )}
              <span className="text-[9px] font-bold drop-shadow-xs -mt-0.5 tracking-tight" aria-live="polite">
                {isCopied ? 'OK' : 'Partager'}
              </span>
            </button>

            {/* Bouton Agrandir / Plein écran Lightbox */}
            {images.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const idx = images.indexOf(currentMedia.url);
                  onOpenLightbox(images, Math.max(0, idx));
                }}
                className="w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/90 hover:text-white hover:bg-black/60 hover:scale-105 active:scale-90 transition shadow-md touch-manipulation"
                aria-label="Ouvrir la story en plein écran"
                title="Ouvrir la story en plein écran"
              >
                <Maximize2 className="w-4 h-4 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>

          {/* Dégradé immersif bas + Légende / Contenu */}
          <div className="absolute inset-x-0 bottom-0 pt-16 pb-3 px-4 sm:px-5 bg-gradient-to-t from-black/95 via-black/55 to-transparent z-10 text-white rounded-b-[24px] sm:rounded-b-[28px] pointer-events-none flex flex-col gap-1.5">
            {/* Badge indicateur de snap si multi-snaps */}
            {media.length > 1 && (
              <div className="flex items-center gap-2 pointer-events-auto">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/10 tabular-nums">
                  Snap {activeSnapIndex + 1} / {media.length}
                </span>
                <span className="text-[11px] text-white/85 font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">Touchez les côtés ou glissez</span>
              </div>
            )}

            {/* Texte de la publication avec bascule de lecture mobile/desktop */}
            {post.content ? (
              <div className="pointer-events-auto flex flex-col items-start gap-0.5">
                <p
                  className={cn(
                    'text-xs sm:text-sm text-white leading-relaxed font-normal whitespace-pre-line drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] transition-all',
                    !textExpanded && 'line-clamp-2 sm:line-clamp-3',
                  )}
                >
                  {post.content}
                </p>
                {post.content.length > 90 && (
                  <button
                    type="button"
                    onClick={() => setTextExpanded((prev) => !prev)}
                    className="text-[11px] font-bold text-white/90 hover:text-white underline underline-offset-2 mt-0.5 focus-visible:outline-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                  >
                    {textExpanded ? 'Moins' : 'Lire la suite'}
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        /* ─── CAS 2 : Publication texte sans média (Story Texte Snapchat) ─── */
        <div className={cn(
          'relative w-full rounded-lg sm:rounded-xl p-5 sm:p-7 flex flex-col justify-between min-h-[280px] sm:min-h-[320px] overflow-hidden shadow-inner text-white select-none',
          isVenue
            ? 'bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900'
            : 'bg-gradient-to-br from-amber-600 via-rose-600 to-purple-800',
        )}>
          {/* En-tête auteur */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full p-[1.5px] bg-white/30 backdrop-blur-xs flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-black/20 flex items-center justify-center text-white">
                  {isVenue ? <Building2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm text-white drop-shadow-xs">{authorLabel}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-white/20 border border-white/20 text-white">
                    {isVenue ? 'Salle' : 'Pro'}
                  </span>
                </div>
                <p className="text-[10px] text-white/70">{formatRelativeDate(post.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Corps du message expressif façon Story Snapchat */}
          <div className="my-5">
            <p className="text-base sm:text-lg font-bold text-white leading-snug tracking-tight drop-shadow-sm whitespace-pre-line">
              « {post.content} »
            </p>
          </div>

          {/* Barre d'action intégrée */}
          <div className="flex items-center justify-between pt-3 border-t border-white/20">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleLike(post.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition text-xs font-bold',
                  liked && 'bg-rose-500/80 text-white',
                )}
                aria-pressed={liked}
                aria-label={liked ? "Je n'aime plus cette publication" : `Aimer cette publication (${post.likeCount ?? likes.length} mentions j'aime)`}
              >
                <Heart className={cn('w-4 h-4', liked && 'fill-current')} />
                <span className="tabular-nums">{post.likeCount ?? likes.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setCommentsExpanded((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition text-xs font-bold"
                aria-expanded={commentsExpanded}
                aria-controls={`venue-comments-${post.id}`}
                aria-label={commentsExpanded ? "Masquer les commentaires" : `Afficher les commentaires (${commentCount})`}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="tabular-nums">{commentCount}</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => onShare(post.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition text-xs font-bold"
              aria-label={isCopied ? "Lien copié dans le presse-papier" : "Partager cette publication ou copier le lien"}
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Share2 className="w-4 h-4" />}
              <span>{isCopied ? 'Copié !' : 'Partager'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── Section Commentaires (dépliable sous la carte) ─── */}
      {commentsExpanded && (
        <div id={`venue-comments-${post.id}`} className="px-3 pb-3 pt-2 space-y-3 animate-fade-in border-t border-border/50" aria-live="polite">
          {commentCount > 0 && (
            <div className="space-y-2">
              <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {visibleComments.map((c) => (
                  <li
                    key={c.id}
                    className="text-xs rounded-2xl border border-border/80 bg-surface-muted/50 p-3 space-y-1 hover:border-border transition"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-semibold text-foreground break-words tracking-tight">{c.authorName}</span>
                      <span className="text-[11px] text-muted shrink-0 tabular-nums">{formatRelativeDate(c.createdAt)}</span>
                    </div>
                    <p className="text-foreground/90 whitespace-pre-line leading-relaxed break-words">{c.content}</p>
                  </li>
                ))}
              </ul>

              {commentCount > 2 && (
                <button
                  type="button"
                  onClick={() => setCommentsExpanded((prev) => !prev)}
                  className="w-full min-h-9 rounded-lg text-xs font-semibold text-primary hover:underline transition text-left px-1 flex items-center"
                >
                  {commentsExpanded ? 'Masquer les commentaires anciens' : `Afficher les ${commentCount - 2} autres commentaires`}
                </button>
              )}
            </div>
          )}

          {/* Formulaire de commentaire */}
          {!user ? (
            <div className="pt-1">
              <Link
                href={loginHref}
                className="w-full inline-flex items-center justify-center min-h-10 px-4 rounded-full border border-dashed border-border bg-surface-muted/40 text-xs font-semibold text-primary hover:bg-surface-muted transition"
              >
                Connectez-vous pour laisser un message
              </Link>
            </div>
          ) : (
            <VenueCommentBox
              postId={post.id}
              onSubmit={onSubmitComment}
              busy={isCommentBusy}
              authorLabel={authorLabel}
            />
          )}
        </div>
      )}
    </article>
  );
});

/** Vue publique des publications d'une salle ou d'un prestataire. */
export default function MarketplaceActivityFeed({
  scope,
  authorLabel,
  className,
  initialPosts,
}: {
  scope: PublicScope;
  authorLabel: string;
  className?: string;
  initialPosts?: MarketplaceFeedPost[];
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<MarketplaceFeedPost[]>(initialPosts || []);
  const [loading, setLoading] = useState(!initialPosts?.length);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [commentBusy, setCommentBusy] = useState<Record<string, boolean>>({});
  const [likeBusy, setLikeBusy] = useState<Record<string, boolean>>({});
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);

  const feedPath =
    scope.kind === 'venue'
      ? `/public/venues/${encodeURIComponent(scope.slug)}/feed`
      : `/public/vendors/${encodeURIComponent(scope.slug)}/feed`;

  const loginHref =
    typeof window !== 'undefined'
      ? clientLoginHref(`${window.location.pathname}${window.location.search}`)
      : clientLoginHref('/');

  const load = useCallback(async (cursor?: string | null) => {
    if (cursor) setLoadingMore(true);
    else setLoading(true);
    setError('');
    try {
      const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
      const data = await api.get(`${feedPath}${qs}`);
      const page: MarketplaceFeedPost[] = Array.isArray(data?.posts) ? data.posts : [];
      setPosts((prev) => (cursor ? [...prev, ...page] : page));
      setNextCursor(data?.nextCursor || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les publications.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [feedPath]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleLike = useCallback(async (postId: string) => {
    if (!user?.id) {
      router.push(loginHref);
      return;
    }
    setLikeBusy((b) => ({ ...b, [postId]: true }));
    try {
      const updated = await api.post(`/marketplace/feed/${postId}/like`, {});
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...updated } : p)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Like impossible.');
    } finally {
      setLikeBusy((b) => ({ ...b, [postId]: false }));
    }
  }, [user?.id, router, loginHref]);

  const submitComment = useCallback(async (postId: string, text: string): Promise<boolean> => {
    if (!user?.id) {
      router.push(loginHref);
      return false;
    }
    setCommentBusy((b) => ({ ...b, [postId]: true }));
    try {
      const comment = await api.post(`/marketplace/feed/${postId}/comments`, { content: text });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments: [...(p.comments || []), comment] } : p,
        ),
      );
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Commentaire impossible.');
      return false;
    } finally {
      setCommentBusy((b) => ({ ...b, [postId]: false }));
    }
  }, [user?.id, router, loginHref]);

  const handleShare = useCallback(async (postId: string) => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}#post-${postId}` : '';
    // Partage natif mobile (WhatsApp, SMS, etc.) si disponible
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Publication de ${authorLabel} sur EventMaster`,
          text: `Découvrez cette publication de ${authorLabel} sur EventMaster`,
          url,
        });
        return;
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    // Repli presse-papier
    if (typeof navigator !== 'undefined' && navigator.clipboard && url) {
      try {
        await navigator.clipboard.writeText(url);
        setCopiedPostId(postId);
        setTimeout(() => setCopiedPostId(null), 2500);
      } catch {
        // Fallback silencieux
      }
    }
  }, [authorLabel]);

  const openLightbox = useCallback((urls: string[], index: number) => {
    setLightbox({ urls, index });
  }, []);

  const myLike = likeKey(user?.id);
  const isVenue = scope.kind === 'venue';

  return (
    <div className={cn('space-y-6', className)}>
      {!user ? (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-primary/20 bg-primary/5 text-xs text-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <span>Connectez-vous pour aimer et commenter les publications de {authorLabel}.</span>
          </div>
          <Link
            href={loginHref}
            className="shrink-0 px-3 py-1 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-95 transition"
          >
            Connexion
          </Link>
        </div>
      ) : null}

      {error ? (
        <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 text-xs font-medium" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-6" role="status" aria-label="Chargement des publications">
          {[...Array(2)].map((_, i) => (
            <article
              key={i}
              className="rounded-xl sm:rounded-2xl border border-border/80 bg-surface shadow-xs p-2 sm:p-2.5 space-y-2.5 animate-pulse"
            >
              <div className="relative w-full aspect-[4/5] sm:aspect-[4/5] md:aspect-[3/4] max-h-[620px] rounded-lg sm:rounded-xl overflow-hidden bg-slate-900/90 dark:bg-slate-950 flex flex-col justify-between p-3.5 sm:p-4">
                <div className="flex items-center gap-2 p-1 pr-3 rounded-full bg-white/10 w-fit">
                  <div className="w-8 h-8 rounded-full bg-white/20" />
                  <div className="space-y-1">
                    <div className="h-3 w-20 bg-white/25 rounded" />
                    <div className="h-2 w-12 bg-white/15 rounded" />
                  </div>
                </div>
                <div className="absolute right-3 bottom-14 sm:bottom-16 flex flex-col items-center gap-2.5">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-sm" />
                  ))}
                </div>
                <div className="space-y-1.5 max-w-[70%]">
                  <div className="h-3.5 w-full bg-white/25 rounded" />
                  <div className="h-3 w-3/4 bg-white/15 rounded" />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-14 px-4 space-y-2 rounded-xl sm:rounded-2xl border border-dashed border-border bg-surface/30">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            {isVenue ? <Building2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
          </div>
          <p className="text-sm font-bold text-foreground">Pas encore de publication</p>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Les photos, vidéos et annonces récentes de {authorLabel} apparaîtront directement ici.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <VenueActivityPostCard
              key={post.id}
              post={post}
              authorLabel={authorLabel}
              isVenue={isVenue}
              user={user}
              loginHref={loginHref}
              myLike={myLike}
              isLikeBusy={likeBusy[post.id]}
              isCommentBusy={commentBusy[post.id]}
              isCopied={copiedPostId === post.id}
              onToggleLike={toggleLike}
              onSubmitComment={submitComment}
              onShare={handleShare}
              onOpenLightbox={openLightbox}
            />
          ))}
        </div>
      )}

      {nextCursor ? (
        <button
          type="button"
          onClick={() => void load(nextCursor)}
          disabled={loadingMore}
          className="w-full min-h-11 rounded-2xl border border-border/80 bg-surface text-xs sm:text-sm font-semibold text-foreground hover:bg-surface-muted transition disabled:opacity-50 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          {loadingMore ? 'Chargement…' : 'Voir plus de publications'}
        </button>
      ) : null}

      {/* Lightbox plein écran accessible */}
      {lightbox && (
        <ImageLightbox
          urls={lightbox.urls}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
          title={authorLabel}
        />
      )}
    </div>
  );
}
