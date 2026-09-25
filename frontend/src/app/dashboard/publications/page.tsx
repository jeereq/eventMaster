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
  PageHeader, Breadcrumbs, Alert, Button, EmptyState, Modal, ConfirmDialog, Badge,
} from '@/components/ui';
import MarketplaceGlobalActivityFeed from '@/components/marketplace/MarketplaceGlobalActivityFeed';
import {
  ArrowLeft, ArrowRight, Building2, Check, ChevronLeft, ChevronRight, Eye, Heart, Images,
  LayoutGrid, Loader2, MessageCircle, Pencil, Play, Plus, Rss, Search, Send, Sparkles,
  Star, Trash2, UploadCloud, X, Image as ImageIcon,
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

const MAX_MEDIA = 8;
const MAX_CONTENT = 4000;

type DeskTab = 'grid' | 'mine' | 'create';

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
  venueListingId?: string | null;
  serviceOfferingId?: string | null;
  author: {
    kind: string;
    name: string;
    href: string | null;
    city?: string | null;
    coverUrl?: string | null;
  } | null;
};

function parseTab(raw: string | null): DeskTab {
  if (raw === 'create') return 'create';
  if (raw === 'mine') return 'mine';
  return 'grid';
}

function isVideoMedia(m: MediaItem | undefined) {
  return Boolean(m && (m.type === 'VIDEO' || isVideoUrl(m.url)));
}

