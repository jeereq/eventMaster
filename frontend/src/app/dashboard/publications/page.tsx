'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { uploadMarketplaceMedia } from '@/lib/cloudinaryUpload';
import { isVideoUrl, sizedMediaUrl } from '@/lib/marketplace';
import { cn } from '@/lib/cn';
import {
  PageHeader, Breadcrumbs, Alert, Button, EmptyState, Modal, ConfirmDialog,
} from '@/components/ui';
import MarketplaceGlobalActivityFeed from '@/components/marketplace/MarketplaceGlobalActivityFeed';
import {
  Building2, ChevronLeft, ChevronRight, Heart, Images, Loader2, MessageCircle,
  Play, Plus, Rss, Send, Sparkles, Trash2, X, Image as ImageIcon, ArrowRight,
} from 'lucide-react';

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 'Récemment';
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "À l'instant";
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  if (diffDays < 7) return `Il y a ${diffDays} j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

type DeskTab = 'grid' | 'create';

type FeedTarget = {
  id: string;
  kind: 'venue' | 'service';
  label: string;
  slug: string;
  city: string | null;
  isPublic: boolean;
  coverUrl: string | null;
  category?: string;
};

type MediaItem = { url: string; type: 'IMAGE' | 'VIDEO' };

type MyPost = {
  id: string;
  content: string | null;
  mediaUrls: MediaItem[];
  likeCount?: number;
  likes?: string[];
  comments?: unknown[];
  createdAt: string;
  author: {
    kind: string;
    name: string;
    href: string | null;
    coverUrl?: string | null;
  } | null;
};

function parseTab(raw: string | null): DeskTab {
  return raw === 'create' ? 'create' : 'grid';
}

function DashboardPublicationsPageInner() {
  const { access } = useAuth();
  const canPublish = Boolean(access?.canManageRooms);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTabState] = useState<DeskTab>(parseTab(searchParams.get('tab')));

  useEffect(() => {
    const next = parseTab(searchParams.get('tab'));
    if (!canPublish && next === 'create') {
      setTabState('grid');
      const params = new URLSearchParams(searchParams.toString());
      params.delete('tab');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      return;
    }
    setTabState(next);
  }, [searchParams, canPublish, pathname, router]);

  const setTab = (next: DeskTab) => {
    setTabState(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'grid') params.delete('tab');
    else params.set('tab', next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Réalisations"
        description={
          canPublish
            ? 'Fil des réalisations et créations de vos fiches.'
            : 'Photos et actualités des salles et prestataires.'
        }
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Réalisations', href: '/dashboard/publications' },
              { label: canPublish && tab === 'create' ? 'Créer' : 'Découvrir' },
            ]}
          />
        }
      />

      {canPublish ? (
        <div
          role="tablist"
          aria-label="Navigation des réalisations"
          className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-surface-muted p-1"
        >
          {[
            { id: 'grid' as const, label: 'Découvrir', icon: Rss },
            { id: 'create' as const, label: 'Créer', icon: Plus },
          ].map((item) => (
            <button
              key={item.id}
              id={`tab-publications-${item.id}`}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              aria-controls={`tabpanel-publications-${item.id}`}
              onClick={() => setTab(item.id)}
              className={cn(
                'inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition touch-manipulation active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                tab === item.id
                  ? 'bg-surface text-foreground shadow-2xs font-semibold'
                  : 'text-muted hover:bg-surface/70 hover:text-foreground',
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" aria-hidden />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div
        role="tabpanel"
        id={`tabpanel-publications-${tab}`}
        aria-labelledby={`tab-publications-${tab}`}
        className="outline-none"
        tabIndex={0}
      >
        {tab === 'grid' ? (
          <PublicationsGrid canPublish={canPublish} onCreate={() => setTab('create')} />
        ) : canPublish ? (
          <CreatePublicationPanel
            onCreated={() => setTab('grid')}
          />
        ) : (
          <EmptyState
            icon={<Rss className="w-5 h-5" />}
            title="Réalisations réservées aux propriétaires"
            description="Seuls les comptes qui gèrent des salles ou des prestations peuvent créer des réalisations."
          />
        )}
      </div>
    </div>
  );
}

function PublicationsGrid({
  canPublish,
  onCreate,
}: {
  canPublish: boolean;
  onCreate: () => void;
}) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<MyPost | null>(null);
  const [kind, setKind] = useState<'all' | 'venue' | 'vendor'>('all');
  const [displayMode, setDisplayMode] = useState<'tiles' | 'feed'>('tiles');

  const load = useCallback(async (cursor?: string | null) => {
    if (!cursor) setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (kind !== 'all') params.set('kind', kind);
      if (cursor) params.set('cursor', cursor);
      const qs = params.toString() ? `?${params}` : '';
      const data = await api.get(`/public/activity${qs}`);
      const page: MyPost[] = Array.isArray(data?.posts) ? data.posts : [];
      setPosts((prev) => (cursor ? [...prev, ...page] : page));
      setNextCursor(data?.nextCursor || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
      if (!cursor) setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  const tiles = useMemo(
    () =>
      posts.filter((p) => (p.mediaUrls?.length ?? 0) > 0 || p.content),
    [posts],
  );

  return (
    <div className="space-y-6">
      {/* Barre d'outils de filtrage & mode d'affichage */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 p-2 rounded-2xl bg-surface border border-border/80 shadow-2xs">
        {/* Filtre par type */}
        <div
          role="group"
          aria-label="Filtrer les réalisations par type"
          className="inline-flex gap-1 p-1 rounded-xl bg-surface-muted border border-border/60 overflow-x-auto no-scrollbar"
        >
          {(
            [
              ['all', 'Tout'],
              ['venue', 'Salles'],
              ['vendor', 'Prestations'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={kind === id}
              onClick={() => setKind(id)}
              className={cn(
                'min-h-11 px-3.5 rounded-lg text-xs font-medium transition touch-manipulation whitespace-nowrap shrink-0 active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                kind === id
                  ? 'bg-surface text-foreground shadow-2xs font-semibold border border-border'
                  : 'text-muted hover:text-foreground hover:bg-surface/50',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Toggle Mode Grille / Fil */}
        <div
          role="group"
          aria-label="Mode d'affichage des réalisations"
          className="inline-flex gap-1 p-1 rounded-xl bg-surface-muted border border-border/60 self-start sm:self-auto"
        >
          <button
            type="button"
            aria-pressed={displayMode === 'tiles'}
            onClick={() => setDisplayMode('tiles')}
            className={cn(
              'min-h-11 px-3.5 rounded-lg text-xs font-medium transition touch-manipulation whitespace-nowrap active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              displayMode === 'tiles' ? 'bg-surface text-foreground shadow-2xs font-semibold border border-border' : 'text-muted hover:text-foreground hover:bg-surface/50',
            )}
          >
            Grille photos
          </button>
          <button
            type="button"
            aria-pressed={displayMode === 'feed'}
            onClick={() => setDisplayMode('feed')}
            className={cn(
              'min-h-11 px-3.5 rounded-lg text-xs font-medium transition touch-manipulation whitespace-nowrap active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              displayMode === 'feed' ? 'bg-surface text-foreground shadow-2xs font-semibold border border-border' : 'text-muted hover:text-foreground hover:bg-surface/50',
            )}
          >
            Fil détaillé
          </button>
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {displayMode === 'feed' ? (
        <MarketplaceGlobalActivityFeed linkBase="dashboard" compactLoginHint={Boolean(user)} />
      ) : loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-surface-muted animate-pulse" />
          ))}
        </div>
      ) : tiles.length === 0 ? (
        <EmptyState
          icon={<Rss className="w-5 h-5" />}
          title="Aucune réalisation"
          description="Dès que des salles ou prestations partagent une actualité, elle apparaîtra ici."
          action={
            canPublish ? (
              <Button onClick={onCreate} leftIcon={<Plus className="w-4 h-4" />}>
                Créer une réalisation
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {tiles.map((post) => {
            const mediaList = post.mediaUrls || [];
            const media = mediaList[0];
            const video = Boolean(media && (media.type === 'VIDEO' || isVideoUrl(media.url)));
            const extraCount = Math.max(0, mediaList.length - 1);
            const likes = post.likeCount ?? post.likes?.length ?? 0;
            const comments = post.comments?.length ?? 0;
            return (
              <button
                key={post.id}
                type="button"
                onClick={() => setSelected(post)}
                className="group flex flex-col overflow-hidden rounded-2xl bg-surface border border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 shadow-2xs hover:border-border transition text-left active:scale-[0.99] motion-reduce:active:scale-100"
                aria-label={`Ouvrir la réalisation de ${post.author?.name || 'ce partenaire'}`}
              >
                <span className="relative aspect-square overflow-hidden bg-surface-muted">
                  {media ? (
                    video ? (
                      <video src={media.url} muted playsInline className="h-full w-full object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sizedMediaUrl(media.url, 480)}
                        alt={post.content ? `Photo : ${post.content.slice(0, 60)}` : `Réalisation de ${post.author?.name || 'partenaire'}`}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    )
                  ) : (
                    <span className="h-full w-full p-4 flex flex-col justify-between bg-surface-muted border-b border-border">
                      <span className="text-xs font-semibold text-primary">{post.author?.name || 'Réalisation'}</span>
                      <span className="text-xs text-foreground line-clamp-4">{post.content}</span>
                    </span>
                  )}
                  {video ? (
                    <span className="absolute top-2 left-2 inline-flex min-h-8 items-center gap-1 rounded-full bg-stage/70 px-2 text-xs font-semibold text-stage-foreground">
                      <Play className="w-3 h-3 fill-current" aria-hidden />
                      Vidéo
                    </span>
                  ) : extraCount > 0 ? (
                    <span className="absolute top-2 left-2 inline-flex min-h-8 items-center gap-1 rounded-full bg-stage/70 px-2 text-xs font-semibold text-stage-foreground">
                      <Images className="w-3 h-3" aria-hidden />
                      +{extraCount}
                    </span>
                  ) : null}
                </span>
                <span className="flex flex-col gap-1 p-3 sm:p-3.5">
                  <span className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {post.author?.name || 'Réalisation'}
                    </span>
                    <span className="text-xs text-muted shrink-0 tabular-nums">
                      {formatRelativeDate(post.createdAt)}
                    </span>
                  </span>
                  {post.content ? (
                    <span className="text-xs text-muted line-clamp-2">{post.content}</span>
                  ) : null}
                  <span className="inline-flex items-center gap-3 text-xs text-muted tabular-nums pt-0.5">
                    <span className="inline-flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5" aria-hidden /> {likes}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" aria-hidden /> {comments}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {displayMode === 'tiles' && nextCursor ? (
        <button
          type="button"
          onClick={() => void load(nextCursor)}
          className="w-full min-h-11 rounded-2xl border border-border/80 bg-surface text-xs sm:text-sm font-semibold text-foreground hover:bg-surface-muted transition shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          Voir plus de réalisations
        </button>
      ) : null}

      {selected ? (
        <PostDetailModal post={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}

function PostDetailModal({ post, onClose }: { post: MyPost; onClose: () => void }) {
  const media = post.mediaUrls || [];
  const [index, setIndex] = useState(0);
  const current = media[index] || media[0];
  const href = post.author?.href
    ? post.author.href.replace(/^\/marketplace\//, '/dashboard/catalogue/')
    : null;

  const goPrev = useCallback(() => {
    setIndex((i) => (media.length ? (i - 1 + media.length) % media.length : 0));
  }, [media.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (media.length ? (i + 1) % media.length : 0));
  }, [media.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [goPrev, goNext]);

  useEffect(() => {
    setIndex(0);
  }, [post.id]);

  const authorName = post.author?.name || 'Réalisation';
  const isVendor = post.author?.kind === 'vendor';

  return (
    <Modal
      open={Boolean(post)}
      onClose={onClose}
      size="xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-surface-muted text-primary border border-border shrink-0">
            {isVendor ? <Sparkles className="w-4 h-4" aria-hidden /> : <Building2 className="w-4 h-4" aria-hidden />}
          </div>
          <div className="min-w-0">
            <span className="text-base font-semibold text-foreground block truncate">{authorName}</span>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted">
              <span>{isVendor ? 'Prestation' : 'Salle'}</span>
              <span>·</span>
              <span className="tabular-nums">{formatRelativeDate(post.createdAt)}</span>
            </div>
          </div>
        </div>
      }
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-3 text-xs text-muted tabular-nums">
            <span className="inline-flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400">
              <Heart className="w-4 h-4 fill-current" aria-hidden /> {post.likeCount ?? post.likes?.length ?? 0}
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <MessageCircle className="w-4 h-4" aria-hidden /> {post.comments?.length ?? 0}
            </span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Fermer
            </Button>
            {href ? (
              <Link
                href={href}
                className="inline-flex min-h-9 items-center gap-1.5 px-3.5 rounded-lg bg-primary-solid hover:bg-primary-solid-hover text-primary-foreground font-semibold text-xs transition touch-manipulation active:scale-[0.98] motion-reduce:active:scale-100"
              >
                <span>Voir la fiche</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden />
              </Link>
            ) : null}
          </div>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        {current ? (
          <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-stage aspect-16/10 max-h-[min(65vh,520px)] flex items-center justify-center">
            {current.type === 'VIDEO' || isVideoUrl(current.url) ? (
              <video src={current.url} controls playsInline className="w-full h-full object-contain" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sizedMediaUrl(current.url, 1200)}
                alt={post.content ? `Photo de réalisation : ${post.content.slice(0, 60)}` : 'Photo de la réalisation'}
                className="w-full h-full object-contain"
              />
            )}
            {media.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 min-h-11 min-w-11 inline-flex items-center justify-center rounded-full bg-surface/90 text-foreground border border-border shadow-2xs touch-manipulation hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  aria-label="Média précédent"
                >
                  <ChevronLeft className="w-5 h-5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 min-h-11 min-w-11 inline-flex items-center justify-center rounded-full bg-surface/90 text-foreground border border-border shadow-2xs touch-manipulation hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  aria-label="Média suivant"
                >
                  <ChevronRight className="w-5 h-5" aria-hidden />
                </button>
                <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5" role="tablist" aria-label="Médias de la publication">
                  {media.map((item, i) => (
                    <button
                      key={`${item.url}-${i}`}
                      type="button"
                      onClick={() => setIndex(i)}
                      className="min-h-11 min-w-11 inline-flex items-center justify-center touch-manipulation"
                      aria-label={`Média ${i + 1} sur ${media.length}`}
                      aria-current={i === index ? 'true' : undefined}
                    >
                      <span
                        className={cn(
                          'h-2 rounded-full transition-all',
                          i === index ? 'w-5 bg-primary' : 'w-2 bg-white/60 hover:bg-white',
                        )}
                        aria-hidden
                      />
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {post.content ? (
          <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{post.content}</p>
        ) : null}
      </div>
    </Modal>
  );
}

function CreatePublicationPanel({ onCreated }: { onCreated: () => void }) {
  const [targets, setTargets] = useState<{ venues: FeedTarget[]; services: FeedTarget[] }>({
    venues: [],
    services: [],
  });
  const [loadingTargets, setLoadingTargets] = useState(true);
  const [targetKind, setTargetKind] = useState<'venue' | 'service'>('venue');
  const [targetId, setTargetId] = useState('');
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [myPosts, setMyPosts] = useState<MyPost[]>([]);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadTargets = useCallback(async () => {
    setLoadingTargets(true);
    try {
      const data = await api.get('/marketplace/feed/targets');
      setTargets({ venues: data.venues || [], services: data.services || [] });
      const mine = await api.get('/marketplace/feed/mine');
      setMyPosts(Array.isArray(mine) ? mine : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger vos fiches.');
    } finally {
      setLoadingTargets(false);
    }
  }, []);

  useEffect(() => {
    void loadTargets();
  }, [loadTargets]);

  const options = targetKind === 'venue' ? targets.venues : targets.services;

  useEffect(() => {
    if (!options.some((o) => o.id === targetId)) {
      setTargetId(options.find((o) => o.isPublic)?.id || options[0]?.id || '');
    }
  }, [options, targetId]);

  const onPickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError('');
    try {
      const next = [...media];
      for (const file of Array.from(files).slice(0, 8 - next.length)) {
        const uploaded = await uploadMarketplaceMedia(file);
        const type: 'IMAGE' | 'VIDEO' =
          file.type.startsWith('video/') || isVideoUrl(uploaded.url) ? 'VIDEO' : 'IMAGE';
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
    if (!targetId) {
      setError('Choisissez une salle ou une prestation.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/marketplace/feed', {
        targetKind,
        targetId,
        content: content.trim() || null,
        mediaUrls: media,
      });
      setContent('');
      setMedia([]);
      setSuccess('Réalisation créée.');
      await loadTargets();
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de publier cette réalisation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/marketplace/feed/${postToDelete}`);
      setMyPosts((prev) => prev.filter((p) => p.id !== postToDelete));
      setPostToDelete(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Suppression impossible.');
    } finally {
      setDeleting(false);
    }
  };

  if (loadingTargets) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
      </div>
    );
  }

  if (targets.venues.length === 0 && targets.services.length === 0) {
    return (
      <EmptyState
        icon={<Plus className="w-5 h-5" />}
        title="Aucune fiche à lier"
        description="Créez et publiez d’abord une salle ou une prestation, puis revenez créer une réalisation."
        action={
          <div className="flex flex-wrap gap-2 justify-center">
            <Link href="/dashboard/rooms"><Button size="sm">Mes salles</Button></Link>
            <Link href="/dashboard/marketplace"><Button size="sm" variant="secondary">Mes offres</Button></Link>
          </div>
        }
      />
    );
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-4">
        {error ? <Alert variant="error">{error}</Alert> : null}
        {success ? <Alert variant="success">{success}</Alert> : null}

        <div className="rounded-2xl border border-border bg-surface p-4 space-y-4 shadow-2xs">
          <div
            role="group"
            aria-label="Type d'entité pour la réalisation"
            className="inline-flex gap-0.5 p-0.5 rounded-[var(--radius-button)] border border-border bg-surface-muted"
          >
            <button
              type="button"
              aria-pressed={targetKind === 'venue'}
              onClick={() => setTargetKind('venue')}
              disabled={targets.venues.length === 0}
              className={cn(
                'min-h-11 px-3.5 rounded-[var(--radius-button)] text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-40 transition touch-manipulation active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                targetKind === 'venue' ? 'bg-surface text-foreground shadow-2xs font-bold' : 'text-muted hover:text-foreground',
              )}
            >
              <Building2 className="w-3.5 h-3.5" aria-hidden /> Salle
            </button>
            <button
              type="button"
              aria-pressed={targetKind === 'service'}
              onClick={() => setTargetKind('service')}
              disabled={targets.services.length === 0}
              className={cn(
                'min-h-11 px-3.5 rounded-[var(--radius-button)] text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-40 transition touch-manipulation active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                targetKind === 'service' ? 'bg-surface text-foreground shadow-2xs font-bold' : 'text-muted hover:text-foreground',
              )}
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden /> Prestation
            </button>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="publication-target-select" className="block text-xs font-semibold text-muted">
              Lier à
            </label>
            <select
              id="publication-target-select"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full min-h-11 px-3.5 rounded-xl border border-border bg-surface text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            >
              {options.map((o) => (
                <option key={o.id} value={o.id} disabled={!o.isPublic}>
                  {o.label}{o.city ? ` · ${o.city}` : ''}{!o.isPublic ? ' (brouillon)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="publication-create-textarea" className="block text-xs font-semibold text-muted">
              Description de la réalisation
            </label>
            <textarea
              id="publication-create-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="Décrivez votre actualité, une nouveauté, un nouveau décor ou une réalisation…"
              className="w-full rounded-xl border border-border bg-surface-muted px-3.5 py-3 text-base sm:text-sm resize-y min-h-[6.5rem] text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              aria-describedby="publication-desc-hint"
            />
            <div className="flex justify-between items-center text-xs text-muted">
              <span id="publication-desc-hint">Partagez vos nouveautés ou réalisations.</span>
              <span className={cn(content.length > 3800 && 'text-rose-600 dark:text-rose-400 font-semibold tabular-nums')}>{content.length} / 4000</span>
            </div>
          </div>

          {media.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {media.map((m, i) => (
                <div key={`${m.url}-${i}`} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border bg-surface-muted">
                  {m.type === 'VIDEO' || isVideoUrl(m.url) ? (
                    <video src={m.url} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt={`Aperçu du média téléversé n°${i + 1}`} className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => setMedia((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 min-h-11 min-w-11 inline-flex items-center justify-center rounded-full bg-stage/70 text-white hover:bg-stage transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    aria-label={`Retirer le média n°${i + 1}`}
                  >
                    <X className="w-4 h-4" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              id="publication-file-input"
              type="file"
              accept="image/*,video/*"
              multiple
              className="sr-only"
              aria-label="Sélectionner des fichiers médias (images ou vidéos)"
              onChange={(e) => void onPickFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || media.length >= 8}
              className="inline-flex items-center gap-1.5 min-h-11 px-3.5 rounded-xl border border-border text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-muted disabled:opacity-50 transition touch-manipulation active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <ImageIcon className="w-3.5 h-3.5" aria-hidden />}
              <span>Médias ({media.length}/8)</span>
            </button>
            <Button
              onClick={() => void publish()}
              disabled={submitting || uploading || (!content.trim() && media.length === 0) || !targetId}
              leftIcon={submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              className="ml-auto"
            >
              Publier
            </Button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Vos réalisations</h2>
        {myPosts.length === 0 ? (
          <p className="text-xs text-muted">Aucune réalisation pour l’instant.</p>
        ) : (
          <ul className="space-y-2">
            {myPosts.slice(0, 12).map((p) => (
              <li key={p.id} className="rounded-xl border border-border bg-surface p-3 flex items-center gap-3 shadow-2xs">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-muted shrink-0">
                  {p.mediaUrls?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.mediaUrls[0].url} alt={p.content ? `Photo : ${p.content.slice(0, 40)}` : 'Média de réalisation'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Rss className="w-4 h-4 text-muted" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-semibold text-foreground truncate">{p.author?.name}</p>
                  <p className="text-xs text-muted line-clamp-2">{p.content || 'Média'}</p>
                  <p className="text-xs text-muted tabular-nums">{formatRelativeDate(p.createdAt)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPostToDelete(p.id)}
                  className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-muted hover:text-rose-600 hover:bg-rose-500/10 transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
                  aria-label={`Supprimer la réalisation « ${p.content ? p.content.slice(0, 30) : formatRelativeDate(p.createdAt)} »`}
                >
                  <Trash2 className="w-4 h-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(postToDelete)}
        onClose={() => {
          if (!deleting) setPostToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Supprimer cette réalisation ?"
        description="Cette publication sera définitivement retirée du fil d’actualité et de votre fiche."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        tone="danger"
        loading={deleting}
      />
    </div>
  );
}

export default function DashboardPublicationsPage() {
  return (
    <Suspense fallback={<div className="py-16 text-sm text-muted">Chargement des réalisations…</div>}>
      <DashboardPublicationsPageInner />
    </Suspense>
  );
}
