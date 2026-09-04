'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { enabledMarketplaceCities, enabledPublicCities, isEnabledMarketplaceCity } from '@/lib/platformCities';
import { isVideoUrl, sizedMediaUrl } from '@/lib/marketplace';
import ImageLightbox from '@/components/marketplace/ImageLightbox';
import {
  Building2, Heart, Loader2, MessageCircle, Rss, Send, Sparkles,
  X, MapPin, Share2, Check, ArrowUpRight, Search, Plus, Maximize2,
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
          maxLength={600}
          disabled={busy}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSend();
          }}
          placeholder="Envoyer un message ou commenter…"
          className="w-full min-h-11 pl-4 pr-10 rounded-full border border-border bg-surface text-base sm:text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-2xs"
          aria-label={`Commenter la réalisation de ${authorName || 'ce partenaire'}`}
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
  const author = post.author;
  const href = authorHref(author, linkBase);
  const isVendor = author?.kind === 'vendor';
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
      className="group/card w-full rounded-xl sm:rounded-2xl border border-border/80 bg-surface shadow-xs hover:shadow-md transition-all duration-300 p-2 sm:p-2.5 space-y-2.5 [content-visibility:auto] [contain-intrinsic-size:0_480px]"
    >
      {/* ─── CAS 1 : Publication avec Médias (Carte Snapchat Spotlight) ─── */}
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

          {/* En-tête flottant Story (Profil + Bouton Voir la fiche) */}
          <div className={cn(
            'absolute inset-x-3 sm:inset-x-4 z-20 flex items-center justify-between pointer-events-none',
            media.length > 1 ? 'top-6' : 'top-3 sm:top-4',
          )}>
            {/* Pilule Auteur translucide */}
            <div className="pointer-events-auto inline-flex items-center gap-2 p-1 pr-3 sm:pr-3.5 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-white shadow-lg transition-transform hover:scale-[1.02]">
              <div className={cn(
                'w-8 h-8 rounded-full p-[1.5px] overflow-hidden shrink-0 flex items-center justify-center',
                isVendor
                  ? 'bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-500'
                  : 'bg-gradient-to-tr from-emerald-400 via-teal-400 to-cyan-500',
              )}>
                {author?.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sizedMediaUrl(author.coverUrl, 160)}
                    alt={author.name ? `Logo de ${author.name}` : 'Photo de profil'}
                    className="w-full h-full object-cover rounded-full"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white">
                    {isVendor ? <Sparkles className="w-3.5 h-3.5 text-amber-400" /> : <Building2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-1.5">
                  {href ? (
                    <Link
                      href={href}
                      className="text-xs sm:text-[13px] font-bold tracking-tight text-white hover:text-white/80 truncate max-w-[130px] sm:max-w-[180px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                    >
                      {author?.name || 'Partenaire'}
                    </Link>
                  ) : (
                    <span className="text-xs sm:text-[13px] font-bold tracking-tight text-white truncate max-w-[130px] sm:max-w-[180px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {author?.name || 'Partenaire'}
                    </span>
                  )}
                  <span className={cn(
                    'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border',
                    isVendor
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
                  )}>
                    {isVendor ? 'Pro' : 'Salle'}
                  </span>
                </div>
                <span className="text-[11px] text-white/85 font-medium truncate flex items-center gap-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
                  {author?.city ? `${author.city} · ` : ''}{formatRelativeDate(post.createdAt)}
                </span>
              </div>
            </div>

            {/* Bouton Voir la fiche (Pill blanc brillant) */}
            {href && (
              <Link
                href={href}
                className="pointer-events-auto shrink-0 inline-flex items-center gap-1 min-h-8 px-3 rounded-full bg-white/95 hover:bg-white text-slate-950 font-bold text-xs shadow-md backdrop-blur-xs transition active:scale-95 hover:scale-105"
              >
                <span>Fiche</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            )}
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
                alt={`Snap publié par ${author?.name || 'un pro'}`}
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
              aria-label={liked ? "Je n'aime plus cette réalisation" : `Aimer cette réalisation (${post.likeCount ?? likes.length} mentions j'aime)`}
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
              aria-controls={`post-comments-${post.id}`}
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
              aria-label={isCopied ? "Lien copié dans le presse-papier" : "Partager cette réalisation ou copier le lien"}
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
                <span className="hidden sm:inline text-[11px] text-white/85 font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">Touchez les côtés ou glissez</span>
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
          isVendor
            ? 'bg-gradient-to-br from-amber-600 via-rose-600 to-purple-800'
            : 'bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900',
        )}>
          {/* En-tête auteur */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full p-[1.5px] bg-white/30 backdrop-blur-xs flex items-center justify-center">
                {author?.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sizedMediaUrl(author.coverUrl, 120)} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full rounded-full bg-black/20 flex items-center justify-center text-white">
                    {isVendor ? <Sparkles className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm text-white drop-shadow-xs">{author?.name || 'Partenaire'}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-white/20 border border-white/20 text-white">
                    {isVendor ? 'Pro' : 'Salle'}
                  </span>
                </div>
                <p className="text-[10px] text-white/70">{formatRelativeDate(post.createdAt)}</p>
              </div>
            </div>
            {href && (
              <Link
                href={href}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white text-slate-900 font-bold text-xs shadow-md hover:bg-white/90 transition active:scale-95"
              >
                <span>Fiche</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            )}
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
                aria-label={liked ? "Je n'aime plus cette réalisation" : `Aimer cette réalisation (${post.likeCount ?? likes.length} mentions j'aime)`}
              >
                <Heart className={cn('w-4 h-4', liked && 'fill-current')} />
                <span className="tabular-nums">{post.likeCount ?? likes.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setCommentsExpanded((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition text-xs font-bold"
                aria-expanded={commentsExpanded}
                aria-controls={`post-comments-${post.id}`}
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
              aria-label={isCopied ? "Lien copié dans le presse-papier" : "Partager cette réalisation ou copier le lien"}
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Share2 className="w-4 h-4" />}
              <span>{isCopied ? 'Copié !' : 'Partager'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── Section Commentaires (dépliable sous la carte) ─── */}
      {commentsExpanded && (
        <div id={`post-comments-${post.id}`} className="px-3 pb-3 pt-2 space-y-3 animate-fade-in border-t border-border/50" aria-live="polite">
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
            <PostCommentBox
              postId={post.id}
              onSubmit={onSubmitComment}
              busy={isCommentBusy}
              authorName={author?.name}
            />
          )}
        </div>
      )}
    </article>
  );
});

