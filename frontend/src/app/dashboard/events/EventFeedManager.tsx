'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '@/lib/api';
import { downloadMedia, downloadMediaBatch, getMediaExtension, sanitizeFilenamePart } from '@/lib/downloadMedia';
import { useAuth } from '@/context/AuthContext';
import {
  Image, Send, Trash2,
  Loader2, Heart, Plus, Video, Eye, MessageCircle,
  RefreshCw, X, ChevronLeft, ChevronRight, BookOpen,
  Rss, Search, Download, Globe
} from 'lucide-react';

interface Comment {
  id: string;
  postId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

interface PostMedia {
  url: string;
  type: 'IMAGE' | 'VIDEO';
}

interface Post {
  id: string;
  eventId: string;
  content: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  mediaUrls: PostMedia[] | null;
  likes?: string[] | null;
  publishedOnListing?: boolean;
  createdAt: string;
  comments: Comment[];
}

interface GuestShare {
  id: string;
  eventId: string;
  guestId: string;
  message: string | null;
  photo: string | null;
  photos: string[] | null;
  createdAt: string;
  guest: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface EventFeedManagerProps {
  eventId: string;
  canPublishOnListing?: boolean;
}

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
    day: 'numeric', month: 'long', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit', minute: '2-digit'
  });
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
}

