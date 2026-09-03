'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { uploadMarketplaceMedia } from '@/lib/cloudinaryUpload';
import { clientLoginHref } from '@/lib/safeAppPath';
import { cn } from '@/lib/cn';
import { isVideoUrl } from '@/lib/marketplace';
import {
  Heart, MessageCircle, Send, Trash2, Loader2, Image as ImageIcon,
  Video, X, ChevronLeft, ChevronRight, Plus,
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
    month: 'long',
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

/** Composer + liste pour le propriétaire. */
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
    <div className={cn('space-y-4', className)}>
      <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
        <label htmlFor="marketplace-activity-composer" className="sr-only">
          Nouvelle publication
        </label>
        <textarea
          id="marketplace-activity-composer"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder="Partagez une activité, une réalisation, une nouveauté…"
          className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y min-h-[5rem]"
        />
        {media.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {media.map((m, i) => (
              <div key={`${m.url}-${i}`} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border bg-surface-muted">
                {m.type === 'VIDEO' || isVideoUrl(m.url) ? (
                  <video src={m.url} className="w-full h-full object-cover" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => setMedia((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white"
                  aria-label="Retirer le média"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
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
            className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl border border-border text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Médias
          </button>
          <button
            type="button"
            onClick={() => void publish()}
            disabled={submitting || uploading || (!content.trim() && media.length === 0)}
            className="ml-auto inline-flex items-center gap-1.5 min-h-11 px-4 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Publier
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-600" role="alert">{error}</p> : null}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-10 space-y-1">
          <p className="text-sm font-semibold text-foreground">Aucune publication</p>
          <p className="text-xs text-muted">Vos activités apparaîtront sur la fiche publique.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <article key={post.id} className="rounded-2xl border border-border bg-surface p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{authorLabel}</p>
                  <p className="text-[11px] text-muted">{formatRelativeDate(post.createdAt)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(post.id)}
                  className="p-2 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-50 transition"
                  aria-label="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {post.content ? (
                <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{post.content}</p>
              ) : null}
              <PostMediaGrid media={post.mediaUrls || []} />
              <div className="flex items-center gap-4 text-xs text-muted pt-1">
                <span className="inline-flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5" /> {post.likeCount ?? post.likes?.length ?? 0}
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

/** Lecture publique + like/comment (auth). */
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
  const [posts, setPosts] = useState<MarketplaceFeedPost[]>(initialPosts || []);
  const [loading, setLoading] = useState(!initialPosts?.length);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentBusy, setCommentBusy] = useState<Record<string, boolean>>({});
  const [likeBusy, setLikeBusy] = useState<Record<string, boolean>>({});
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
      setError(err instanceof Error ? err.message : 'Impossible de charger l’activité.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [feedPath]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleLike = async (postId: string) => {
    if (!user?.id) {
      window.location.href = loginHref;
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
  };

  const submitComment = async (postId: string) => {
    if (!user?.id) {
      window.location.href = loginHref;
      return;
    }
    const text = (commentDrafts[postId] || '').trim();
    if (!text) return;
    setCommentBusy((b) => ({ ...b, [postId]: true }));
    try {
      const comment = await api.post(`/marketplace/feed/${postId}/comments`, { content: text });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments: [...(p.comments || []), comment] } : p,
        ),
      );
      setCommentDrafts((d) => ({ ...d, [postId]: '' }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Commentaire impossible.');
    } finally {
      setCommentBusy((b) => ({ ...b, [postId]: false }));
    }
  };

  const myLike = likeKey(user?.id);

  return (
    <div className={cn('space-y-4', className)}>
      {!user ? (
        <p className="text-xs text-muted rounded-xl border border-border bg-surface-muted/60 px-3 py-2.5">
          <Link href={loginHref} className="font-semibold text-primary hover:underline">
            Connectez-vous
          </Link>{' '}
          pour aimer ou commenter les publications.
        </p>
      ) : null}

      {error ? <p className="text-sm text-rose-600" role="alert">{error}</p> : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-primary animate-spin" aria-hidden />
          <span className="sr-only">Chargement de l’activité…</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 space-y-1">
          <p className="text-sm font-semibold text-foreground">Pas encore d’actualité</p>
          <p className="text-xs text-muted">Les publications de {authorLabel} apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {posts.map((post) => {
            const likes = Array.isArray(post.likes) ? post.likes : [];
            const liked = Boolean(myLike && likes.includes(myLike));
            const images = (post.mediaUrls || [])
              .filter((m) => m.type !== 'VIDEO' && !isVideoUrl(m.url))
              .map((m) => m.url);
            return (
              <article key={post.id} className="space-y-3 pb-5 border-b border-border/70 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-foreground">{authorLabel}</p>
                  <p className="text-[11px] text-muted">{formatRelativeDate(post.createdAt)}</p>
                </div>
                {post.content ? (
                  <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{post.content}</p>
                ) : null}
                <PostMediaGrid
                  media={post.mediaUrls || []}
                  onOpenImage={(url) => {
                    const idx = images.indexOf(url);
                    if (idx >= 0) setLightbox({ urls: images, index: idx });
                  }}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleLike(post.id)}
                    disabled={likeBusy[post.id]}
                    className={cn(
                      'inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl text-xs font-semibold transition',
                      liked
                        ? 'text-pink-600 bg-pink-500/10'
                        : 'text-muted hover:text-foreground hover:bg-surface-muted',
                    )}
                    aria-pressed={liked}
                  >
                    <Heart className={cn('w-4 h-4', liked && 'fill-current')} />
                    {post.likeCount ?? likes.length}
                  </button>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted px-2">
                    <MessageCircle className="w-4 h-4" />
                    {post.comments?.length ?? 0}
                  </span>
                </div>

                {(post.comments?.length ?? 0) > 0 && (
                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {post.comments.map((c) => (
                      <li key={c.id} className="text-xs rounded-xl border border-border bg-surface-muted/50 px-3 py-2">
                        <div className="flex justify-between gap-2 mb-0.5">
                          <span className="font-semibold text-foreground">{c.authorName}</span>
                          <span className="text-muted shrink-0">{formatRelativeDate(c.createdAt)}</span>
                        </div>
                        <p className="text-muted whitespace-pre-line">{c.content}</p>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex gap-2 items-stretch">
                  <input
                    type="text"
                    value={commentDrafts[post.id] || ''}
                    onChange={(e) => setCommentDrafts((d) => ({ ...d, [post.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void submitComment(post.id);
                    }}
                    placeholder={user ? 'Écrire un commentaire…' : 'Connectez-vous pour commenter'}
                    disabled={!user}
                    className="flex-1 min-h-11 px-3 rounded-xl border border-border bg-surface text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
                    aria-label="Commentaire"
                  />
                  <button
                    type="button"
                    onClick={() => void submitComment(post.id)}
                    disabled={!user || commentBusy[post.id] || !(commentDrafts[post.id] || '').trim()}
                    className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl bg-primary text-white disabled:opacity-50"
                    aria-label="Publier le commentaire"
                  >
                    {commentBusy[post.id] ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {nextCursor ? (
        <button
          type="button"
          onClick={() => void load(nextCursor)}
          disabled={loadingMore}
          className="w-full min-h-11 rounded-xl border border-border text-sm font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition disabled:opacity-50"
        >
          {loadingMore ? 'Chargement…' : 'Voir plus'}
        </button>
      ) : null}

      {lightbox && (
        <div
          className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Visionneuse"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-4xl w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.urls[lightbox.index]}
              alt=""
              className="max-h-[85vh] max-w-full object-contain rounded-lg"
            />
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute top-0 right-0 p-2.5 min-h-11 min-w-11 bg-black/60 text-white rounded-full"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
            {lightbox.urls.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-0 p-3 min-h-11 min-w-11 bg-black/50 text-white rounded-full"
                  aria-label="Précédente"
                  onClick={() =>
                    setLightbox((lb) =>
                      lb
                        ? { ...lb, index: (lb.index - 1 + lb.urls.length) % lb.urls.length }
                        : lb,
                    )
                  }
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  className="absolute right-0 p-3 min-h-11 min-w-11 bg-black/50 text-white rounded-full"
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
    </div>
  );
}

function PostMediaGrid({
  media,
  onOpenImage,
}: {
  media: MarketplaceFeedMedia[];
  onOpenImage?: (url: string) => void;
}) {
  if (!media.length) return null;
  return (
    <div
      className={cn(
        'grid gap-1.5 rounded-xl overflow-hidden border border-border',
        media.length === 1 ? 'grid-cols-1' : media.length === 2 ? 'grid-cols-2' : 'grid-cols-3',
      )}
    >
      {media.map((m, i) => {
        const video = m.type === 'VIDEO' || isVideoUrl(m.url);
        return (
          <div key={`${m.url}-${i}`} className="relative aspect-video bg-black max-h-64">
            {video ? (
              <video src={m.url} controls className="w-full h-full object-contain" />
            ) : (
              <button
                type="button"
                className="w-full h-full"
                onClick={() => onOpenImage?.(m.url)}
                aria-label={`Agrandir l’image ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" />
              </button>
            )}
            <span className="sr-only">{video ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}</span>
          </div>
        );
      })}
    </div>
  );
}
