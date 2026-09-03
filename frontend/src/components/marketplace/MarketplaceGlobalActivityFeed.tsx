'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  type MarketplaceFeedComment,
  type MarketplaceFeedMedia,
  type MarketplaceFeedPost,
} from '@/components/marketplace/MarketplaceActivityFeed';
import { clientLoginHref } from '@/lib/safeAppPath';
import { cn } from '@/lib/cn';
import { isVideoUrl, sizedMediaUrl } from '@/lib/marketplace';
import ImageLightbox from '@/components/marketplace/ImageLightbox';
import {
  Building2, Heart, Loader2, MessageCircle, Rss, Send, Sparkles,
  X, MapPin, Share2, Check, ArrowUpRight, Search,
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
    month: 'short',
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

/** Champ commentaire isolé : la frappe ne provoque aucun re-rendu du flux */
function PostCommentBox({
  postId,
  onSubmit,
  busy,
  authorName,
}: {
  postId: string;
  onSubmit: (postId: string, text: string) => Promise<boolean>;
  busy?: boolean;
  authorName?: string;
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
          aria-label={`Commenter la publication de ${authorName || 'ce partenaire'}`}
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

/** Carte de publication mémoïsée avec containment CSS pour scroll fluide */
const GlobalFeedPostCard = React.memo(function GlobalFeedPostCard({
  post,
  user,
  loginHref,
  myLike,
  isLikeBusy,
  isCommentBusy,
  isCopied,
  linkBase,
  onToggleLike,
  onSubmitComment,
  onShare,
  onOpenLightbox,
}: {
  post: GlobalFeedPost;
  user: unknown;
  loginHref: string;
  myLike: string;
  isLikeBusy?: boolean;
  isCommentBusy?: boolean;
  isCopied?: boolean;
  linkBase: 'public' | 'dashboard';
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
  const author = post.author;
  const href = authorHref(author, linkBase);
  const isVendor = author?.kind === 'vendor';
  const commentCount = post.comments?.length ?? 0;
  const visibleComments = commentsExpanded ? post.comments ?? [] : (post.comments ?? []).slice(0, 2);

  return (
    <article
      id={`post-${post.id}`}
      className="group rounded-3xl border border-border/90 bg-surface p-4 sm:p-6 space-y-4 shadow-sm hover:shadow-md transition-all duration-200 [content-visibility:auto] [contain-intrinsic-size:0_380px]"
    >
      {/* En-tête de la publication */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          {/* Avatar Profil */}
          <div
            className={cn(
              'relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl overflow-hidden border shrink-0 flex items-center justify-center shadow-xs transition',
              isVendor
                ? 'border-amber-500/30 ring-2 ring-amber-500/10 bg-amber-500/5'
                : 'border-primary/30 ring-2 ring-primary/10 bg-primary/5',
            )}
          >
            {author?.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sizedMediaUrl(author.coverUrl, 160)}
                alt={author.name ? `Logo ou photo de ${author.name}` : 'Photo de profil'}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className={cn('w-full h-full flex items-center justify-center', isVendor ? 'text-amber-600 dark:text-amber-400' : 'text-primary')}>
                {isVendor ? <Sparkles className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
              </div>
            )}
          </div>

          {/* Détails Auteur */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {href ? (
                <Link
                  href={href}
                  className="text-sm sm:text-[15px] font-bold text-foreground hover:text-primary transition truncate max-w-[170px] sm:max-w-xs"
                >
                  {author?.name || 'Partenaire EventMaster'}
                </Link>
              ) : (
                <span className="text-sm sm:text-[15px] font-bold text-foreground truncate max-w-[170px] sm:max-w-xs">
                  {author?.name || 'Partenaire EventMaster'}
                </span>
              )}

              <span
                className={cn(
                  'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0',
                  isVendor
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                    : 'bg-primary/10 text-primary border-primary/30',
                )}
              >
                {isVendor ? <Sparkles className="w-2.5 h-2.5" /> : <Building2 className="w-2.5 h-2.5" />}
                {isVendor ? 'Prestataire' : 'Salle'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted mt-0.5">
              {author?.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-muted/80" />
                  {author.city}
                </span>
              )}
              <span>·</span>
              <span>{formatRelativeDate(post.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Bouton Voir la fiche */}
        {href && (
          <Link
            href={href}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 min-h-10 min-w-10 sm:min-w-0 px-2 sm:px-3 py-1.5 rounded-xl border border-border/80 bg-surface-muted/50 text-xs font-semibold text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition group-hover:border-primary/40 shadow-2xs"
            title="Consulter la fiche détaillée"
          >
            <span className="hidden sm:inline">Voir la fiche</span>
            <ArrowUpRight className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </Link>
        )}
      </div>

      {/* Contenu textuel */}
      {post.content ? (
        <p className="text-sm sm:text-[15px] text-foreground/90 whitespace-pre-line leading-relaxed font-normal break-words">
          {post.content}
        </p>
      ) : null}

      {/* Galerie Médias moderne avec aspect-ratio fixe pour zéro CLS */}
      {media.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-border/60 bg-surface-muted/40">
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
                    <video
                      src={m.url}
                      controls
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <button
                      type="button"
                      className="w-full h-full text-left relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      onClick={() => {
                        const idx = images.indexOf(m.url);
                        if (idx >= 0) onOpenLightbox(images, idx);
                      }}
                      aria-label={`Agrandir l’image ${i + 1} de ${author?.name || 'la publication'}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sizedMediaUrl(m.url, 800)}
                        alt={`Photo ${i + 1} publiée par ${author?.name || 'un professionnel'}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover/media:scale-105"
                        loading="lazy"
                      />

                      {isFourthAndMore && (
                        <div className="absolute inset-0 bg-black/65 backdrop-blur-2xs flex items-center justify-center text-white text-lg font-bold">
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
      )}

      {/* Barre d'actions (Like, Commentaires, Partage) */}
      <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs text-muted">
        <div className="flex items-center gap-2">
          {/* Like */}
          <button
            type="button"
            onClick={() => onToggleLike(post.id)}
            disabled={isLikeBusy}
            className={cn(
              'inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-xl font-semibold transition active:scale-95 touch-manipulation',
              liked
                ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 shadow-2xs'
                : 'text-muted hover:text-rose-600 hover:bg-rose-500/5 border border-transparent',
            )}
            aria-pressed={liked}
          >
            <Heart className={cn('w-4 h-4 transition-transform', liked && 'fill-current scale-110')} />
            <span>{post.likeCount ?? likes.length}</span>
          </button>

          {/* Commentaires Toggle */}
          <button
            type="button"
            onClick={() => setCommentsExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-xl font-semibold text-muted hover:text-primary hover:bg-primary/5 transition border border-transparent"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{commentCount}</span>
          </button>
        </div>

        {/* Partage */}
        <button
          type="button"
          onClick={() => onShare(post.id)}
          className={cn(
            'inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl font-semibold transition',
            isCopied
              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 shadow-2xs'
              : 'text-muted hover:text-foreground hover:bg-surface-muted border border-transparent',
          )}
          title="Copier le lien ou partager"
        >
          {isCopied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">Copié !</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Partager</span>
            </>
          )}
        </button>
      </div>

      {/* Section Commentaires */}
      {commentCount > 0 && (
        <div className="space-y-2.5 pt-1">
          <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {visibleComments.map((c) => (
              <li
                key={c.id}
                className="text-xs rounded-2xl border border-border/80 bg-surface-muted/50 p-3 space-y-1 hover:border-border transition"
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

      {/* Formulaire de commentaire */}
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
        <PostCommentBox
          postId={post.id}
          onSubmit={onSubmitComment}
          busy={isCommentBusy}
          authorName={author?.name}
        />
      )}
    </article>
  );
});

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
  const router = useRouter();
  const [kind, setKind] = useState<GlobalFeedKind>('all');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [posts, setPosts] = useState<GlobalFeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [commentBusy, setCommentBusy] = useState<Record<string, boolean>>({});
  const [likeBusy, setLikeBusy] = useState<Record<string, boolean>>({});
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);

  const loginHref =
    typeof window !== 'undefined'
      ? clientLoginHref(`${window.location.pathname}${window.location.search}`)
      : clientLoginHref('/activite');

  useEffect(() => {
    let cancelled = false;
    const fetchFeed = async () => {
      setError('');
      try {
        const params = new URLSearchParams();
        if (kind !== 'all') params.set('kind', kind);
        if (search.trim()) params.set('q', search.trim());
        const qs = params.toString() ? `?${params}` : '';
        const data = await api.get(`/public/activity${qs}`);
        if (!cancelled) {
          const page: GlobalFeedPost[] = Array.isArray(data?.posts) ? data.posts : [];
          setPosts(page);
          setNextCursor(data?.nextCursor || null);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Impossible de charger les publications.');
          setPosts([]);
          setLoading(false);
        }
      }
    };
    void fetchFeed();
    return () => {
      cancelled = true;
    };
  }, [kind, search]);

  const loadMore = async (cursor: string) => {
    setLoadingMore(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (kind !== 'all') params.set('kind', kind);
      if (search.trim()) params.set('q', search.trim());
      params.set('cursor', cursor);
      const qs = params.toString() ? `?${params}` : '';
      const data = await api.get(`/public/activity${qs}`);
      const page: GlobalFeedPost[] = Array.isArray(data?.posts) ? data.posts : [];
      setPosts((prev) => [...prev, ...page]);
      setNextCursor(data?.nextCursor || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger plus de publications.');
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleLike = useCallback(async (postId: string) => {
    if (!user?.id) {
      router.push(loginHref);
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
  }, [user?.id, router, loginHref]);

  const submitComment = useCallback(async (postId: string, text: string): Promise<boolean> => {
    if (!user?.id) {
      router.push(loginHref);
      return false;
    }
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
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Commentaire impossible.');
      return false;
    } finally {
      setCommentBusy((b) => ({ ...b, [postId]: false }));
    }
  }, [user?.id, router, loginHref]);

  const handleShare = useCallback(async (postId: string) => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/activite#post-${postId}` : '';
    // Partage natif mobile (WhatsApp, SMS, etc.) si disponible
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Publication sur EventMaster',
          text: 'Découvrez cette réalisation sur EventMaster',
          url,
        });
        return;
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    // Repli sur le presse-papier
    if (typeof navigator !== 'undefined' && navigator.clipboard && url) {
      try {
        await navigator.clipboard.writeText(url);
        setCopiedPostId(postId);
        setTimeout(() => setCopiedPostId(null), 2500);
      } catch {
        // Fallback silencieux
      }
    }
  }, []);

  const openLightbox = useCallback((urls: string[], index: number) => {
    setLightbox({ urls, index });
  }, []);

  const myLike = likeKey(user?.id);

  const kindTabs: Array<{
    id: GlobalFeedKind;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'all', label: 'Toutes les publications', shortLabel: 'Toutes', icon: Rss },
    { id: 'venue', label: 'Salles & Espaces', shortLabel: 'Salles', icon: Building2 },
    { id: 'vendor', label: 'Prestataires & Métiers', shortLabel: 'Prestataires', icon: Sparkles },
  ];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Barre d'outils / Filtres & Recherche */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between bg-surface/90 backdrop-blur-md p-2 sm:p-2.5 rounded-2xl border border-border/80 shadow-xs">
        {/* Onglets Filtres */}
        <div className="inline-flex gap-1 p-1 rounded-xl bg-surface-muted/80 border border-border/50 max-w-full overflow-x-auto [scrollbar-width:none]">
          {kindTabs.map((tab) => {
            const Icon = tab.icon;
            const active = kind === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setKind(tab.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 sm:gap-2 min-h-10 px-3 sm:px-3.5 rounded-lg text-xs font-semibold transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  active
                    ? tab.id === 'vendor'
                      ? 'bg-surface text-amber-700 dark:text-amber-300 shadow-xs border border-amber-500/30 font-bold'
                      : tab.id === 'venue'
                      ? 'bg-surface text-emerald-700 dark:text-emerald-300 shadow-xs border border-emerald-500/30 font-bold'
                      : 'bg-surface text-primary shadow-xs border border-primary/25 font-bold'
                    : 'text-muted hover:text-foreground hover:bg-surface/50',
                )}
              >
                <Icon
                  className={cn(
                    'w-3.5 h-3.5',
                    active
                      ? tab.id === 'vendor'
                        ? 'text-amber-600 dark:text-amber-400'
                        : tab.id === 'venue'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-primary'
                      : 'text-muted',
                  )}
                />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Formulaire Recherche */}
        <form
          className="relative flex-1 md:max-w-xs"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(q.trim());
          }}
        >
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-muted absolute left-3.5 pointer-events-none" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un pro, ville…"
              className="w-full min-h-11 pl-9 pr-16 rounded-xl border border-border bg-surface text-base sm:text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              aria-label="Rechercher dans les publications"
            />
            {q.trim() && (
              <button
                type="button"
                onClick={() => {
                  setQ('');
                  setSearch('');
                }}
                className="absolute right-12 min-h-8 min-w-8 p-1.5 inline-flex items-center justify-center text-muted hover:text-foreground rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                title="Effacer la recherche"
                aria-label="Effacer la recherche"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 min-h-8 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Go
            </button>
          </div>
        </form>
      </div>

      {!user && !compactLoginHint ? (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-primary/20 bg-primary/5 text-xs sm:text-sm text-foreground">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <span>Rejoignez la communauté EventMaster pour aimer, commenter et échanger avec les professionnels.</span>
          </div>
          <Link
            href={loginHref}
            className="shrink-0 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-95 transition shadow-xs"
          >
            Se connecter
          </Link>
        </div>
      ) : null}

      {error ? (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm font-medium" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" aria-hidden />
          <p className="text-xs text-muted font-medium">Chargement des publications…</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-3xl border border-dashed border-border bg-surface/40 space-y-3 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-xs">
            <Rss className="w-6 h-6" aria-hidden />
          </div>
          <h3 className="text-base font-bold text-foreground">Aucune publication pour le moment</h3>
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            {search.trim()
              ? 'Aucun résultat ne correspond à votre recherche. Essayez d’autres mots-clés.'
              : 'Les salles et prestataires certifiés partageront ici leurs photos, vidéos et publications.'}
          </p>
          {search.trim() && (
            <button
              type="button"
              onClick={() => {
                setQ('');
                setSearch('');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Réinitialiser la recherche
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <GlobalFeedPostCard
              key={post.id}
              post={post}
              user={user}
              loginHref={loginHref}
              myLike={myLike}
              isLikeBusy={likeBusy[post.id]}
              isCommentBusy={commentBusy[post.id]}
              isCopied={copiedPostId === post.id}
              linkBase={linkBase}
              onToggleLike={toggleLike}
              onSubmitComment={submitComment}
              onShare={handleShare}
              onOpenLightbox={openLightbox}
            />
          ))}
        </div>
      )}

      {/* Pagination / Voir plus */}
      {nextCursor ? (
        <button
          type="button"
          onClick={() => void loadMore(nextCursor)}
          disabled={loadingMore}
          className="w-full min-h-12 rounded-2xl border border-border/80 bg-surface text-sm font-semibold text-foreground hover:bg-surface-muted transition disabled:opacity-50 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          {loadingMore ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Chargement des publications suivantes…
            </span>
          ) : (
            'Charger plus de publications'
          )}
        </button>
      ) : null}

      {/* Lightbox photo plein écran accessible */}
      {lightbox && (
        <ImageLightbox
          urls={lightbox.urls}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
          title="Fil des publications"
        />
      )}
    </div>
  );
}
