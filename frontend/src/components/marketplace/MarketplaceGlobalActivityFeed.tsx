'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  type MarketplaceFeedComment,
  type MarketplaceFeedMedia,
  type MarketplaceFeedPost,
} from '@/components/marketplace/MarketplaceActivityFeed';
import { clientLoginHref } from '@/lib/safeAppPath';
import { cn } from '@/lib/cn';
import { isVideoUrl } from '@/lib/marketplace';
import {
  Building2, Heart, Loader2, MessageCircle, Rss, Send, Sparkles,
  ChevronLeft, ChevronRight, X,
} from 'lucide-react';

export type GlobalFeedKind = 'all' | 'venue' | 'vendor';

type FeedAuthor = {
  kind: 'venue' | 'vendor';
  name: string;
  slug: string;
  city?: string | null;
  coverUrl?: string | null;
  href: string | null;
};

type GlobalFeedPost = MarketplaceFeedPost & {
  author: FeedAuthor | null;
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

function authorHref(author: FeedAuthor | null, linkBase: 'public' | 'dashboard') {
  if (!author?.href) return null;
  if (linkBase === 'dashboard') {
    return author.href.replace(/^\/marketplace\//, '/dashboard/catalogue/');
  }
  return author.href;
}

export default function MarketplaceGlobalActivityFeed({
  linkBase = 'public',
  className,
  compactLoginHint = false,
}: {
  linkBase?: 'public' | 'dashboard';
  className?: string;
  compactLoginHint?: boolean;
}) {
  const { user } = useAuth();
  const [kind, setKind] = useState<GlobalFeedKind>('all');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [posts, setPosts] = useState<GlobalFeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentBusy, setCommentBusy] = useState<Record<string, boolean>>({});
  const [likeBusy, setLikeBusy] = useState<Record<string, boolean>>({});
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);

  const loginHref =
    typeof window !== 'undefined'
      ? clientLoginHref(`${window.location.pathname}${window.location.search}`)
      : clientLoginHref('/activite');

  const load = useCallback(async (opts?: { cursor?: string | null; kind?: GlobalFeedKind; q?: string }) => {
    const cursor = opts?.cursor;
    const activeKind = opts?.kind ?? kind;
    const activeQ = opts?.q ?? search;
    if (cursor) setLoadingMore(true);
    else setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (activeKind !== 'all') params.set('kind', activeKind);
      if (activeQ.trim()) params.set('q', activeQ.trim());
      if (cursor) params.set('cursor', cursor);
      const qs = params.toString() ? `?${params}` : '';
      const data = await api.get(`/public/activity${qs}`);
      const page: GlobalFeedPost[] = Array.isArray(data?.posts) ? data.posts : [];
      setPosts((prev) => (cursor ? [...prev, ...page] : page));
      setNextCursor(data?.nextCursor || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger l’activité.');
      if (!cursor) setPosts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [kind, search]);

  useEffect(() => {
    void load({ kind, q: search });
  }, [kind, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleLike = async (postId: string) => {
    if (!user?.id) {
      window.location.href = loginHref;
      return;
    }
    setLikeBusy((b) => ({ ...b, [postId]: true }));
    try {
      const updated = await api.post(`/marketplace/feed/${postId}/like`, {});
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...updated, author: p.author } : p)));
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
      const comment: MarketplaceFeedComment = await api.post(`/marketplace/feed/${postId}/comments`, {
        content: text,
      });
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

  const kindTabs: Array<{ id: GlobalFeedKind; label: string }> = [
    { id: 'all', label: 'Tout' },
    { id: 'venue', label: 'Salles' },
    { id: 'vendor', label: 'Prestataires' },
  ];

  return (
    <div className={cn('space-y-5', className)}>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="inline-flex gap-0.5 p-0.5 rounded-[var(--radius-button)] border border-border bg-surface-muted">
          {kindTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setKind(tab.id)}
              className={cn(
                'min-h-11 px-3.5 rounded-[var(--radius-button)] text-xs font-semibold transition',
                kind === tab.id
                  ? 'bg-surface text-foreground shadow-sm'
                  : 'text-muted hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <form
          className="flex-1 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(q.trim());
          }}
        >
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher une salle, un prestataire…"
            className="flex-1 min-h-11 px-3 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            aria-label="Rechercher dans les publications"
          />
          <button
            type="submit"
            className="min-h-11 px-4 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition"
          >
            Chercher
          </button>
        </form>
      </div>

      {!user && !compactLoginHint ? (
        <p className="text-xs text-muted rounded-xl border border-border bg-surface-muted/60 px-3 py-2.5">
          <Link href={loginHref} className="font-semibold text-primary hover:underline">
            Connectez-vous
          </Link>{' '}
          pour aimer ou commenter.
        </p>
      ) : null}

      {error ? <p className="text-sm text-rose-600" role="alert">{error}</p> : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 text-primary animate-spin" aria-hidden />
          <span className="sr-only">Chargement…</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <Rss className="w-8 h-8 text-muted mx-auto" aria-hidden />
          <p className="text-sm font-semibold text-foreground">Aucune publication pour le moment</p>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Les salles et prestataires pourront partager ici leurs activités dès qu’ils publient.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => {
            const likes = Array.isArray(post.likes) ? post.likes : [];
            const liked = Boolean(myLike && likes.includes(myLike));
            const media = (post.mediaUrls || []) as MarketplaceFeedMedia[];
            const images = media
              .filter((m) => m.type !== 'VIDEO' && !isVideoUrl(m.url))
              .map((m) => m.url);
            const author = post.author;
            const href = authorHref(author, linkBase);
            const AuthorIcon = author?.kind === 'vendor' ? Sparkles : Building2;

            return (
              <article
                key={post.id}
                className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-3 shadow-[0_8px_30px_rgba(15,23,42,0.04)]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl overflow-hidden border border-border bg-surface-muted shrink-0 flex items-center justify-center">
                    {author?.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={author.coverUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <AuthorIcon className="w-5 h-5 text-primary" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {href ? (
                      <Link
                        href={href}
                        className="text-sm font-semibold text-foreground hover:text-primary transition truncate block"
                      >
                        {author?.name}
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold text-foreground truncate">
                        {author?.name || 'Publication'}
                      </p>
                    )}
                    <p className="text-[11px] text-muted">
                      {author?.kind === 'vendor' ? 'Prestataire' : 'Salle'}
                      {author?.city ? ` · ${author.city}` : ''}
                      {' · '}
                      {formatRelativeDate(post.createdAt)}
                    </p>
                  </div>
                </div>

                {post.content ? (
                  <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                    {post.content}
                  </p>
                ) : null}

                {media.length > 0 && (
                  <div
                    className={cn(
                      'grid gap-1.5 rounded-xl overflow-hidden border border-border',
                      media.length === 1 ? 'grid-cols-1' : media.length === 2 ? 'grid-cols-2' : 'grid-cols-3',
                    )}
                  >
                    {media.map((m, i) => {
                      const video = m.type === 'VIDEO' || isVideoUrl(m.url);
                      return (
                        <div key={`${m.url}-${i}`} className="relative aspect-video bg-black max-h-72">
                          {video ? (
                            <video src={m.url} controls className="w-full h-full object-contain" />
                          ) : (
                            <button
                              type="button"
                              className="w-full h-full"
                              onClick={() => {
                                const idx = images.indexOf(m.url);
                                if (idx >= 0) setLightbox({ urls: images, index: idx });
                              }}
                              aria-label={`Agrandir l’image ${i + 1}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
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
                  {href ? (
                    <Link href={href} className="ml-auto text-xs font-semibold text-primary hover:underline">
                      Voir la fiche
                    </Link>
                  ) : null}
                </div>

                {(post.comments?.length ?? 0) > 0 && (
                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {post.comments.map((c) => (
                      <li
                        key={c.id}
                        className="text-xs rounded-xl border border-border bg-surface-muted/50 px-3 py-2"
                      >
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
                    className="flex-1 min-h-11 px-3 rounded-xl border border-border bg-surface text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/40"
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
          onClick={() => void load({ cursor: nextCursor })}
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
                      lb ? { ...lb, index: (lb.index - 1 + lb.urls.length) % lb.urls.length } : lb,
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