export default function EventFeedManager({ eventId, canPublishOnListing = false }: EventFeedManagerProps) {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'feed' | 'shares'>('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [shares, setShares] = useState<GuestShare[]>([]);
  const [shareSearch, setShareSearch] = useState('');

  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingShares, setLoadingShares] = useState(true);
  const [submittingPost, setSubmittingPost] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState<Record<string, boolean>>({});

  const [postContent, setPostContent] = useState('');
  const [postMediaFiles, setPostMediaFiles] = useState<PostMedia[]>([]);
  const [publishOnListing, setPublishOnListing] = useState(false);
  const [togglingPostId, setTogglingPostId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [commentContents, setCommentContents] = useState<Record<string, string>>({});

  const [expandedImages, setExpandedImages] = useState<string[]>([]);
  const [expandedImageIndex, setExpandedImageIndex] = useState<number>(0);
  const [expandedImagePrefix, setExpandedImagePrefix] = useState('media');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFeed = async (silent = false) => {
    if (!silent) setLoadingPosts(true);
    else setIsRefreshing(true);
    try {
      const data = await api.get(`/events/${eventId}/feed`);
      setPosts(data);
    } catch (err) {
      console.error('Error loading event feed:', err);
    } finally {
      setLoadingPosts(false);
      setIsRefreshing(false);
    }
  };

  const loadShares = async (silent = false) => {
    if (!silent) setLoadingShares(true);
    else setIsRefreshing(true);
    try {
      const data = await api.get(`/events/${eventId}/shares`);
      setShares(data);
    } catch (err) {
      console.error('Error loading guest shares:', err);
    } finally {
      setLoadingShares(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!eventId) return;
    loadFeed();
    loadShares();
    const interval = setInterval(() => {
      loadFeed(true);
      loadShares(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [eventId]);

  const filteredShares = useMemo(() => {
    if (!shareSearch.trim()) return shares;
    const q = shareSearch.toLowerCase();
    return shares.filter(s =>
      `${s.guest.firstName} ${s.guest.lastName}`.toLowerCase().includes(q) ||
      s.guest.email.toLowerCase().includes(q) ||
      (s.message && s.message.toLowerCase().includes(q))
    );
  }, [shares, shareSearch]);

  const totalComments = useMemo(() => posts.reduce((acc, p) => acc + p.comments.length, 0), [posts]);
  const totalLikes = useMemo(() => posts.reduce((acc, p) => acc + (p.likes?.length || 0), 0), [posts]);

  const handleDownloadMedia = async (
    e: React.MouseEvent,
    url: string,
    filename: string
  ) => {
    e.stopPropagation();
    await downloadMedia(url, filename);
  };

  const handleDownloadFeedPostMedia = async (e: React.MouseEvent, post: Post) => {
    e.stopPropagation();
    const mediaList = getMediaList(post);
    const items = mediaList.map((media, idx) => ({
      url: media.url,
      filename: `feed-${sanitizeFilenamePart(post.id)}-${idx + 1}${getMediaExtension(media.url, media.type)}`,
    }));
    setIsBulkDownloading(true);
    try {
      await downloadMediaBatch(items);
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const handleDownloadSharePhotos = async (e: React.MouseEvent, share: GuestShare) => {
    e.stopPropagation();
    const photosList = getPhotosList(share);
    const guestSlug = sanitizeFilenamePart(`${share.guest.firstName}-${share.guest.lastName}`);
    const items = photosList.map((photo, idx) => ({
      url: photo,
      filename: `livre-dor-${guestSlug}-${idx + 1}${getMediaExtension(photo, 'IMAGE')}`,
    }));
    setIsBulkDownloading(true);
    try {
      await downloadMediaBatch(items);
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const handleDownloadAllVisibleMedia = async () => {
    setIsBulkDownloading(true);
    try {
      if (activeSubTab === 'feed') {
        const items = posts.flatMap((post) => {
          const mediaList = getMediaList(post);
          return mediaList.map((media, idx) => ({
            url: media.url,
            filename: `feed-${sanitizeFilenamePart(post.id)}-${idx + 1}${getMediaExtension(media.url, media.type)}`,
          }));
        });
        await downloadMediaBatch(items);
      } else {
        const items = filteredShares.flatMap((share) => {
          const photosList = getPhotosList(share);
          const guestSlug = sanitizeFilenamePart(`${share.guest.firstName}-${share.guest.lastName}`);
          return photosList.map((photo, idx) => ({
            url: photo,
            filename: `livre-dor-${guestSlug}-${idx + 1}${getMediaExtension(photo, 'IMAGE')}`,
          }));
        });
        await downloadMediaBatch(items);
      }
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const openImageModal = (images: string[], index: number, filenamePrefix = 'media') => {
    setExpandedImages(images);
    setExpandedImageIndex(index);
    setExpandedImagePrefix(filenamePrefix);
  };

  const handleMultipleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const newMediaFiles: PostMedia[] = [...postMediaFiles];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const base64 = await convertToBase64(file);
      const type = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
      newMediaFiles.push({ url: base64, type });
    }
    setPostMediaFiles(newMediaFiles);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleRemoveMediaFile = (index: number) => {
    setPostMediaFiles(postMediaFiles.filter((_, i) => i !== index));
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim() && postMediaFiles.length === 0) return;
    setSubmittingPost(true);
    try {
      const newPost = await api.post(`/events/${eventId}/feed`, {
        content: postContent,
        mediaUrls: postMediaFiles,
        publishedOnListing: canPublishOnListing && publishOnListing,
      });
      setPosts([{ ...newPost, comments: [], likes: [] }, ...posts]);
      setPostContent('');
      setPostMediaFiles([]);
      setPublishOnListing(false);
    } catch (err) {
      console.error('Error creating post:', err);
      alert('Erreur lors de la publication.');
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette publication ?')) return;
    try {
      await api.delete(`/events/${eventId}/feed/${postId}`);
      setPosts(posts.filter(p => p.id !== postId));
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('Erreur lors de la suppression.');
    }
  };

  const handleTogglePublishOnListing = async (post: Post) => {
    if (!canPublishOnListing) return;
    setTogglingPostId(post.id);
    try {
      const updated = await api.patch(`/events/${eventId}/feed/${post.id}`, {
        publishedOnListing: !post.publishedOnListing,
      });
      setPosts(posts.map((p) => (p.id === post.id ? { ...p, publishedOnListing: updated.publishedOnListing } : p)));
    } catch (err) {
      console.error('Error toggling listing publish:', err);
      alert('Impossible de modifier la visibilité publique.');
    } finally {
      setTogglingPostId(null);
    }
  };

  const handleDeleteShare = async (shareId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce message du livre d\'or ?')) return;
    try {
      await api.delete(`/events/${eventId}/shares/${shareId}`);
      setShares(shares.filter((s) => s.id !== shareId));
    } catch (err) {
      console.error('Error deleting share:', err);
      alert('Erreur lors de la suppression.');
    }
  };

  const handleCreateComment = async (postId: string) => {
    const content = commentContents[postId];
    if (!content || !content.trim()) return;
    setCommentSubmitting(prev => ({ ...prev, [postId]: true }));
    try {
      const newComment = await api.post(`/rsvp/feed/post/${postId}/comment`, {
        content,
        userId: user?.id,
      });
      setPosts(posts.map(p => {
        if (p.id === postId) {
          return { ...p, comments: [...p.comments, newComment] };
        }
        return p;
      }));
      setCommentContents(prev => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('Error creating comment:', err);
      alert('Erreur lors de l\'ajout du commentaire.');
    } finally {
      setCommentSubmitting(prev => ({ ...prev, [postId]: false }));
    }
  };

  const getMediaList = (post: Post): PostMedia[] =>
    post.mediaUrls && Array.isArray(post.mediaUrls)
      ? post.mediaUrls
      : (post.mediaUrl ? [{ url: post.mediaUrl, type: (post.mediaType as 'IMAGE' | 'VIDEO') || 'IMAGE' }] : []);

  const getPhotosList = (share: GuestShare): string[] =>
    share.photos && Array.isArray(share.photos)
      ? share.photos
      : (share.photo ? [share.photo] : []);

  const feedMediaCount = useMemo(
    () => posts.reduce((acc, post) => acc + getMediaList(post).length, 0),
    [posts]
  );

  const sharesMediaCount = useMemo(
    () => filteredShares.reduce((acc, share) => acc + getPhotosList(share).length, 0),
    [filteredShares]
  );

  const visibleMediaCount = activeSubTab === 'feed' ? feedMediaCount : sharesMediaCount;

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedImageIndex((prev) => (prev + 1) % expandedImages.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedImageIndex((prev) => (prev - 1 + expandedImages.length) % expandedImages.length);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">
            Interactions & Fil d&apos;actualité
          </h2>
          <p className="text-sm text-muted max-w-xl">
            Publiez des photos et annonces, consultez le livre d&apos;or et suivez les interactions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          {visibleMediaCount > 0 && (
            <button
              type="button"
              onClick={handleDownloadAllVisibleMedia}
              disabled={isBulkDownloading || isRefreshing}
              className="inline-flex items-center gap-2 px-3 py-2 bg-surface border border-border hover:bg-surface-muted disabled:opacity-50 text-foreground font-medium rounded-[var(--radius-button)] text-xs transition"
            >
              {isBulkDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Télécharger tout ({visibleMediaCount})
            </button>
          )}
          <button
            type="button"
            onClick={() => activeSubTab === 'feed' ? loadFeed() : loadShares()}
            disabled={isRefreshing || isBulkDownloading}
            className="inline-flex items-center gap-2 px-3 py-2 bg-surface border border-border hover:bg-surface-muted disabled:opacity-50 text-muted font-medium rounded-[var(--radius-button)] text-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 bg-surface-muted border border-border rounded-[var(--radius-card)] text-xs text-muted">
        <span>
          <span className="font-semibold tabular-nums text-foreground">{posts.length}</span>
          {' '}publication{posts.length !== 1 ? 's' : ''}
        </span>
        <span className="text-border hidden sm:inline" aria-hidden>·</span>
        <span>
          <span className="font-semibold tabular-nums text-foreground">{shares.length}</span>
          {' '}livre d&apos;or
        </span>
        <span className="text-border hidden sm:inline" aria-hidden>·</span>
        <span>
          <span className="font-semibold tabular-nums text-foreground">{totalComments}</span>
          {' '}commentaire{totalComments !== 1 ? 's' : ''}
        </span>
        <span className="text-border hidden sm:inline" aria-hidden>·</span>
        <span>
          <span className="font-semibold tabular-nums text-foreground">{totalLikes}</span>
          {' '}j&apos;aime
        </span>
      </div>

      {/* Sub-tabs */}
      <div
        className="inline-flex items-center rounded-lg border border-border bg-surface-muted p-0.5"
        role="group"
        aria-label="Section"
      >
        <button
          type="button"
          onClick={() => setActiveSubTab('feed')}
          aria-pressed={activeSubTab === 'feed'}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeSubTab === 'feed'
              ? 'bg-surface text-primary shadow-sm ring-1 ring-border'
              : 'text-muted hover:text-foreground'
          }`}
        >
          <Rss className="w-3.5 h-3.5" />
          Fil d&apos;actualité ({posts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('shares')}
          aria-pressed={activeSubTab === 'shares'}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeSubTab === 'shares'
              ? 'bg-surface text-primary shadow-sm ring-1 ring-border'
              : 'text-muted hover:text-foreground'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Livre d&apos;or ({shares.length})
        </button>
      </div>

      {activeSubTab === 'feed' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* Create Post */}
          <div className="lg:col-span-1 bg-surface border border-border rounded-[var(--radius-card)] p-4 space-y-3 sticky top-6">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Nouvelle publication
            </h3>

            <form onSubmit={handleCreatePost} className="space-y-3">
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Partagez un message, une annonce ou des photos avec vos invités..."
                rows={4}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-[var(--radius-button)] text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition resize-none text-foreground placeholder:text-muted"
              />

              {postMediaFiles.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                    Fichiers ({postMediaFiles.length})
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {postMediaFiles.map((file, idx) => (
                      <div key={idx} className="relative aspect-square rounded-[var(--radius-button)] overflow-hidden border border-border bg-surface-muted">
                        {file.type === 'VIDEO' ? (
                          <div className="w-full h-full flex items-center justify-center bg-background text-muted">
                            <Video className="w-6 h-6" />
                          </div>
                        ) : (
                          <img src={file.url} alt="Preview" className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveMediaFile(idx)}
                          className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isUploading && (
                <div className="flex items-center justify-center gap-2 py-3 bg-surface-muted border border-dashed border-border rounded-[var(--radius-button)]">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-xs font-medium text-muted">Encodage des fichiers...</span>
                </div>
              )}

              {canPublishOnListing && (
                <label className="flex items-start gap-2 text-xs text-muted leading-relaxed">
                  <input
                    type="checkbox"
                    checked={publishOnListing}
                    onChange={(e) => setPublishOnListing(e.target.checked)}
                    className="mt-0.5 rounded border-border"
                  />
                  <span>
                    Publier aussi sur la fiche publique <span className="font-semibold text-foreground">/evenements</span>
                  </span>
                </label>
              )}

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
                <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-muted hover:bg-background text-foreground font-medium rounded-[var(--radius-button)] text-xs cursor-pointer transition border border-border">
                  <Image className="w-4 h-4 text-primary" />
                  Médias
                  <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" onChange={handleMultipleMediaUpload} className="hidden" />
                </label>
                <button
                  type="submit"
                  disabled={submittingPost || isUploading || (!postContent.trim() && postMediaFiles.length === 0)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-hover disabled:bg-primary/40 text-white font-medium rounded-[var(--radius-button)] text-xs transition"
                >
                  {submittingPost ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Publier
                </button>
              </div>
            </form>
          </div>

          {/* Feed Posts */}
          <div className="lg:col-span-2 space-y-3">
            {loadingPosts ? (
              <div className="bg-surface border border-border rounded-[var(--radius-card)] p-10 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-7 h-7 text-primary animate-spin" />
                <p className="text-sm text-muted">Chargement du fil d&apos;actualité...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-surface border border-border rounded-[var(--radius-card)] p-10 text-center space-y-2">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/15 text-primary">
                  <Rss className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-foreground text-sm">Aucune publication</h4>
                <p className="text-muted text-sm max-w-sm mx-auto">
                  Publiez la première photo ou annonce pour lancer le fil d&apos;actualité de votre événement.
                </p>
              </div>
            ) : (
              posts.map(post => {
                const mediaList = getMediaList(post);
                const likesCount = post.likes?.length || 0;
                const organizerInitials = user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'OR';

                return (
                  <article key={post.id} className="bg-surface border border-border rounded-[var(--radius-card)] overflow-hidden">
                    {/* Post header */}
                    <div className="p-4 pb-0 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold text-xs">
                          {organizerInitials}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground text-sm block">Organisateur</span>
                          <span className="text-[10px] text-muted">{formatRelativeDate(post.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {canPublishOnListing && (
                          <button
                            type="button"
                            onClick={() => handleTogglePublishOnListing(post)}
                            disabled={togglingPostId === post.id}
                            className={`p-2 rounded-[var(--radius-button)] transition ${
                              post.publishedOnListing
                                ? 'text-primary bg-primary/10'
                                : 'text-muted hover:text-primary hover:bg-surface-muted'
                            }`}
                            title={post.publishedOnListing ? 'Retirer de la fiche publique' : 'Publier sur la fiche publique'}
                          >
                            {togglingPostId === post.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Globe className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        {mediaList.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => handleDownloadFeedPostMedia(e, post)}
                            disabled={isBulkDownloading}
                            className="p-2 text-muted hover:text-primary hover:bg-surface-muted rounded-[var(--radius-button)] transition"
                            title="Télécharger les médias"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeletePost(post.id)}
                          className="p-2 text-muted hover:text-rose-600 hover:bg-surface-muted rounded-[var(--radius-button)] transition"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {post.content && (
                      <p className="px-4 pt-3 text-foreground text-sm leading-relaxed whitespace-pre-line">
                        {post.content}
                      </p>
                    )}

                    {mediaList.length > 0 && (
                      <div className={`mx-4 mt-3 grid gap-1 rounded-[var(--radius-button)] overflow-hidden ${
                        mediaList.length === 1 ? 'grid-cols-1' : mediaList.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
                      }`}>
                        {mediaList.map((media, idx) => (
                          <div key={idx} className="relative aspect-video max-h-80 bg-background flex items-center justify-center overflow-hidden group">
                            {media.type === 'VIDEO' ? (
                              <video src={media.url} controls className="w-full h-full object-contain" />
                            ) : (
                              <img
                                src={media.url}
                                alt={`Media ${idx + 1}`}
                                onClick={() => {
                                  const imagesOnly = mediaList.filter(m => m.type === 'IMAGE').map(m => m.url);
                                  openImageModal(
                                    imagesOnly,
                                    imagesOnly.indexOf(media.url),
                                    `feed-${sanitizeFilenamePart(post.id)}`
                                  );
                                }}
                                className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition"
                              />
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleDownloadMedia(
                                e,
                                media.url,
                                `feed-${sanitizeFilenamePart(post.id)}-${idx + 1}${getMediaExtension(media.url, media.type)}`
                              )}
                              className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Télécharger"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Engagement bar */}
                    <div className="px-4 py-2.5 mt-2 flex items-center gap-4 border-b border-border text-xs text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-primary" />
                        <span className="tabular-nums text-foreground font-medium">{likesCount}</span> J&apos;aime
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span className="tabular-nums text-foreground font-medium">{post.comments.length}</span>
                        {' '}commentaire{post.comments.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Comments */}
                    <div className="p-4 space-y-3">
                      {post.comments.length > 0 && (
                        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                          {post.comments.map(comment => (
                            <div key={comment.id} className="flex gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold text-[10px] flex-shrink-0">
                                {comment.authorName[0]?.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0 py-0.5">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                  <span className="font-semibold text-foreground text-xs">{comment.authorName}</span>
                                  <span className="text-[10px] text-muted">{formatRelativeDate(comment.createdAt)}</span>
                                </div>
                                <p className="text-muted text-xs leading-relaxed">{comment.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Répondre en tant qu'organisateur..."
                          value={commentContents[post.id] || ''}
                          onChange={(e) => setCommentContents({ ...commentContents, [post.id]: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleCreateComment(post.id); }}
                          className="flex-1 px-3 py-2 bg-background border border-border rounded-[var(--radius-button)] text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground"
                        />
                        <button
                          type="button"
                          onClick={() => handleCreateComment(post.id)}
                          disabled={commentSubmitting[post.id] || !commentContents[post.id]?.trim()}
                          className="p-2 bg-primary hover:bg-primary-hover disabled:bg-primary/40 text-white rounded-[var(--radius-button)] transition"
                        >
                          {commentSubmitting[post.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Livre d'or */
        <div className="space-y-4">
          {/* Search */}
          {shares.length > 0 && (
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                value={shareSearch}
                onChange={(e) => setShareSearch(e.target.value)}
                placeholder="Rechercher par invité ou message..."
                className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-[var(--radius-button)] text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground"
              />
            </div>
          )}

          {loadingShares ? (
            <div className="bg-surface border border-border rounded-[var(--radius-card)] p-10 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
              <p className="text-sm text-muted">Chargement du livre d&apos;or...</p>
            </div>
          ) : shares.length === 0 ? (
            <div className="bg-surface border border-border rounded-[var(--radius-card)] p-10 text-center space-y-2">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/15 text-primary">
                <BookOpen className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-foreground text-sm">Le livre d&apos;or est vide</h4>
              <p className="text-muted text-sm max-w-sm mx-auto">
                Les messages et photos partagés par vos invités depuis leur portail RSVP apparaîtront ici.
              </p>
            </div>
          ) : filteredShares.length === 0 ? (
            <div className="text-center py-10 text-muted text-sm">
              Aucun message ne correspond à votre recherche.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredShares.map(share => {
                const photosList = getPhotosList(share);
                const initials = getInitials(share.guest.firstName, share.guest.lastName);
                const guestSlug = sanitizeFilenamePart(`${share.guest.firstName}-${share.guest.lastName}`);

                return (
                  <article
                    key={share.id}
                    className="bg-surface border border-border rounded-[var(--radius-card)] overflow-hidden flex flex-col"
                  >
                    <div className="p-4 space-y-3 flex-1 flex flex-col">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold text-xs flex-shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-foreground text-sm block truncate">
                            {share.guest.firstName} {share.guest.lastName}
                          </span>
                          <span className="text-[10px] text-muted">{formatRelativeDate(share.createdAt)}</span>
                        </div>
                        {photosList.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => handleDownloadSharePhotos(e, share)}
                            disabled={isBulkDownloading}
                            className="p-1.5 text-muted hover:text-primary hover:bg-surface-muted rounded-[var(--radius-button)] transition flex-shrink-0"
                            title="Télécharger les photos"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteShare(share.id)}
                          className="p-1.5 text-muted hover:text-rose-600 hover:bg-surface-muted rounded-[var(--radius-button)] transition flex-shrink-0"
                          title="Supprimer ce message"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {share.message && (
                        <p className="text-foreground text-sm leading-relaxed">
                          {share.message}
                        </p>
                      )}

                      {photosList.length > 0 && (
                        <div className={`grid gap-1 rounded-[var(--radius-button)] overflow-hidden ${
                          photosList.length === 1 ? 'grid-cols-1' : photosList.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
                        }`}>
                          {photosList.map((photo, idx) => (
                            <div
                              key={idx}
                              className={`relative overflow-hidden bg-surface-muted group cursor-pointer ${
                                photosList.length === 1 ? 'aspect-video' : 'aspect-square'
                              }`}
                              onClick={() => openImageModal(photosList, idx, `livre-dor-${guestSlug}`)}
                            >
                              <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 flex items-center justify-center transition-all pointer-events-none">
                                <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleDownloadMedia(
                                  e,
                                  photo,
                                  `livre-dor-${guestSlug}-${idx + 1}${getMediaExtension(photo, 'IMAGE')}`
                                )}
                                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                title="Télécharger"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {!share.message && photosList.length === 0 && (
                        <p className="text-xs text-muted italic">Partage sans contenu texte ni photo.</p>
                      )}

                      <div className="mt-auto pt-2 border-t border-border">
                        <span className="text-[10px] text-muted truncate block">{share.guest.email}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Image lightbox */}
      {expandedImages.length > 0 && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setExpandedImages([])}
        >
          <div className="relative max-w-4xl max-h-[85vh] flex items-center justify-center">
            <img
              src={expandedImages[expandedImageIndex]}
              alt="Agrandissement"
              className="max-h-[85vh] max-w-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const url = expandedImages[expandedImageIndex];
                void downloadMedia(
                  url,
                  `${expandedImagePrefix}-${expandedImageIndex + 1}${getMediaExtension(url, 'IMAGE')}`
                );
              }}
              className="absolute top-4 left-4 p-2 bg-black/60 hover:bg-black text-white rounded-full transition"
              title="Télécharger"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setExpandedImages([])}
              className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black text-white rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
            {expandedImages.length > 1 && (
              <>
                <button type="button" onClick={prevImage} className="absolute left-4 p-3 bg-black/50 hover:bg-black text-white rounded-full transition">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button type="button" onClick={nextImage} className="absolute right-4 p-3 bg-black/50 hover:bg-black text-white rounded-full transition">
                  <ChevronRight className="w-6 h-6" />
                </button>
                <div className="absolute bottom-4 bg-black/60 px-3 py-1 rounded-full text-white text-xs font-medium">
                  {expandedImageIndex + 1} / {expandedImages.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
