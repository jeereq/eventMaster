'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { uploadMarketplaceMedia } from '@/lib/cloudinaryUpload';
import { isVideoUrl } from '@/lib/marketplace';
import { cn } from '@/lib/cn';
import {
  PageHeader, Breadcrumbs, Alert, Button, EmptyState,
} from '@/components/ui';
import MarketplaceGlobalActivityFeed from '@/components/marketplace/MarketplaceGlobalActivityFeed';
import {
  Building2, Heart, Loader2, MessageCircle, Plus, Rss, Send, Sparkles,
  Trash2, X, Image as ImageIcon,
} from 'lucide-react';

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
    setTabState(parseTab(searchParams.get('tab')));
  }, [searchParams]);

  const setTab = (next: DeskTab) => {
    setTabState(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'grid') params.delete('tab');
    else params.set('tab', next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="space-y-6 w-full max-w-5xl">
      <PageHeader
        title="Publications"
        description="Fil d’actualité des salles et prestations — grille type réseau social, et création liée à vos fiches."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Publications', href: '/dashboard/publications' },
              { label: tab === 'create' ? 'Créer' : 'Grille' },
            ]}
          />
        }
      />

      <div
        role="tablist"
        aria-label="Publications"
        className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/40 p-1"
      >
        {[
          { id: 'grid' as const, label: 'Découvrir', icon: Rss },
          { id: 'create' as const, label: 'Créer', icon: Plus },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              'inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition',
              tab === item.id
                ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
                : 'text-muted hover:bg-surface/70 hover:text-foreground',
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'grid' ? (
        <PublicationsGrid />
      ) : canPublish ? (
        <CreatePublicationPanel
          onCreated={() => setTab('grid')}
        />
      ) : (
        <EmptyState
          icon={<Rss className="w-5 h-5" />}
          title="Publication réservée aux propriétaires"
          description="Seuls les comptes qui gèrent des salles ou des prestations peuvent créer des publications."
        />
      )}
    </div>
  );
}

