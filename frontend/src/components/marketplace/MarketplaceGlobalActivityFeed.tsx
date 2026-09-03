'use client';

import React, { useEffect, useState } from 'react';
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
import { isVideoUrl } from '@/lib/marketplace';
import {
  Building2, Heart, Loader2, MessageCircle, Rss, Send, Sparkles,
  ChevronLeft, ChevronRight, X, MapPin, Share2, Check, ArrowUpRight, Search,
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
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentBusy, setCommentBusy] = useState<Record<string, boolean>>({});
  const [likeBusy, setLikeBusy] = useState<Record<string, boolean>>({});
  const [commentsExpanded, setCommentsExpanded] = useState<Record<string, boolean>>({});
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
          setError(err instanceof Error ? err.message : 'Impossible de charger l’activité.');
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

  const toggleLike = async (postId: string) => {
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
  };

  const submitComment = async (postId: string) => {
    if (!user?.id) {
      router.push(loginHref);
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
      setCommentsExpanded((prev) => ({ ...prev, [postId]: true }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Commentaire impossible.');
    } finally {
      setCommentBusy((b) => ({ ...b, [postId]: false }));
    }
  };

  const handleShare = async (postId: string) => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/activite#post-${postId}` : '';
    if (navigator.clipboard && url) {
      try {
        await navigator.clipboard.writeText(url);
        setCopiedPostId(postId);
        setTimeout(() => setCopiedPostId(null), 2500);
      } catch {
        // Fallback
      }
    }
  };

  const myLike = likeKey(user?.id);

  const kindTabs: Array<{ id: GlobalFeedKind; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'all', label: 'Toutes les publications', icon: Rss },
    { id: 'venue', label: 'Salles & Espaces', icon: Building2 },
    { id: 'vendor', label: 'Prestataires & Métiers', icon: Sparkles },
  ];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Barre d'outils / Filtres & Recherche */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between bg-surface/80 dark:bg-slate-900/80 backdrop-blur-md p-2 sm:p-2.5 rounded-2xl border border-border/80 shadow-xs">
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
                  'inline-flex items-center gap-2 min-h-10 px-3.5 rounded-lg text-xs font-semibold transition shrink-0',
                  active
                    ? 'bg-surface text-primary shadow-xs border border-primary/20 font-bold'
                    : 'text-muted hover:text-foreground hover:bg-surface/50',
                )}
              >
                <Icon className={cn('w-3.5 h-3.5', active ? 'text-primary' : 'text-muted')} />
                <span>{tab.label}</span>
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
              className="w-full min-h-10 pl-9 pr-16 rounded-xl border border-border bg-surface text-xs sm:text-sm text-foreground placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-primary/40 transition"
              aria-label="Rechercher dans les publications"
            />
            {q.trim() && (
              <button
                type="button"
                onClick={() => {
                  setQ('');
                  setSearch('');
                }}
                className="absolute right-10 p-1 text-muted hover:text-foreground rounded-md"
                title="Effacer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition"
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
          <p className="text-xs text-muted font-medium">Chargement des actualités…</p>
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
              : 'Les salles et prestataires certifiés partageront ici leurs photos, vidéos et actualités.'}
          </p>
          {search.trim() && (
            <button
              type="button"
              onClick={() => {
                setQ('');
                setSearch('');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-muted transition"
            >
              Réinitialiser la recherche
            </button>
          )}
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
            const isVendor = author?.kind === 'vendor';
            const commentCount = post.comments?.length ?? 0;
            const isExpanded = Boolean(commentsExpanded[post.id]);
            const visibleComments = isExpanded ? post.comments ?? [] : (post.comments ?? []).slice(0, 2);
            const isCopied = copiedPostId === post.id;

            return (
              <article
                key={post.id}
                id={`post-${post.id}`}
                className="group rounded-3xl border border-border/90 bg-surface p-5 sm:p-6 space-y-4 shadow-sm hover:shadow-md transition-all duration-200"
              >
                {/* En-tête de la publication */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Avatar Profil */}
                    <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-border/80 bg-surface-muted shrink-0 flex items-center justify-center shadow-xs">
                      {author?.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={author.coverUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className={cn('w-full h-full flex items-center justify-center', isVendor ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-primary/10 text-primary')}>
                          {isVendor ? <Sparkles className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                        </div>
                      )}
                    </div>

                    {/* Détails Auteur */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {href ? (
                          <Link
                            href={href}
                            className="text-sm sm:text-[15px] font-bold text-foreground hover:text-primary transition truncate"
                          >
                            {author?.name || 'Partenaire EventMaster'}
                          </Link>
                        ) : (
                          <span className="text-sm sm:text-[15px] font-bold text-foreground truncate">
                            {author?.name || 'Partenaire EventMaster'}
                          </span>
                        )}

                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                            isVendor
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                              : 'bg-primary/10 text-primary border-primary/20',
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
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-surface-muted/50 text-xs font-semibold text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition group-hover:border-primary/40 shadow-2xs"
                      title="Consulter la fiche détaillée"
                    >
                      <span className="hidden sm:inline">Voir la fiche</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>

                {/* Contenu textuel */}
                {post.content ? (
                  <p className="text-sm sm:text-[15px] text-foreground/90 whitespace-pre-line leading-relaxed font-normal">
                    {post.content}
                  </p>
                ) : null}

                {/* Galerie Médias moderne */}
                {media.length > 0 && (
                  <div className="rounded-2xl overflow-hidden border border-border/60 bg-surface-muted/40">
                    <div
                      className={cn(
                        'grid gap-1.5',
                        media.length === 1 && 'grid-cols-1',
                        media.length === 2 && 'grid-cols-2 aspect-2/1 sm:aspect-16/9',
                        media.length === 3 && 'grid-cols-3 aspect-2/1 sm:aspect-16/9',
                        media.length >= 4 && 'grid-cols-2 sm:grid-cols-2 aspect-square sm:aspect-16/10',
                      )}
                    >
                      {media.slice(0, 4).map((m, i) => {
                        const video = m.type === 'VIDEO' || isVideoUrl(m.url);
                        const isFourthAndMore = i === 3 && media.length > 4;
                        const extraCount = media.length - 4;

                        return (
                          <div
                            key={`${m.url}-${i}`}
                            className={cn(
                              'relative overflow-hidden group/media bg-slate-950/10 dark:bg-slate-900',
                              media.length === 1 ? 'aspect-16/10 max-h-[460px]' : 'h-full w-full',
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
                                className="w-full h-full text-left relative focus:outline-hidden"
                                onClick={() => {
                                  const idx = images.indexOf(m.url);
                                  if (idx >= 0) setLightbox({ urls: images, index: idx });
                                }}
                                aria-label={`Agrandir l’image ${i + 1}`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={m.url}
                                  alt=""
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover/media:scale-105"
                                  loading="lazy"
                                />

                                {isFourthAndMore && (
                                  <div className="absolute inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center text-white text-lg font-bold">
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
                      onClick={() => void toggleLike(post.id)}
                      disabled={likeBusy[post.id]}
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

                    {/* Commentaires Toggle */}
                    <button
                      type="button"
                      onClick={() =>
                        setCommentsExpanded((prev) => ({ ...prev, [post.id]: !Boolean(prev[post.id]) }))
                      }
                      className="inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-xl font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition border border-transparent"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{commentCount}</span>
                    </button>
                  </div>

                  {/* Partage */}
                  <button
                    type="button"
                    onClick={() => void handleShare(post.id)}
                    className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition"
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
                        onClick={() =>
                          setCommentsExpanded((prev) => ({ ...prev, [post.id]: !Boolean(prev[post.id]) }))
                        }
                        className="w-full min-h-8 rounded-lg text-xs font-semibold text-primary hover:underline transition text-left px-1"
                      >
                        {isExpanded ? 'Masquer les commentaires anciens' : `Afficher les ${commentCount - 2} autres commentaires`}
                      </button>
                    )}
                  </div>
                )}

                {/* Formulaire de commentaire */}
                {!user ? (
                  <div className="pt-2">
                    <Link
                      href={loginHref}
                      className="w-full inline-flex items-center justify-center min-h-10 px-4 rounded-xl border border-dashed border-border bg-surface-muted/30 text-xs font-semibold text-primary hover:bg-surface-muted transition"
                    >
                      Connectez-vous pour laisser un commentaire
                    </Link>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center pt-1">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={commentDrafts[post.id] || ''}
                        onChange={(e) => setCommentDrafts((d) => ({ ...d, [post.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void submitComment(post.id);
                        }}
                        placeholder="Écrire un message ou poser une question…"
                        className="w-full min-h-10 pl-3.5 pr-10 rounded-xl border border-border bg-surface text-xs sm:text-sm text-foreground placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-primary/40 transition"
                        aria-label="Commentaire"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void submitComment(post.id)}
                      disabled={commentBusy[post.id] || !(commentDrafts[post.id] || '').trim()}
                      className="min-h-10 min-w-10 inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90 transition shadow-xs"
                      aria-label="Publier le commentaire"
                    >
                      {commentBusy[post.id] ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Pagination / Voir plus */}
      {nextCursor ? (
        <button
          type="button"
          onClick={() => void loadMore(nextCursor)}
          disabled={loadingMore}
          className="w-full min-h-12 rounded-2xl border border-border/80 bg-surface text-sm font-semibold text-foreground hover:bg-surface-muted transition disabled:opacity-50 shadow-xs"
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

      {/* Lightbox photo plein écran */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Visionneuse photo"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-5xl w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.urls[lightbox.index]}
              alt=""
              className="max-h-[85vh] max-w-full object-contain rounded-2xl shadow-2xl"
            />

            {/* Bouton Fermer */}
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition"
              aria-label="Fermer"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Compteur */}
            <div className="absolute -top-12 left-0 text-white/80 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10">
              {lightbox.index + 1} / {lightbox.urls.length}
            </div>

            {/* Navigation Précédent / Suivant */}
            {lightbox.urls.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox((prev) =>
                      prev ? { ...prev, index: (prev.index - 1 + prev.urls.length) % prev.urls.length } : null,
                    );
                  }}
                  className="absolute left-2 sm:-left-12 p-3 text-white rounded-full bg-black/60 hover:bg-black/90 transition"
                  aria-label="Photo précédente"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox((prev) =>
                      prev ? { ...prev, index: (prev.index + 1) % prev.urls.length } : null,
                    );
                  }}
                  className="absolute right-2 sm:-right-12 p-3 text-white rounded-full bg-black/60 hover:bg-black/90 transition"
                  aria-label="Photo suivante"
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
