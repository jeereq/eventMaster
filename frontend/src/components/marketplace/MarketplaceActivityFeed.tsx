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
  Share2, Check,
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
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSend();
          }}
          placeholder="Écrire un message ou poser une question…"
          className="w-full min-h-11 pl-3.5 pr-10 rounded-xl border border-border bg-surface text-base sm:text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
          aria-label={`Commenter la publication de ${authorLabel}`}
        />
      </div>
      <button
        type="button"
        onClick={() => void handleSend()}
        disabled={busy || !draft.trim()}
        className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90 transition shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-label="Publier le commentaire"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      </button>
    </div>
  );
}

/** Carte de publication mémoïsée */
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
  const likes = Array.isArray(post.likes) ? post.likes : [];
  const liked = Boolean(myLike && likes.includes(myLike));
  const media = (post.mediaUrls || []) as MarketplaceFeedMedia[];
  const images = media
    .filter((m) => m.type !== 'VIDEO' && !isVideoUrl(m.url))
    .map((m) => m.url);
  const commentCount = post.comments?.length ?? 0;
  const visibleComments = commentsExpanded ? post.comments ?? [] : (post.comments ?? []).slice(0, 2);

  return (
    <article
      id={`post-${post.id}`}
      className="group rounded-3xl border border-border/90 bg-surface p-4 sm:p-6 space-y-4 shadow-sm hover:shadow-md transition-all duration-200 [content-visibility:auto] [contain-intrinsic-size:0_380px]"
    >
      {/* En-tête de la publication */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary shrink-0 flex items-center justify-center border border-primary/20 shadow-2xs">
            {isVenue ? <Building2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground truncate">{authorLabel}</p>
            <p className="text-xs text-muted">{formatRelativeDate(post.createdAt)}</p>
          </div>
        </div>

        {/* Bouton Partager */}
        <button
          type="button"
          onClick={() => onShare(post.id)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border/80 bg-surface text-xs font-medium text-muted hover:text-foreground hover:bg-surface-muted transition"
          title="Copier le lien"
        >
          {isCopied ? (
            <>
              <Check className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary text-[11px]">Copié !</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span className="text-[11px]">Partager</span>
            </>
          )}
        </button>
      </div>

      {/* Contenu */}
      {post.content ? (
        <p className="text-sm sm:text-[15px] text-foreground/90 whitespace-pre-line leading-relaxed font-normal break-words">
          {post.content}
        </p>
      ) : null}

      {/* Médias */}
      <PostMediaGrid
        media={media}
        onOpenImage={(url) => {
          const idx = images.indexOf(url);
          if (idx >= 0) onOpenLightbox(images, idx);
        }}
      />

      {/* Barre d'actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-border/50 text-xs text-muted">
        <button
          type="button"
          onClick={() => onToggleLike(post.id)}
          disabled={isLikeBusy}
          className={cn(
            'inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-xl font-semibold transition active:scale-95 touch-manipulation',
            liked
              ? 'text-rose-600 bg-rose-500/10 border border-rose-500/20'
              : 'text-muted hover:text-foreground hover:bg-surface-muted border border-transparent',
          )}
          aria-pressed={liked}
        >
          <Heart className={cn('w-4 h-4 transition-transform', liked && 'fill-current scale-110')} />
          <span>{post.likeCount ?? likes.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setCommentsExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-xl font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{commentCount}</span>
        </button>
      </div>

      {/* Commentaires */}
      {commentCount > 0 && (
        <div className="space-y-2.5 pt-1">
          <ul className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {visibleComments.map((c) => (
              <li
                key={c.id}
                className="text-xs rounded-2xl border border-border/70 bg-surface-muted/40 p-3 space-y-1"
              >
                <div className="flex justify-between items-center gap-2">
                  <span className="font-bold text-foreground">{c.authorName}</span>
                  <span className="text-[11px] text-muted shrink-0">{formatRelativeDate(c.createdAt)}</span>
                </div>
                <p className="text-foreground/90 whitespace-pre-line leading-relaxed">{c.content}</p>
              </li>
            ))}
          </ul>

          {commentCount > 2 && (
            <button
              type="button"
              onClick={() => setCommentsExpanded((prev) => !prev)}
              className="w-full min-h-10 rounded-lg text-xs font-semibold text-primary hover:underline transition text-left px-1 flex items-center"
            >
              {commentsExpanded ? 'Masquer les commentaires anciens' : `Afficher les ${commentCount - 2} autres commentaires`}
            </button>
          )}
        </div>
      )}

      {/* Saisie commentaire */}
      {!user ? (
        <div className="pt-2">
          <Link
            href={loginHref}
            className="w-full inline-flex items-center justify-center min-h-11 px-4 rounded-xl border border-dashed border-border bg-surface-muted/30 text-xs font-semibold text-primary hover:bg-surface-muted transition"
          >
            Connectez-vous pour laisser un commentaire
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
        <div className="flex flex-col items-center justify-center py-12 space-y-2">
          <Loader2 className="w-7 h-7 text-primary animate-spin" aria-hidden />
          <span className="text-xs text-muted">Chargement des publications…</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-14 px-4 space-y-2 rounded-3xl border border-dashed border-border bg-surface/30">
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
          className="w-full min-h-11 rounded-2xl border border-border/80 bg-surface text-xs sm:text-sm font-semibold text-foreground hover:bg-surface-muted transition disabled:opacity-50 shadow-2xs"
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