function PublicationsGrid() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<MyPost | null>(null);
  const [kind, setKind] = useState<'all' | 'venue' | 'vendor'>('all');

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
    <div className="space-y-4">
      <div className="inline-flex gap-0.5 p-0.5 rounded-[var(--radius-button)] border border-border bg-surface-muted">
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
            onClick={() => setKind(id)}
            className={cn(
              'min-h-11 px-3.5 rounded-[var(--radius-button)] text-xs font-semibold transition',
              kind === id ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-surface-muted animate-pulse" />
          ))}
        </div>
      ) : tiles.length === 0 ? (
        <EmptyState
          icon={<Rss className="w-5 h-5" />}
          title="Aucune publication"
          description="Dès que des salles ou prestations partagent une actualité, elle apparaîtra ici en grille."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2">
          {tiles.map((post) => {
            const media = post.mediaUrls?.[0];
            const video = media && (media.type === 'VIDEO' || isVideoUrl(media.url));
            return (
              <button
                key={post.id}
                type="button"
                onClick={() => setSelected(post)}
                className="group relative aspect-square overflow-hidden rounded-lg bg-surface-muted border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                {media ? (
                  video ? (
                    <video src={media.url} muted className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={media.url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                  )
                ) : (
                  <div className="h-full w-full p-3 flex items-end bg-gradient-to-br from-primary/15 to-surface-muted">
                    <p className="text-xs text-foreground line-clamp-4 text-left">{post.content}</p>
                  </div>
                )}
                <span className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 text-white text-xs font-semibold">
                  <span className="inline-flex items-center gap-1">
                    <Heart className="w-4 h-4 fill-white" /> {post.likeCount ?? post.likes?.length ?? 0}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" /> {post.comments?.length ?? 0}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {nextCursor ? (
        <button
          type="button"
          onClick={() => void load(nextCursor)}
          className="w-full min-h-11 rounded-xl border border-border text-sm font-semibold text-muted hover:text-foreground hover:bg-surface-muted"
        >
          Voir plus
        </button>
      ) : null}

      {/* Liste détaillée sous la grille pour interactions complètes */}
      <details className="rounded-xl border border-border bg-surface">
        <summary className="cursor-pointer min-h-11 px-4 py-3 text-sm font-semibold text-foreground">
          Fil détaillé (likes & commentaires)
        </summary>
        <div className="px-4 pb-4">
          <MarketplaceGlobalActivityFeed linkBase="dashboard" compactLoginHint={Boolean(user)} />
        </div>
      </details>

      {selected ? (
        <PostDetailModal post={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}

function PostDetailModal({ post, onClose }: { post: MyPost; onClose: () => void }) {
  const media = post.mediaUrls || [];
  const href = post.author?.href
    ? post.author.href.replace(/^\/marketplace\//, '/dashboard/catalogue/')
    : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Publication"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-auto border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{post.author?.name || 'Publication'}</p>
            <p className="text-[11px] text-muted">
              {post.author?.kind === 'venue' ? 'Salle' : 'Prestation'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-muted hover:bg-surface-muted" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>
        {media[0] ? (
          <div className="bg-black aspect-square sm:aspect-video max-h-[50vh]">
            {media[0].type === 'VIDEO' || isVideoUrl(media[0].url) ? (
              <video src={media[0].url} controls className="w-full h-full object-contain" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={media[0].url} alt="" className="w-full h-full object-contain" />
            )}
          </div>
        ) : null}
        <div className="p-4 space-y-3">
          {post.content ? (
            <p className="text-sm text-foreground whitespace-pre-line">{post.content}</p>
          ) : null}
          <div className="flex items-center gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" /> {post.likeCount ?? post.likes?.length ?? 0}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5" /> {post.comments?.length ?? 0}
            </span>
            {href ? (
              <Link href={href} className="ml-auto font-semibold text-primary hover:underline">
                Voir la fiche
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
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
      setSuccess('Publication créée.');
      await loadTargets();
      onCreated();
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
      setMyPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Suppression impossible.');
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
        description="Créez et publiez d’abord une salle ou une prestation, puis revenez créer une publication."
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

        <div className="rounded-2xl border border-border bg-surface p-4 space-y-4">
          <div className="inline-flex gap-0.5 p-0.5 rounded-[var(--radius-button)] border border-border bg-surface-muted">
            <button
              type="button"
              onClick={() => setTargetKind('venue')}
              disabled={targets.venues.length === 0}
              className={cn(
                'min-h-11 px-3 rounded-[var(--radius-button)] text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-40',
                targetKind === 'venue' ? 'bg-surface text-foreground shadow-sm' : 'text-muted',
              )}
            >
              <Building2 className="w-3.5 h-3.5" /> Salle
            </button>
            <button
              type="button"
              onClick={() => setTargetKind('service')}
              disabled={targets.services.length === 0}
              className={cn(
                'min-h-11 px-3 rounded-[var(--radius-button)] text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-40',
                targetKind === 'service' ? 'bg-surface text-foreground shadow-sm' : 'text-muted',
              )}
            >
              <Sparkles className="w-3.5 h-3.5" /> Prestation
            </button>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted">Lier à</span>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full min-h-11 px-3 rounded-xl border border-border bg-surface text-sm"
            >
              {options.map((o) => (
                <option key={o.id} value={o.id} disabled={!o.isPublic}>
                  {o.label}{o.city ? ` · ${o.city}` : ''}{!o.isPublic ? ' (brouillon)' : ''}
                </option>
              ))}
            </select>
          </label>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            maxLength={4000}
            placeholder="Décrivez votre activité, une nouveauté, une réalisation…"
            className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm resize-y min-h-[6rem] focus:outline-none focus:ring-2 focus:ring-primary/40"
          />

          {media.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {media.map((m, i) => (
                <div key={`${m.url}-${i}`} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border">
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
                    aria-label="Retirer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
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
              className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl border border-border text-xs font-semibold text-muted hover:text-foreground disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
              Médias
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
        <h2 className="text-sm font-semibold text-foreground">Vos publications</h2>
        {myPosts.length === 0 ? (
          <p className="text-xs text-muted">Aucune publication pour l’instant.</p>
        ) : (
          <ul className="space-y-2">
            {myPosts.slice(0, 12).map((p) => (
              <li key={p.id} className="rounded-xl border border-border bg-surface p-3 flex gap-3">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-surface-muted shrink-0">
                  {p.mediaUrls?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.mediaUrls[0].url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Rss className="w-4 h-4 text-muted" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground truncate">{p.author?.name}</p>
                  <p className="text-[11px] text-muted line-clamp-2">{p.content || 'Média'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(p.id)}
                  className="p-2 text-muted hover:text-rose-600"
                  aria-label="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function DashboardPublicationsPage() {
  return (
    <Suspense fallback={<div className="py-16 text-sm text-muted">Chargement des publications…</div>}>
      <DashboardPublicationsPageInner />
    </Suspense>
  );
}
