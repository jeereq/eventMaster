'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  MessageSquare, Image, Send, Trash2, Users, Calendar, 
  Loader2, AlertCircle, CheckCircle2, Heart, Plus, FileText, 
  Video, Eye, MessageCircle, ArrowRight
} from 'lucide-react';

interface Comment {
  id: string;
  postId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

interface Post {
  id: string;
  eventId: string;
  content: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  createdAt: string;
  comments: Comment[];
}

interface GuestShare {
  id: string;
  eventId: string;
  guestId: string;
  message: string | null;
  photo: string | null;
  createdAt: string;
  guest: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface EventFeedManagerProps {
  eventId: string;
}

export default function EventFeedManager({ eventId }: EventFeedManagerProps) {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'feed' | 'shares'>('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [shares, setShares] = useState<GuestShare[]>([]);
  
  // Loading states
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingShares, setLoadingShares] = useState(true);
  const [submittingPost, setSubmittingPost] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState<Record<string, boolean>>({});

  // New Post form state
  const [postContent, setPostContent] = useState('');
  const [postMedia, setPostMedia] = useState<string | null>(null);
  const [postMediaType, setPostMediaType] = useState<'TEXT' | 'IMAGE' | 'VIDEO'>('TEXT');

  // New Comment form state
  const [commentContents, setCommentContents] = useState<Record<string, string>>({});

  // Expanded image modal
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const loadFeed = async () => {
    setLoadingPosts(true);
    try {
      const data = await api.get(`/events/${eventId}/feed`);
      setPosts(data);
    } catch (err) {
      console.error('Error loading event feed:', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadShares = async () => {
    setLoadingShares(true);
    try {
      const data = await api.get(`/events/${eventId}/shares`);
      setShares(data);
    } catch (err) {
      console.error('Error loading guest shares:', err);
    } finally {
      setLoadingShares(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      loadFeed();
      loadShares();
    }
  }, [eventId]);

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setPostMedia(base64String);
      if (file.type.startsWith('video/')) {
        setPostMediaType('VIDEO');
      } else {
        setPostMediaType('IMAGE');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim() && !postMedia) return;

    setSubmittingPost(true);
    try {
      const newPost = await api.post(`/events/${eventId}/feed`, {
        content: postContent,
        mediaUrl: postMedia,
        mediaType: postMediaType,
      });

      setPosts([
        { ...newPost, comments: [] },
        ...posts
      ]);
      setPostContent('');
      setPostMedia(null);
      setPostMediaType('TEXT');
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
          return {
            ...p,
            comments: [...p.comments, newComment]
          };
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            Interactions & Fil d'Actualité
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Publiez des photos/vidéos pour vos invités et consultez les mots doux et photos qu'ils partagent.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-start md:self-auto">
          <button
            onClick={() => setActiveSubTab('feed')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${activeSubTab === 'feed' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Fil d'actualité (Feed)
          </button>
          <button
            onClick={() => setActiveSubTab('shares')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${activeSubTab === 'shares' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Partages des invités ({shares.length})
          </button>
        </div>
      </div>

      {activeSubTab === 'feed' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column: Create Post Form */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 sticky top-6">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              Créer une publication
            </h3>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Partagez un message, une annonce ou une photo avec vos invités..."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none text-slate-800"
                />
              </div>

              {postMedia && (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-h-48 bg-slate-50 flex items-center justify-center">
                  {postMediaType === 'VIDEO' ? (
                    <video src={postMedia} controls className="max-h-48 w-full object-contain" />
                  ) : (
                    <img src={postMedia} alt="Preview" className="max-h-48 w-full object-contain" />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setPostMedia(null);
                      setPostMediaType('TEXT');
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer transition">
                  <Image className="w-4 h-4 text-indigo-600" />
                  Photo / Vidéo
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleMediaUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="submit"
                  disabled={submittingPost || (!postContent.trim() && !postMedia)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-xl text-xs transition shadow-md shadow-indigo-100"
                >
                  {submittingPost ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Publication...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Publier
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Feed Posts */}
          <div className="lg:col-span-2 space-y-6">
            {loadingPosts ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center gap-3 shadow-sm">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <p className="text-sm font-medium text-slate-500">Chargement du fil d'actualité...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm space-y-3">
                <div className="inline-flex items-center justify-center bg-indigo-50 p-4 rounded-full text-indigo-600">
                  <MessageCircle className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-slate-800 text-base">Aucune publication pour le moment</h4>
                <p className="text-slate-500 text-sm max-w-sm mx-auto">
                  Soyez le premier à publier une photo ou un mot de bienvenue pour vos invités !
                </p>
              </div>
            ) : (
              posts.map(post => (
                <div key={post.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                  {/* Post Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs">
                        ✨
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-900 text-sm block">Organisateur</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(post.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Supprimer la publication"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Post Content */}
                  {post.content && (
                    <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-line">
                      {post.content}
                    </p>
                  )}

                  {/* Post Media */}
                  {post.mediaUrl && (
                    <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 max-h-96 flex items-center justify-center">
                      {post.mediaType === 'VIDEO' ? (
                        <video src={post.mediaUrl} controls className="max-h-96 w-full object-contain" />
                      ) : (
                        <img 
                          src={post.mediaUrl} 
                          alt="Post Media" 
                          onClick={() => setExpandedImage(post.mediaUrl)}
                          className="max-h-96 w-full object-contain cursor-pointer hover:opacity-95 transition-opacity" 
                        />
                      )}
                    </div>
                  )}

                  {/* Comments Section */}
                  <div className="border-t border-slate-100 pt-4 space-y-4">
                    <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4 text-slate-400" />
                      Commentaires ({post.comments.length})
                    </h4>

                    {post.comments.length > 0 && (
                      <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl max-h-60 overflow-y-auto">
                        {post.comments.map(comment => (
                          <div key={comment.id} className="text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-slate-800">{comment.authorName}</span>
                              <span className="text-[9px] text-slate-400">
                                {new Date(comment.createdAt).toLocaleDateString('fr-FR', {
                                  hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <p className="text-slate-600 leading-relaxed">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Comment Form */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Écrire un commentaire..."
                        value={commentContents[post.id] || ''}
                        onChange={(e) => setCommentContents({ ...commentContents, [post.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateComment(post.id);
                        }}
                        className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-slate-800"
                      />
                      <button
                        onClick={() => handleCreateComment(post.id)}
                        disabled={commentSubmitting[post.id] || !commentContents[post.id]?.trim()}
                        className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl transition shadow-sm"
                      >
                        {commentSubmitting[post.id] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Guest Shares Tab */
        <div className="space-y-6">
          {loadingShares ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center gap-3 shadow-sm">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-sm font-medium text-slate-500">Chargement des partages des invités...</p>
            </div>
          ) : shares.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm space-y-3">
              <div className="inline-flex items-center justify-center bg-indigo-50 p-4 rounded-full text-indigo-600">
                <Users className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-800 text-base">Aucun partage pour le moment</h4>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                Les mots doux et photos partagés en privé par vos invités apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {shares.map(share => (
                <div key={share.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    {/* Guest Header */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-extrabold text-indigo-700 text-xs">
                        {share.guest.firstName[0]}{share.guest.lastName[0]}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 text-xs block leading-tight">
                          {share.guest.firstName} {share.guest.lastName}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium">
                          {new Date(share.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Share Message */}
                    {share.message && (
                      <p className="text-slate-700 text-xs leading-relaxed italic bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        "{share.message}"
                      </p>
                    )}

                    {/* Share Photo */}
                    {share.photo && (
                      <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 max-h-48 flex items-center justify-center relative group">
                        <img 
                          src={share.photo} 
                          alt="Guest Share" 
                          className="max-h-48 w-full object-cover cursor-pointer group-hover:opacity-95 transition-opacity"
                          onClick={() => setExpandedImage(share.photo)}
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                          <Eye className="w-5 h-5 text-white drop-shadow-sm" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] text-slate-400 font-medium pt-2 border-t border-slate-50">
                    Email : {share.guest.email}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl">
            <img src={expandedImage} alt="Expanded" className="max-h-[85vh] max-w-full object-contain" />
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black text-white rounded-full transition"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