/** Données de gestion (fiches liables + réalisations du compte), partagées entre les onglets. */
function useManageData(enabled: boolean) {
  const [targets, setTargets] = useState<{ venues: FeedTarget[]; services: FeedTarget[] }>({
    venues: [],
    services: [],
  });
  const [myPosts, setMyPosts] = useState<MyPost[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError('');
    try {
      const [t, mine] = await Promise.all([
        api.get('/marketplace/feed/targets'),
        api.get('/marketplace/feed/mine'),
      ]);
      setTargets({ venues: t?.venues || [], services: t?.services || [] });
      setMyPosts(Array.isArray(mine) ? mine : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger vos réalisations.');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { targets, myPosts, setMyPosts, loading, error, reload };
}

function DashboardPublicationsPageInner() {
  const { access } = useAuth();
  const canPublish = Boolean(access?.canManageRooms);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = canPublish ? parseTab(searchParams.get('tab')) : 'grid';
  const editId = tab === 'create' ? searchParams.get('edit') : null;
  const manage = useManageData(canPublish);
  const [flash, setFlash] = useState('');

  useEffect(() => {
    if (!canPublish && searchParams.get('tab')) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('tab');
      params.delete('edit');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [searchParams, canPublish, pathname, router]);

  const go = useCallback(
    (next: DeskTab, opts?: { edit?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === 'grid') params.delete('tab');
      else params.set('tab', next);
      if (opts?.edit) params.set('edit', opts.edit);
      else params.delete('edit');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(''), 5000);
    return () => window.clearTimeout(t);
  }, [flash]);

  const editing = editId ? manage.myPosts.find((p) => p.id === editId) || null : null;
  const ownIds = useMemo(() => new Set(manage.myPosts.map((p) => p.id)), [manage.myPosts]);

  const crumb =
    tab === 'create' ? (editId ? 'Modifier' : 'Nouvelle') : tab === 'mine' ? 'Mes réalisations' : 'Découvrir';

  const tabs = [
    { id: 'grid' as const, label: 'Découvrir', icon: Rss, count: null as number | null },
    { id: 'mine' as const, label: 'Mes réalisations', icon: LayoutGrid, count: manage.loading ? null : manage.myPosts.length },
  ];

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Réalisations"
        description={
          canPublish
            ? 'Montrez vos plus beaux événements : photos et vidéos liées à vos salles et prestations.'
            : 'Photos et actualités des salles et prestataires.'
        }
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Réalisations', href: '/dashboard/publications' },
              { label: crumb },
            ]}
          />
        }
        action={
          canPublish && tab !== 'create' ? (
            <Button onClick={() => go('create')} leftIcon={<Plus className="w-4 h-4" />}>
              Nouvelle réalisation
            </Button>
          ) : undefined
        }
      />

      {canPublish && tab !== 'create' ? (
        <div
          role="tablist"
          aria-label="Navigation des réalisations"
          className="flex items-center gap-1 rounded-xl border border-border bg-surface-muted p-1 w-full sm:w-fit"
        >
          {tabs.map((item) => (
            <button
              key={item.id}
              id={`tab-publications-${item.id}`}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              aria-controls={`tabpanel-publications-${item.id}`}
              onClick={() => go(item.id)}
              className={cn(
                'flex-1 sm:flex-none inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 sm:px-3.5 py-2 text-sm font-medium transition touch-manipulation active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                tab === item.id
                  ? 'bg-surface text-foreground shadow-2xs font-semibold'
                  : 'text-muted hover:bg-surface/70 hover:text-foreground',
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" aria-hidden />
              <span>{item.label}</span>
              {item.count !== null ? (
                <span className="ml-0.5 rounded-full bg-primary/10 px-1.5 text-xs font-semibold text-primary tabular-nums">
                  {item.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {flash ? (
        <Alert variant="success">{flash}</Alert>
      ) : null}

      <div
        role="tabpanel"
        id={`tabpanel-publications-${tab}`}
        aria-labelledby={tab === 'create' ? undefined : `tab-publications-${tab}`}
        aria-label={tab === 'create' ? crumb : undefined}
        className="outline-none"
        tabIndex={-1}
      >
        {tab === 'grid' ? (
          <PublicationsGrid
            canPublish={canPublish}
            onCreate={() => go('create')}
            ownIds={ownIds}
            onEdit={(id) => go('create', { edit: id })}
          />
        ) : tab === 'mine' ? (
          <MyPublicationsPanel
            posts={manage.myPosts}
            loading={manage.loading}
            error={manage.error}
            hasTargets={manage.targets.venues.length + manage.targets.services.length > 0}
            onCreate={() => go('create')}
            onEdit={(id) => go('create', { edit: id })}
            onDeleted={(id) => {
              manage.setMyPosts((prev) => prev.filter((p) => p.id !== id));
              setFlash('Réalisation supprimée.');
            }}
          />
        ) : manage.loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 text-primary animate-spin" aria-label="Chargement" />
          </div>
        ) : editId && !editing ? (
          <EmptyState
            icon={<Pencil className="w-5 h-5" />}
            title="Réalisation introuvable"
            description="Elle a peut-être déjà été supprimée."
            action={<Button onClick={() => go('mine')}>Retour à mes réalisations</Button>}
          />
        ) : (
          <PublicationComposer
            key={editing?.id || 'new'}
            targets={manage.targets}
            editing={editing}
            onCancel={() => go('mine')}
            onSaved={(post, created) => {
              manage.setMyPosts((prev) =>
                created ? [post, ...prev] : prev.map((p) => (p.id === post.id ? { ...p, ...post } : p)),
              );
              setFlash(created ? 'Réalisation publiée. Elle est visible sur votre fiche et dans le fil.' : 'Modifications enregistrées.');
              go('mine');
            }}
          />
        )}
      </div>
    </div>
  );
}

function PublicationsGrid({
  canPublish,
  onCreate,
  ownIds,
  onEdit,
}: {
  canPublish: boolean;
  onCreate: () => void;
  ownIds: Set<string>;
  onEdit: (id: string) => void;
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
        <PostDetailModal
          post={selected}
          onClose={() => setSelected(null)}
          onEdit={
            ownIds.has(selected.id)
              ? () => {
                  const id = selected.id;
                  setSelected(null);
                  onEdit(id);
                }
              : undefined
          }
        />
      ) : null}
    </div>
  );
}

function PostDetailModal({
  post,
  onClose,
  onEdit,
}: {
  post: MyPost;
  onClose: () => void;
  onEdit?: () => void;
}) {
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
  const isVendor = post.author?.kind !== 'venue';

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
            {onEdit ? (
              <Button type="button" variant="secondary" size="sm" onClick={onEdit} leftIcon={<Pencil className="w-3.5 h-3.5" />}>
                Modifier
              </Button>
            ) : null}
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

const KIND_FILTERS = [
  ['all', 'Tout'],
  ['venue', 'Salles'],
  ['service', 'Prestations'],
] as const;

function postKindLabel(kind: string | undefined) {
  return kind === 'venue' ? 'Salle' : 'Prestation';
}

function MyPublicationsPanel({
  posts,
  loading,
  error,
  hasTargets,
  onCreate,
  onEdit,
  onDeleted,
}: {
  posts: MyPost[];
  loading: boolean;
  error: string;
  hasTargets: boolean;
  onCreate: () => void;
  onEdit: (id: string) => void;
  onDeleted: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<(typeof KIND_FILTERS)[number][0]>('all');
  const [preview, setPreview] = useState<MyPost | null>(null);
  const [toDelete, setToDelete] = useState<MyPost | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      const k = p.author?.kind === 'venue' ? 'venue' : 'service';
      if (kind !== 'all' && k !== kind) return false;
      if (!q) return true;
      return (
        (p.content || '').toLowerCase().includes(q) ||
        (p.author?.name || '').toLowerCase().includes(q)
      );
    });
  }, [posts, query, kind]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/marketplace/feed/${toDelete.id}`);
      onDeleted(toDelete.id);
      setToDelete(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Suppression impossible.');
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="aspect-[4/3] bg-surface-muted animate-pulse" />
            <div className="p-4 space-y-2">
              <div className="h-3 w-1/2 rounded bg-surface-muted animate-pulse" />
              <div className="h-3 w-3/4 rounded bg-surface-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) return <Alert variant="error">{error}</Alert>;

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={<Images className="w-5 h-5" />}
        title="Vous n’avez encore aucune réalisation"
        description={
          hasTargets
            ? 'Partagez les photos d’un événement réussi : elles apparaîtront sur la fiche de votre salle ou prestation et dans le fil.'
            : 'Publiez d’abord une salle ou une prestation sur le catalogue, puis ajoutez-y vos réalisations.'
        }
        action={
          hasTargets ? (
            <Button onClick={onCreate} leftIcon={<Plus className="w-4 h-4" />}>
              Créer ma première réalisation
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2 justify-center">
              <Button href="/dashboard/rooms" size="sm">Mes salles</Button>
              <Button href="/dashboard/marketplace" size="sm" variant="secondary">Mes offres</Button>
            </div>
          )
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {deleteError ? <Alert variant="error">{deleteError}</Alert> : null}

      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-2 rounded-2xl bg-surface border border-border/80 shadow-2xs">
        <label className="relative flex-1 min-w-0">
          <span className="sr-only">Rechercher une réalisation</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par texte ou par fiche…"
            className="w-full min-h-11 pl-9 pr-3 rounded-xl border border-border/60 bg-surface-muted text-base sm:text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
          />
        </label>
        <div
          role="group"
          aria-label="Filtrer par type de fiche"
          className="inline-flex gap-1 p-1 rounded-xl bg-surface-muted border border-border/60 self-start sm:self-auto"
        >
          {KIND_FILTERS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={kind === id}
              onClick={() => setKind(id)}
              className={cn(
                'min-h-11 px-3.5 rounded-lg text-xs font-medium transition touch-manipulation whitespace-nowrap active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                kind === id
                  ? 'bg-surface text-foreground shadow-2xs font-semibold border border-border'
                  : 'text-muted hover:text-foreground hover:bg-surface/50',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted" aria-live="polite">
        {filtered.length === posts.length
          ? `${posts.length} réalisation${posts.length > 1 ? 's' : ''}`
          : `${filtered.length} sur ${posts.length} réalisation${posts.length > 1 ? 's' : ''}`}
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="w-5 h-5" />}
          title="Aucun résultat"
          description="Essayez un autre mot-clé ou retirez le filtre."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setQuery('');
                setKind('all');
              }}
            >
              Réinitialiser
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const media = p.mediaUrls || [];
            const cover = media[0];
            const likes = p.likeCount ?? p.likes?.length ?? 0;
            const comments = p.comments?.length ?? 0;
            const isVenue = p.author?.kind === 'venue';
            return (
              <li
                key={p.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-2xs hover:border-border transition"
              >
                <button
                  type="button"
                  onClick={() => setPreview(p)}
                  className="relative aspect-[16/10] sm:aspect-[4/3] overflow-hidden bg-surface-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
                  aria-label={`Aperçu de la réalisation « ${p.content ? p.content.slice(0, 40) : p.author?.name || ''} »`}
                >
                  {cover ? (
                    isVideoMedia(cover) ? (
                      <video src={cover.url} muted playsInline className="h-full w-full object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sizedMediaUrl(cover.url, 640)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    )
                  ) : (
                    <span className="flex h-full w-full items-center p-5 text-sm text-foreground line-clamp-5 bg-gradient-to-br from-primary/10 to-surface-muted">
                      {p.content}
                    </span>
                  )}
                  <span className="absolute top-2 left-2 inline-flex min-h-7 items-center gap-1 rounded-full bg-surface/95 px-2.5 text-xs font-semibold text-foreground shadow-2xs">
                    {isVenue ? <Building2 className="w-3.5 h-3.5 text-primary" aria-hidden /> : <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden />}
                    {postKindLabel(p.author?.kind)}
                  </span>
                  {media.length > 1 || isVideoMedia(cover) ? (
                    <span className="absolute top-2 right-2 inline-flex min-h-7 items-center gap-1 rounded-full bg-stage/70 px-2 text-xs font-semibold text-stage-foreground">
                      {isVideoMedia(cover) ? <Play className="w-3 h-3 fill-current" aria-hidden /> : <Images className="w-3 h-3" aria-hidden />}
                      {media.length}
                    </span>
                  ) : null}
                </button>

                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{p.author?.name || 'Fiche'}</p>
                    <span className="text-xs text-muted shrink-0 tabular-nums">{formatRelativeDate(p.createdAt)}</span>
                  </div>
                  <p className={cn('text-xs line-clamp-2 min-h-[2rem]', p.content ? 'text-muted' : 'text-muted/70 italic')}>
                    {p.content || 'Sans description'}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                    <span className="inline-flex items-center gap-3 text-xs text-muted tabular-nums">
                      <span className="inline-flex items-center gap-1" title="J’aime">
                        <Heart className="w-3.5 h-3.5" aria-hidden /> {likes}
                      </span>
                      <span className="inline-flex items-center gap-1" title="Commentaires">
                        <MessageCircle className="w-3.5 h-3.5" aria-hidden /> {comments}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(p.id)}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-foreground hover:bg-surface-muted transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      >
                        <Pencil className="w-3.5 h-3.5" aria-hidden /> Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => setToDelete(p)}
                        className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-muted hover:text-rose-600 hover:bg-rose-500/10 transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
                        aria-label={`Supprimer la réalisation « ${p.content ? p.content.slice(0, 30) : formatRelativeDate(p.createdAt)} »`}
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden />
                      </button>
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {preview ? (
        <PostDetailModal
          post={preview}
          onClose={() => setPreview(null)}
          onEdit={() => {
            const id = preview.id;
            setPreview(null);
            onEdit(id);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => {
          if (!deleting) setToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Supprimer cette réalisation ?"
        description={`Elle sera retirée du fil et de la fiche « ${toDelete?.author?.name || ''} », avec ses ${toDelete?.likeCount ?? toDelete?.likes?.length ?? 0} j’aime et ${toDelete?.comments?.length ?? 0} commentaire(s). Cette action est définitive.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        tone="danger"
        loading={deleting}
      />
    </div>
  );
}

function StepTitle({ n, title, hint, done }: { n: number; title: string; hint?: string; done: boolean }) {
return (
  <div className="flex items-start gap-3">
    <span
      className={cn(
        'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition',
        done ? 'bg-primary-solid text-primary-foreground' : 'bg-surface-muted text-muted border border-border',
      )}
      aria-hidden
    >
      {done ? <Check className="w-4 h-4" /> : n}
    </span>
    <div className="min-w-0">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {hint ? <p className="text-xs text-muted mt-0.5">{hint}</p> : null}
    </div>
  </div>
);
}

type UploadSlot = { id: string; name: string };

function PublicationComposer({
  targets,
  editing,
  onCancel,
  onSaved,
}: {
  targets: { venues: FeedTarget[]; services: FeedTarget[] };
  editing: MyPost | null;
  onCancel: () => void;
  onSaved: (post: MyPost, created: boolean) => void;
}) {
  const isEdit = Boolean(editing);
  const initialKind: 'venue' | 'service' = editing
    ? editing.venueListingId || editing.author?.kind === 'venue'
      ? 'venue'
      : 'service'
    : targets.venues.some((v) => v.isPublic) || targets.services.length === 0
      ? 'venue'
      : 'service';
  const [targetKind, setTargetKind] = useState<'venue' | 'service'>(initialKind);
  const [pickedTargetId, setTargetId] = useState(
    editing ? editing.venueListingId || editing.serviceOfferingId || '' : '',
  );
  const [content, setContent] = useState(editing?.content || '');
  const [media, setMedia] = useState<MediaItem[]>(editing?.mediaUrls || []);
  const [uploads, setUploads] = useState<UploadSlot[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [targetQuery, setTargetQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploading = uploads.length > 0;

  const options = targetKind === 'venue' ? targets.venues : targets.services;
  const publicOptions = options.filter((o) => o.isPublic);
  const draftCount = options.length - publicOptions.length;
  // Une seule fiche publiée : elle est présélectionnée ; une fiche d'un autre type est ignorée.
  const targetId = isEdit
    ? pickedTargetId
    : publicOptions.some((o) => o.id === pickedTargetId)
      ? pickedTargetId
      : publicOptions.length === 1
        ? publicOptions[0].id
        : '';
  const allTargets = [...targets.venues, ...targets.services];
  const selectedTarget = allTargets.find((o) => o.id === targetId) || null;


  const visibleOptions = useMemo(() => {
    const q = targetQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.label} ${o.city || ''}`.toLowerCase().includes(q));
  }, [options, targetQuery]);

  const dirty = isEdit
    ? content !== (editing?.content || '') || JSON.stringify(media) !== JSON.stringify(editing?.mediaUrls || [])
    : Boolean(content.trim() || media.length);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const addFiles = async (files: FileList | File[] | null) => {
    if (!files) return;
    const accepted = Array.from(files).filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
    const room = MAX_MEDIA - media.length - uploads.length;
    if (accepted.length === 0) {
      setError('Seules les images et les vidéos sont acceptées.');
      return;
    }
    const batch = accepted.slice(0, Math.max(0, room));
    if (batch.length < accepted.length) {
      setError(`Maximum ${MAX_MEDIA} médias par réalisation : ${accepted.length - batch.length} fichier(s) ignoré(s).`);
    } else {
      setError('');
    }
    if (fileRef.current) fileRef.current.value = '';
    await Promise.all(
      batch.map(async (file, i) => {
        const slot = { id: `${Date.now()}-${i}-${file.name}`, name: file.name };
        setUploads((prev) => [...prev, slot]);
        try {
          const uploaded = await uploadMarketplaceMedia(file);
          const type: MediaItem['type'] =
            file.type.startsWith('video/') || isVideoUrl(uploaded.url) ? 'VIDEO' : 'IMAGE';
          setMedia((prev) => (prev.length >= MAX_MEDIA ? prev : [...prev, { url: uploaded.url, type }]));
        } catch (err: unknown) {
          setError(err instanceof Error ? `« ${file.name} » : ${err.message}` : `Échec du téléversement de « ${file.name} ».`);
        } finally {
          setUploads((prev) => prev.filter((s) => s.id !== slot.id));
        }
      }),
    );
  };

  const moveMedia = (from: number, to: number) => {
    setMedia((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const hasBody = Boolean(content.trim()) || media.length > 0;
  const canSubmit = hasBody && (isEdit || Boolean(targetId)) && !uploading && !submitting && (!isEdit || dirty);

  const submit = async () => {
    if (!isEdit && !targetId) {
      setError('Choisissez la salle ou la prestation à laquelle rattacher cette réalisation.');
      return;
    }
    if (!hasBody) {
      setError('Ajoutez au moins une photo, une vidéo ou un texte.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const body = { content: content.trim() || null, mediaUrls: media };
      const saved: MyPost = isEdit
        ? await api.patch(`/marketplace/feed/${editing!.id}`, body)
        : await api.post('/marketplace/feed', { targetKind, targetId, ...body });
      onSaved(saved, !isEdit);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  const requestCancel = () => {
    if (dirty) setConfirmLeave(true);
    else onCancel();
  };

  if (!isEdit && allTargets.length === 0) {
    return (
      <EmptyState
        icon={<Plus className="w-5 h-5" />}
        title="Aucune fiche à lier"
        description="Une réalisation se rattache à une salle ou une prestation publiée. Créez-en une d’abord."
        action={
          <div className="flex flex-wrap gap-2 justify-center">
            <Button href="/dashboard/rooms" size="sm">Mes salles</Button>
            <Button href="/dashboard/marketplace" size="sm" variant="secondary">Mes offres</Button>
          </div>
        }
      />
    );
  }

  const stepClass = 'rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-4 shadow-2xs';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={requestCancel}
          className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl border border-border bg-surface text-foreground hover:bg-surface-muted transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Retour à mes réalisations"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
        </button>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? 'Modifier la réalisation' : 'Nouvelle réalisation'}
          </h2>
          <p className="text-xs text-muted">
            {isEdit
              ? 'Mettez à jour les photos ou le texte. Les j’aime et commentaires sont conservés.'
              : 'Trois étapes : la fiche, les médias, puis quelques mots.'}
          </p>
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="grid lg:grid-cols-5 gap-6 items-start">
        <div className="lg:col-span-3 space-y-4">
          {/* Étape 1 : fiche liée */}
          <section className={stepClass} aria-labelledby="step-target">
            <div id="step-target">
              <StepTitle
                n={1}
                title="Fiche liée"
                hint={isEdit ? 'La fiche d’une réalisation existante ne peut pas être changée.' : 'Où cette réalisation sera-t-elle affichée ?'}
                done={Boolean(targetId)}
              />
            </div>

            {isEdit ? (
              <TargetSummary target={selectedTarget} fallbackName={editing?.author?.name} kind={targetKind} />
            ) : (
              <>
                <div
                  role="radiogroup"
                  aria-label="Type de fiche"
                  className="grid grid-cols-2 gap-1 p-1 rounded-xl border border-border bg-surface-muted"
                >
                  {([
                    ['venue', 'Salle', Building2, targets.venues.length],
                    ['service', 'Prestation', Sparkles, targets.services.length],
                  ] as const).map(([id, label, Icon, count]) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={targetKind === id}
                      onClick={() => {
                        setTargetKind(id);
                        setTargetQuery('');
                      }}
                      disabled={count === 0}
                      className={cn(
                        'min-h-11 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-1.5 disabled:opacity-40 transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                        targetKind === id ? 'bg-surface text-foreground shadow-2xs font-semibold' : 'text-muted hover:text-foreground',
                      )}
                    >
                      <Icon className="w-4 h-4" aria-hidden /> {label}
                      <span className="text-xs text-muted tabular-nums">({count})</span>
                    </button>
                  ))}
                </div>

                {options.length > 6 ? (
                  <label className="relative block">
                    <span className="sr-only">Rechercher une fiche</span>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" aria-hidden />
                    <input
                      type="search"
                      value={targetQuery}
                      onChange={(e) => setTargetQuery(e.target.value)}
                      placeholder={targetKind === 'venue' ? 'Rechercher une salle…' : 'Rechercher une prestation…'}
                      className="w-full min-h-11 pl-9 pr-3 rounded-xl border border-border bg-surface text-base sm:text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                    />
                  </label>
                ) : null}

                <div role="radiogroup" aria-label="Fiche liée" className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-0.5">
                  {visibleOptions.map((o) => {
                    const selected = o.id === targetId;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={!o.isPublic}
                        onClick={() => setTargetId(o.id)}
                        className={cn(
                          'relative flex items-center gap-3 rounded-xl border p-2 text-left transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60',
                          selected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border bg-surface hover:border-primary/50 hover:bg-surface-muted',
                        )}
                      >
                        <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-muted flex items-center justify-center">
                          {o.coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={sizedMediaUrl(o.coverUrl, 120)} alt="" className="h-full w-full object-cover" />
                          ) : targetKind === 'venue' ? (
                            <Building2 className="w-5 h-5 text-muted" aria-hidden />
                          ) : (
                            <Sparkles className="w-5 h-5 text-muted" aria-hidden />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-foreground truncate">{o.label}</span>
                          <span className="block text-xs text-muted truncate">
                            {!o.isPublic ? 'Brouillon : publiez la fiche d’abord' : o.city || 'Publiée'}
                          </span>
                        </span>
                        {selected ? (
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-solid text-primary-foreground" aria-hidden>
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                  {visibleOptions.length === 0 ? (
                    <p className="text-xs text-muted sm:col-span-2 py-2">Aucune fiche ne correspond.</p>
                  ) : null}
                </div>

                {publicOptions.length === 0 ? (
                  <Alert variant="warning">
                    Aucune {targetKind === 'venue' ? 'salle' : 'prestation'} n’est encore publiée.{' '}
                    <Link href={targetKind === 'venue' ? '/dashboard/rooms' : '/dashboard/marketplace'} className="font-semibold underline">
                      Publier une fiche
                    </Link>
                  </Alert>
                ) : draftCount > 0 ? (
                  <p className="text-xs text-muted">
                    {draftCount} fiche{draftCount > 1 ? 's' : ''} en brouillon ne peu{draftCount > 1 ? 'vent' : 't'} pas encore recevoir de réalisation.
                  </p>
                ) : null}
              </>
            )}
          </section>

          {/* Étape 2 : médias */}
          <section className={stepClass} aria-labelledby="step-media">
            <div id="step-media">
              <StepTitle
                n={2}
                title="Photos et vidéos"
                hint={`Jusqu’à ${MAX_MEDIA} médias. Le premier sert de couverture.`}
                done={media.length > 0}
              />
            </div>

            <input
              ref={fileRef}
              id="publication-file-input"
              type="file"
              accept="image/*,video/*"
              multiple
              className="sr-only"
              aria-label="Sélectionner des photos ou vidéos"
              onChange={(e) => void addFiles(e.target.files)}
            />

            {media.length + uploads.length < MAX_MEDIA ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  void addFiles(e.dataTransfer.files);
                }}
                className={cn(
                  'w-full flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60 hover:bg-surface-muted',
                )}
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UploadCloud className="w-5 h-5" aria-hidden />
                </span>
                <span className="text-sm font-semibold text-foreground">
                  <span className="hidden sm:inline">Glissez vos fichiers ici ou </span>
                  <span className="text-primary">choisissez des fichiers</span>
                </span>
                <span className="text-xs text-muted">
                  Images ou vidéos · {MAX_MEDIA - media.length - uploads.length} emplacement{MAX_MEDIA - media.length - uploads.length > 1 ? 's' : ''} restant{MAX_MEDIA - media.length - uploads.length > 1 ? 's' : ''}
                </span>
              </button>
            ) : (
              <p className="text-xs text-muted">Limite de {MAX_MEDIA} médias atteinte. Retirez-en un pour en ajouter d’autres.</p>
            )}

            {media.length > 0 || uploads.length > 0 ? (
              <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2" aria-label="Médias de la réalisation">
                {media.map((m, i) => (
                  <li key={`${m.url}-${i}`} className="group/m relative aspect-square overflow-hidden rounded-xl border border-border bg-surface-muted">
                    {isVideoMedia(m) ? (
                      <video src={m.url} className="h-full w-full object-cover" muted playsInline />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sizedMediaUrl(m.url, 320)} alt={`Média ${i + 1}`} className="h-full w-full object-cover" />
                    )}
                    {i === 0 ? (
                      <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-full bg-primary-solid px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                        <Star className="w-3 h-3 fill-current" aria-hidden /> Couverture
                      </span>
                    ) : null}
                    {isVideoMedia(m) ? (
                      <span className="absolute top-1 left-1 inline-flex items-center rounded-full bg-stage/70 p-1 text-stage-foreground">
                        <Play className="w-3 h-3 fill-current" aria-label="Vidéo" />
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setMedia((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 h-8 w-8 inline-flex items-center justify-center rounded-full bg-stage/75 text-white hover:bg-stage transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      aria-label={`Retirer le média ${i + 1}`}
                    >
                      <X className="w-4 h-4" aria-hidden />
                    </button>
                    {media.length > 1 ? (
                      <span className="absolute bottom-1 right-1 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover/m:opacity-100 sm:focus-within:opacity-100 transition">
                        {i > 0 ? (
                          <button
                            type="button"
                            onClick={() => moveMedia(i, i - 1)}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-surface/95 text-foreground shadow-2xs hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                            aria-label={i === 1 ? `Mettre le média ${i + 1} en couverture` : `Déplacer le média ${i + 1} vers la gauche`}
                            title={i === 1 ? 'Mettre en couverture' : 'Déplacer à gauche'}
                          >
                            <ChevronLeft className="w-4 h-4" aria-hidden />
                          </button>
                        ) : null}
                        {i < media.length - 1 ? (
                          <button
                            type="button"
                            onClick={() => moveMedia(i, i + 1)}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-surface/95 text-foreground shadow-2xs hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                            aria-label={`Déplacer le média ${i + 1} vers la droite`}
                            title="Déplacer à droite"
                          >
                            <ChevronRight className="w-4 h-4" aria-hidden />
                          </button>
                        ) : null}
                      </span>
                    ) : null}
                  </li>
                ))}
                {uploads.map((u) => (
                  <li
                    key={u.id}
                    className="aspect-square rounded-xl border border-dashed border-primary/50 bg-primary/5 flex flex-col items-center justify-center gap-1 p-2 text-center"
                  >
                    <Loader2 className="w-5 h-5 text-primary animate-spin" aria-hidden />
                    <span className="text-[11px] text-muted line-clamp-2 break-all">{u.name}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          {/* Étape 3 : texte */}
          <section className={stepClass} aria-labelledby="step-text">
            <div id="step-text">
              <StepTitle
                n={3}
                title="Description"
                hint="Facultatif si vous ajoutez des médias. Racontez l’événement, le décor, l’ambiance…"
                done={Boolean(content.trim())}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="publication-create-textarea" className="sr-only">
                Description de la réalisation
              </label>
              <textarea
                id="publication-create-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                maxLength={MAX_CONTENT}
                placeholder="Ex. : Mariage de 250 invités, décor champêtre et éclairage chaud…"
                className="w-full rounded-xl border border-border bg-surface-muted px-3.5 py-3 text-base sm:text-sm resize-y min-h-[7rem] text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                aria-describedby="publication-desc-count"
              />
              <div className="flex justify-end text-xs text-muted">
                <span
                  id="publication-desc-count"
                  className={cn('tabular-nums', content.length > MAX_CONTENT - 200 && 'text-rose-600 dark:text-rose-400 font-semibold')}
                >
                  {content.length} / {MAX_CONTENT}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Aperçu en direct */}
        <aside className="lg:col-span-2 lg:sticky lg:top-4 space-y-3" aria-label="Aperçu">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wide">
            <Eye className="w-3.5 h-3.5" aria-hidden /> Aperçu dans le fil
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-2xs">
            <div className="relative aspect-square bg-surface-muted">
              {media[0] ? (
                isVideoMedia(media[0]) ? (
                  <video src={media[0].url} muted playsInline className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sizedMediaUrl(media[0].url, 640)} alt="" className="h-full w-full object-cover" />
                )
              ) : content.trim() ? (
                <div className="h-full w-full p-5 flex items-center text-sm text-foreground line-clamp-6 bg-gradient-to-br from-primary/10 to-surface-muted">
                  {content}
                </div>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-muted">
                  <ImageIcon className="w-8 h-8" aria-hidden />
                  <span className="text-xs">Votre couverture apparaîtra ici</span>
                </div>
              )}
              {media.length > 1 ? (
                <span className="absolute top-2 left-2 inline-flex min-h-7 items-center gap-1 rounded-full bg-stage/70 px-2 text-xs font-semibold text-stage-foreground">
                  <Images className="w-3 h-3" aria-hidden /> +{media.length - 1}
                </span>
              ) : null}
            </div>
            <div className="p-3.5 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground truncate">
                  {selectedTarget?.label || editing?.author?.name || 'Choisissez une fiche'}
                </span>
                <span className="text-xs text-muted shrink-0">{isEdit ? formatRelativeDate(editing!.createdAt) : "À l'instant"}</span>
              </div>
              {content.trim() ? <p className="text-xs text-muted line-clamp-3">{content}</p> : null}
            </div>
          </div>

          <div className="hidden lg:flex gap-2">
            <Button variant="secondary" onClick={requestCancel} disabled={submitting}>
              Annuler
            </Button>
            <Button
              className="flex-1"
              onClick={() => void submit()}
              disabled={!canSubmit}
              loading={submitting}
              leftIcon={!submitting ? (isEdit ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />) : undefined}
            >
              {isEdit ? 'Enregistrer' : 'Publier la réalisation'}
            </Button>
          </div>
          <SubmitHint targetId={isEdit ? 'locked' : targetId} hasBody={hasBody} uploading={uploading} isEdit={isEdit} dirty={dirty} className="hidden lg:block" />
        </aside>
      </div>

      {/* Barre d'action mobile */}
      <div className="lg:hidden sticky bottom-[calc(5.5rem+var(--em-site-install-bar,0px)+env(safe-area-inset-bottom,0px))] md:bottom-3 z-20 rounded-2xl border border-border bg-surface/95 backdrop-blur p-3 space-y-1.5 shadow-lg">
        <SubmitHint targetId={isEdit ? 'locked' : targetId} hasBody={hasBody} uploading={uploading} isEdit={isEdit} dirty={dirty} />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={requestCancel} disabled={submitting}>
            Annuler
          </Button>
          <Button
            className="flex-1"
            onClick={() => void submit()}
            disabled={!canSubmit}
            loading={submitting}
          >
            {isEdit ? 'Enregistrer' : 'Publier'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        onConfirm={() => {
          setConfirmLeave(false);
          onCancel();
        }}
        title="Abandonner les modifications ?"
        description="Les photos et le texte non enregistrés seront perdus."
        confirmLabel="Abandonner"
        cancelLabel="Continuer l’édition"
        tone="danger"
      />
    </div>
  );
}

function SubmitHint({
  targetId,
  hasBody,
  uploading,
  isEdit,
  dirty,
  className,
}: {
  targetId: string;
  hasBody: boolean;
  uploading: boolean;
  isEdit: boolean;
  dirty: boolean;
  className?: string;
}) {
  const hint = !targetId
    ? 'Choisissez une fiche pour continuer.'
    : !hasBody
      ? 'Ajoutez une photo, une vidéo ou un texte.'
      : uploading
        ? 'Téléversement en cours…'
        : isEdit && !dirty
          ? 'Aucune modification pour l’instant.'
          : null;
  if (!hint) return null;
  return <p className={cn('text-xs text-muted text-center', className)} aria-live="polite">{hint}</p>;
}

function TargetSummary({
  target,
  fallbackName,
  kind,
}: {
  target: FeedTarget | null;
  fallbackName?: string;
  kind: 'venue' | 'service';
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-muted p-2">
      <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface flex items-center justify-center">
        {target?.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sizedMediaUrl(target.coverUrl, 120)} alt="" className="h-full w-full object-cover" />
        ) : kind === 'venue' ? (
          <Building2 className="w-5 h-5 text-muted" aria-hidden />
        ) : (
          <Sparkles className="w-5 h-5 text-muted" aria-hidden />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground truncate">{target?.label || fallbackName || 'Fiche'}</span>
        <span className="block text-xs text-muted truncate">{postKindLabel(kind)}{target?.city ? ` · ${target.city}` : ''}</span>
      </span>
      <Badge variant="primary">Liée</Badge>
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