export function GlobalFeedSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Chargement des réalisations">
      {/* Skeleton de la barre de Stories */}
      <div className="rounded-xl sm:rounded-2xl border border-border/70 bg-surface p-3 sm:p-4 space-y-2.5 shadow-2xs overflow-hidden animate-pulse">
        <div className="flex items-center justify-between pb-1">
          <div className="h-3 w-32 bg-surface-muted rounded-full" />
          <div className="h-3 w-16 bg-surface-muted rounded-full" />
        </div>
        <div className="flex items-center gap-3.5 overflow-hidden py-1">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-surface-muted border-2 border-border/70" />
              <div className="h-2.5 w-12 bg-surface-muted rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Skeletons des cartes de publication */}
      {[...Array(2)].map((_, i) => (
        <article
          key={i}
          className="w-full rounded-xl sm:rounded-2xl border border-border/80 bg-surface shadow-xs p-2 sm:p-2.5 space-y-2.5 animate-pulse"
        >
          <div className="relative w-full aspect-[4/5] sm:aspect-[4/5] md:aspect-[3/4] max-h-[620px] rounded-lg sm:rounded-xl overflow-hidden bg-slate-900/90 dark:bg-slate-950 flex flex-col justify-between p-3.5 sm:p-4">
            {/* Header flottant */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 p-1 pr-3 rounded-full bg-white/10 backdrop-blur-md">
                <div className="w-8 h-8 rounded-full bg-white/20" />
                <div className="space-y-1">
                  <div className="h-3 w-24 bg-white/25 rounded" />
                  <div className="h-2 w-16 bg-white/15 rounded" />
                </div>
              </div>
              <div className="h-7 w-20 rounded-full bg-white/15" />
            </div>

            {/* Dock latéral droit */}
            <div className="absolute right-3 bottom-14 sm:bottom-16 flex flex-col items-center gap-2.5">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-sm" />
              ))}
            </div>

            {/* Bas de carte */}
            <div className="space-y-1.5 max-w-[70%]">
              <div className="h-3.5 w-full bg-white/25 rounded" />
              <div className="h-3 w-3/4 bg-white/15 rounded" />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
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
  const { site } = usePlatformSite();
  const marketplaceCities = enabledMarketplaceCities(site);
  const displayCities = enabledPublicCities(site);
  const [kind, setKind] = useState<GlobalFeedKind>('all');
  const [city, setCity] = useState('');
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
          setError(err instanceof Error ? err.message : 'Impossible de charger les réalisations.');
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
      setError(err instanceof Error ? err.message : 'Impossible de charger plus de réalisations.');
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
          title: 'Réalisation sur EventMaster',
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

  const visiblePosts = useMemo(() => {
    return posts.filter((post) => {
      const raw = post.author?.city;
      if (city) {
        return String(raw || '').toLowerCase().includes(city.toLowerCase());
      }
      if (!raw) return true;
      return (
        isEnabledMarketplaceCity(raw, site)
        || displayCities.some((name) => String(raw).toLowerCase().includes(name.toLowerCase()))
      );
    });
  }, [posts, city, site, displayCities]);

  const storyAuthors = useMemo(() => {
    const map = new Map<string, { author: FeedAuthor; postCount: number }>();
    for (const p of visiblePosts) {
      if (p.author && !map.has(p.author.name)) {
        map.set(p.author.name, {
          author: p.author,
          postCount: 1,
        });
      } else if (p.author) {
        const item = map.get(p.author.name);
        if (item) item.postCount += 1;
      }
    }
    return Array.from(map.values());
  }, [visiblePosts]);

  const kindTabs: Array<{
    id: GlobalFeedKind;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'all', label: 'Toutes les réalisations', shortLabel: 'Toutes', icon: Rss },
    { id: 'venue', label: 'Salles & Espaces', shortLabel: 'Salles', icon: Building2 },
    { id: 'vendor', label: 'Prestataires & Métiers', shortLabel: 'Prestataires', icon: Sparkles },
  ];

  return (
    <div className={cn('space-y-6', className)}>
      {/* ─── Barre de Stories Snapchat ─── */}
      <div className="rounded-xl sm:rounded-2xl border border-border/80 bg-surface p-3 sm:p-4 space-y-2 shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Stories & Réalisations</h2>
          </div>
          {search.trim() ? (
            <button
              type="button"
              onClick={() => { setSearch(''); setQ(''); }}
              className="text-xs font-semibold text-primary hover:underline transition"
            >
              Afficher tout
            </button>
          ) : (
            <span className="text-[11px] text-muted font-medium hidden sm:inline">Activité en direct des pros</span>
          )}
        </div>

        {/* Carousel horizontal de stories avec défilement tactile fluide */}
        <div className="flex items-center gap-3.5 sm:gap-4 overflow-x-auto no-scrollbar overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch] select-none py-1 px-0.5">
          {/* Bulle 1 : Publier / Votre Story */}
          <Link
            href={user ? '/dashboard/publications?tab=create' : loginHref}
            className="shrink-0 flex flex-col items-center gap-1.5 group/story focus-visible:outline-none"
          >
            <div className="relative w-14 h-14 sm:w-15 sm:h-15 rounded-full p-[2px] bg-gradient-to-tr from-primary via-emerald-400 to-amber-400 group-hover/story:scale-105 transition-transform duration-200">
              <div className="w-full h-full rounded-full bg-surface border-2 border-surface flex items-center justify-center text-primary shadow-2xs">
                <Plus className="w-5 h-5 sm:w-6 sm:h-6 group-hover/story:rotate-90 transition-transform duration-300" />
              </div>
              <span className="absolute bottom-0 right-0 w-4.5 h-4.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shadow-xs">
                +
              </span>
            </div>
            <span className="text-[11px] font-bold text-foreground text-center truncate max-w-[64px]">
              {user ? 'Votre Story' : 'Publier'}
            </span>
          </Link>

          {/* Bulles suivantes : Profils des partenaires avec anneaux gradient Snapchat */}
          {storyAuthors.map(({ author }) => {
            const isVendor = author.kind === 'vendor';
            const isSelected = search.toLowerCase() === author.name.toLowerCase();

            return (
              <button
                key={author.name}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setSearch('');
                    setQ('');
                  } else {
                    setSearch(author.name);
                    setQ(author.name);
                  }
                }}
                className="shrink-0 flex flex-col items-center gap-1.5 group/story focus-visible:outline-none"
                aria-pressed={isSelected}
                aria-label={`Filtrer par les stories de ${author.name}`}
                title={`Filtrer les stories de ${author.name}`}
              >
                <div className={cn(
                  'relative w-14 h-14 sm:w-15 sm:h-15 rounded-full p-[2.5px] transition-transform duration-200 group-hover/story:scale-105',
                  isSelected
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface scale-105'
                    : '',
                  isVendor
                    ? 'bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-500'
                    : 'bg-gradient-to-tr from-emerald-400 via-teal-400 to-cyan-500',
                )}>
                  <div className="w-full h-full rounded-full overflow-hidden bg-surface border-2 border-surface flex items-center justify-center">
                    {author.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sizedMediaUrl(author.coverUrl, 160)}
                        alt={author.name}
                        className="w-full h-full object-cover rounded-full"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-surface-muted flex items-center justify-center text-muted">
                        {isVendor ? <Sparkles className="w-5 h-5 text-amber-500" /> : <Building2 className="w-5 h-5 text-emerald-500" />}
                      </div>
                    )}
                  </div>
                  {/* Badge Salle ou Pro */}
                  <span className={cn(
                    'absolute bottom-0 right-0 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shadow-xs border border-surface text-white',
                    isVendor ? 'bg-amber-500' : 'bg-emerald-500',
                  )}>
                    {isVendor ? '★' : '🏛'}
                  </span>
                </div>
                <span className={cn(
                  'text-[11px] text-center truncate max-w-[68px] transition-colors',
                  isSelected ? 'text-primary font-bold' : 'text-foreground font-medium',
                )}>
                  {author.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Barre d'outils / Filtres & Recherche (Toujours visible lors du défilement) */}
      <div className="sticky top-[var(--em-site-header)] z-30 flex flex-col md:flex-row gap-1.5 md:gap-3 md:items-center justify-between bg-surface/95 dark:bg-slate-900/95 backdrop-blur-xl p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl border border-border/80 shadow-md">
        <div className="inline-flex gap-1 p-0.5 sm:p-1 rounded-lg sm:rounded-xl bg-surface-muted/80 border border-border/50 max-w-full overflow-x-auto [scrollbar-width:none]">
          {kindTabs.map((tab) => {
            const Icon = tab.icon;
            const active = kind === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setKind(tab.id)}
                className={cn(
                  'inline-flex items-center gap-1 sm:gap-2 min-h-8 sm:min-h-10 px-2 sm:px-3.5 rounded-lg text-[11px] sm:text-xs font-semibold transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
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
        {marketplaceCities.length > 1 ? (
          <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] md:contents">
            {marketplaceCities.map((name) => {
              const active = city === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setCity(active ? '' : name)}
                  className={cn(
                    'inline-flex items-center gap-1 min-h-8 px-2.5 rounded-lg text-[11px] font-semibold shrink-0 border transition',
                    active
                      ? 'bg-primary-solid text-primary-foreground border-primary-solid'
                      : 'bg-surface text-muted border-border hover:text-foreground',
                  )}
                >
                  <MapPin className="w-3 h-3" />
                  {name}
                </button>
              );
            })}
          </div>
        ) : null}

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
              className="w-full min-h-9 sm:min-h-11 pl-9 pr-16 rounded-xl border border-border bg-surface text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              aria-label="Rechercher dans les réalisations"
            />
            {q.trim() && (
              <button
                type="button"
                onClick={() => {
                  setQ('');
                  setSearch('');
                }}
                className="absolute right-12 min-h-9 min-w-9 p-1.5 inline-flex items-center justify-center text-muted hover:text-foreground rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                title="Effacer la recherche"
                aria-label="Effacer la recherche"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 min-h-9 px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label="Lancer la recherche"
            >
              Go
            </button>
          </div>
        </form>
      </div>

      {error ? (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm font-medium flex items-center justify-between gap-3" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => {
              setError('');
              setSearch((prev) => (prev ? `${prev} ` : ''));
            }}
            className="shrink-0 px-3 py-1 rounded-lg bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 transition"
          >
            Réessayer
          </button>
        </div>
      ) : null}

      {loading ? (
        <GlobalFeedSkeleton />
      ) : visiblePosts.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-xl sm:rounded-2xl border border-dashed border-border bg-surface/40 space-y-3 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-xs">
            <Rss className="w-6 h-6" aria-hidden />
          </div>
          <h3 className="text-base font-bold text-foreground">Aucune réalisation pour le moment</h3>
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            {search.trim()
              ? 'Aucun résultat ne correspond à votre recherche. Essayez d’autres mots-clés.'
              : 'Les salles et prestataires certifiés partageront ici leurs photos, vidéos et réalisations.'}
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
          {visiblePosts.map((post) => (
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
              Chargement des réalisations suivantes…
            </span>
          ) : (
            'Charger plus de réalisations'
          )}
        </button>
      ) : null}

      {/* Lightbox photo plein écran accessible */}
      {lightbox && (
        <ImageLightbox
          urls={lightbox.urls}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
          title="Fil des réalisations"
        />
      )}
    </div>
  );
}
