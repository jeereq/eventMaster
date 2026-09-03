'use client';

import React, { useEffect, useState } from 'react';
import { cn } from "@/lib/cn";
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { downloadMedia, getMediaExtension, sanitizeFilenamePart } from '@/lib/downloadMedia';
import GuestPortalShell, { GuestPortalTabBar, GuestPortalCard } from '@/components/GuestPortalShell';
import Link from 'next/link';
import GuestTablePlanView from '@/app/rsvp/GuestTablePlanView';
import GuestGuidelinesView from '@/components/GuestGuidelinesView';
import GuestVenueGuide from '@/components/GuestVenueGuide';
import type { GuestGuidelines } from '@/lib/guestGuidelines';
import type { ChairType, RoomLayoutBlueprint, RoomOutlineShape } from '@/lib/roomLayoutUtils';
import type { LightingPreset } from '@/lib/roomRenderQuality';
import { 
  Calendar, MapPin, CheckCircle2, XCircle, AlertCircle, 
  Utensils, Loader2, Award,
  Users, MessageSquare, Image, Send, Heart, Eye, Trash2, LayoutGrid, MessageCircle,
  ChevronLeft, ChevronRight, X, RefreshCw, Video, ThumbsUp, Download, Clock, Navigation,
  QrCode, Maximize2, Printer
} from 'lucide-react';
import {
  type RsvpField,
  buildRsvpPreferencesPayload,
  ensureMandatoryRsvpFields,
  ensureMandatoryRsvpFieldsOnElements,
  parseEventRsvpForm,
  getCanvasStyle,
  parseFieldOptions,
  restoreFieldValuesFromPreferences,
} from '@/lib/rsvpFormFields';
import ShareButton from '@/components/ShareButton';
import { guestRsvpUrl } from '@/lib/share';
import { getGuestQrImageUrl } from '@/lib/guestQr';
import { applyOrgInvitationThemeIfNeeded } from '@/lib/templateColorThemes';
import { Skeleton } from '@/components/ui/Skeleton';

interface GuestRsvpData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  rsvp: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  preferences: any;
  seatingInvitationPdfUrl?: string | null;
  placementAccessible?: boolean;
  tableDetails?: {
    tableName: string;
    shape: 'round' | 'rectangular' | 'square' | 'oval';
    capacity: number;
    seatIndex?: number;
    chairType?: string;
    chairImageUrl?: string;
    neighbors: Array<{ id: string; firstName: string; lastName: string; seatIndex?: number }>;
  } | null;
  tablePlanOverview?: Array<{
    id: string;
    name: string;
    shape: 'round' | 'rectangular' | 'square' | 'oval';
    capacity: number;
    x: number;
    y: number;
    occupiedCount: number;
    isGuestTable: boolean;
    chairType?: string;
    chairImageUrl?: string;
  }> | null;
  planFixtures?: Array<{
    id: string;
    kind: string;
    x: number;
    y: number;
    w: number;
    h: number;
    label?: string;
    color?: string;
    columnShape?: string;
    rotation?: number;
  }> | null;
  roomOutline?: {
    shape: string;
    x: number;
    y: number;
    w: number;
    h: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  } | null;
  roomThemeId?: string | null;
  floorType?: string | null;
  floorImageUrl?: string | null;
  depthAmount?: number | null;
  depthView?: boolean | null;
  roomLayoutPreview?: unknown;
  sourceRoomType?: string | null;
  previewLightingPreset?: string | null;
  eventPassed?: boolean;
  rsvpLocked?: boolean;
  event: {
    id: string;
    title: string;
    description: string;
    date: string;
    location: string;
    latitude?: number;
    longitude?: number;
    guestGuidelines?: GuestGuidelines | null;
    rsvpForm?: unknown;
    invitations?: Array<{
      template?: {
        id: string;
        name: string;
        content: any;
      } | null;
    }>;
  };
  branding?: {
    primary?: string;
    accent?: string;
    sidebar?: string;
  } | null;
  organizationName?: string;
}

const darkenColor = (hex: string, percent = 30) => {
  if (!hex || !hex.startsWith('#')) return hex || '#000000';
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.max(0, Math.floor(r * (1 - percent / 100)));
  g = Math.max(0, Math.floor(g * (1 - percent / 100)));
  b = Math.max(0, Math.floor(b * (1 - percent / 100)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const lightenColor = (hex: string, percent = 30) => {
  if (!hex || !hex.startsWith('#')) return hex || '#ffffff';
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
  g = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
  b = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

export default function RsvpPage() {
  const params = useParams();
  const guestId = params.guestId as string;
  const { site } = usePlatformSite();

  const [guest, setGuest] = useState<GuestRsvpData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rsvpStatus, setRsvpStatus] = useState<'ACCEPTED' | 'DECLINED'>('ACCEPTED');
  
  // Preferences form
  const [allergies, setAllergies] = useState('');
  const [specialMeal, setSpecialMeal] = useState('none');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Guest Dashboard states
  const [activeGuestTab, setActiveGuestTab] = useState<'badge' | 'table' | 'route' | 'guestbook' | 'feed'>('badge');
  const [guestbookMessage, setGuestbookMessage] = useState('');
  const [guestbookPhoto, setGuestbookPhoto] = useState<string | null>(null);
  const [guestbookPhotos, setGuestbookPhotos] = useState<string[]>([]);
  const [isGuestbookUploading, setIsGuestbookUploading] = useState(false);
  const [submittingGuestbook, setSubmittingGuestbook] = useState(false);
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [guestCommentContents, setGuestCommentContents] = useState<Record<string, string>>({});
  const [guestCommentSubmitting, setGuestCommentSubmitting] = useState<Record<string, boolean>>({});
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [expandedImages, setExpandedImages] = useState<string[]>([]);
  const [expandedImageIndex, setExpandedImageIndex] = useState<number>(0);
  const [expandedImagePrefix, setExpandedImagePrefix] = useState('media');
  const [guestbookSuccess, setGuestbookSuccess] = useState(false);
  const [guestbookShares, setGuestbookShares] = useState<any[]>([]);
  const [loadingGuestbook, setLoadingGuestbook] = useState(false);
  const [rsvpLocked, setRsvpLocked] = useState(false);
  const [showFullScreenQr, setShowFullScreenQr] = useState(false);

  const guestTabIds = ['badge', 'table', 'route', 'guestbook', 'feed'] as const;
  const goGuestTab = (id: string) => {
    if (!(guestTabIds as readonly string[]).includes(id)) return;
    setActiveGuestTab(id as typeof activeGuestTab);
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}#${id}`,
    );
  };

  useEffect(() => {
    const raw = window.location.hash.replace('#', '');
    if (raw === 'badge' || raw === 'table' || raw === 'route' || raw === 'guestbook' || raw === 'feed') {
      setActiveGuestTab(raw);
    }
  }, []);

  useEffect(() => {
    async function loadRsvpDetails() {
      if (!guestId) return;
      try {
        const data = await api.get(`/rsvp/${guestId}`);
        setGuest(data);
        setRsvpLocked(Boolean(data.rsvpLocked));
        if (data.rsvp && data.rsvp !== 'PENDING') {
          setRsvpStatus(data.rsvp);
          setSubmitted(true);
        }
        if (data.preferences) {
          setAllergies(data.preferences.allergies || '');
          setSpecialMeal(data.preferences.specialMeal || 'none');
          setAdditionalNotes(data.preferences.notes || '');
          const templateContent = data.event?.invitations?.[0]?.template?.content;
          const elements = templateContent?.elements || [];
          const rsvpFields = ensureMandatoryRsvpFields(
            elements
              .filter((el: { type?: string }) => el.type === 'rsvp-block')
              .flatMap((el: { rsvpFields?: RsvpField[] }) => el.rsvpFields || []),
          );
          setCustomFieldValues(restoreFieldValuesFromPreferences(rsvpFields, data.preferences));
        }
      } catch (err: any) {
        console.error('Error fetching RSVP details:', err);
        setError('Le lien d\'invitation est invalide ou a expiré.');
      } finally {
        setLoading(false);
      }
    }
    loadRsvpDetails();
  }, [guestId]);

  const loadGuestFeed = async (silent = false) => {
    if (!guest?.event?.id) return;
    if (!silent) setLoadingFeed(true);
    try {
      const data = await api.get(`/rsvp/event/${guest.event.id}/feed`);
      setFeedPosts(data);
    } catch (err) {
      console.error('Error loading guest feed:', err);
    } finally {
      if (!silent) setLoadingFeed(false);
    }
  };

  const loadGuestbookShares = async (silent = false) => {
    if (!guest?.event?.id) return;
    if (!silent) setLoadingGuestbook(true);
    try {
      const data = await api.get(`/rsvp/event/${guest.event.id}/shares`);
      setGuestbookShares(data);
    } catch (err) {
      console.error('Error loading guestbook shares:', err);
    } finally {
      if (!silent) setLoadingGuestbook(false);
    }
  };

  useEffect(() => {
    if (!submitted || !(guest?.rsvp === 'ACCEPTED' || rsvpStatus === 'ACCEPTED')) return;

    if (activeGuestTab === 'feed') {
      loadGuestFeed();
      const interval = setInterval(() => {
        loadGuestFeed(true);
      }, 10000); // 10s silent polling
      return () => clearInterval(interval);
    } else if (activeGuestTab === 'guestbook') {
      loadGuestbookShares();
      const interval = setInterval(() => {
        loadGuestbookShares(true);
      }, 10000); // 10s silent polling
      return () => clearInterval(interval);
    }
  }, [submitted, guest, rsvpStatus, activeGuestTab]);

  const handleGuestbookMultiplePhotosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsGuestbookUploading(true);
    const newPhotos = [...guestbookPhotos];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
        });
        newPhotos.push(base64);
      } catch (err) {
        console.error('Error reading file:', err);
      }
    }

    setGuestbookPhotos(newPhotos);
    setIsGuestbookUploading(false);
  };

  const handleRemoveGuestbookPhoto = (index: number) => {
    setGuestbookPhotos(guestbookPhotos.filter((_, i) => i !== index));
  };

  const handleSubmitGuestbook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestbookMessage.trim() && guestbookPhotos.length === 0) return;

    setSubmittingGuestbook(true);
    try {
      await api.post(`/rsvp/${guestId}/share`, {
        message: guestbookMessage,
        photos: guestbookPhotos,
      });
      setGuestbookSuccess(true);
      setGuestbookMessage('');
      setGuestbookPhotos([]);
      loadGuestbookShares();
      setTimeout(() => setGuestbookSuccess(false), 5000);
    } catch (err) {
      console.error('Error submitting guestbook:', err);
      alert('Erreur lors de l\'envoi de votre message.');
    } finally {
      setSubmittingGuestbook(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    try {
      const response = await api.post(`/rsvp/feed/post/${postId}/like`, {
        guestId: guest?.id,
      });

      setFeedPosts(feedPosts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            likes: response.likes
          };
        }
        return p;
      }));
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleCreateGuestComment = async (postId: string) => {
    const content = guestCommentContents[postId];
    if (!content || !content.trim()) return;

    setGuestCommentSubmitting(prev => ({ ...prev, [postId]: true }));
    try {
      const newComment = await api.post(`/rsvp/feed/post/${postId}/comment`, {
        content,
        guestId: guest?.id,
      });

      setFeedPosts(feedPosts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            comments: [...p.comments, newComment]
          };
        }
        return p;
      }));

      setGuestCommentContents(prev => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('Error creating comment:', err);
      alert('Erreur lors de l\'ajout du commentaire.');
    } finally {
      setGuestCommentSubmitting(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleDownloadMedia = async (e: React.MouseEvent, url: string, filename: string) => {
    e.stopPropagation();
    await downloadMedia(url, filename);
  };

  const openGuestImageModal = (images: string[], index: number, filenamePrefix = 'media') => {
    setExpandedImages(images);
    setExpandedImageIndex(index);
    setExpandedImagePrefix(filenamePrefix);
  };

  const handleSubmitRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rsvpLocked) {
      setError('La date de célébration est passée. Votre réponse RSVP ne peut plus être modifiée.');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const templateContent = guest?.event?.invitations?.[0]?.template?.content;
      const rsvpFields = ensureMandatoryRsvpFields(
        (templateContent?.elements || [])
          .filter((el: { type?: string }) => el.type === 'rsvp-block')
          .flatMap((el: { rsvpFields?: RsvpField[] }) => el.rsvpFields || []),
      );

      if (rsvpStatus === 'ACCEPTED') {
        for (const field of rsvpFields) {
          if (!field.required) continue;
          const val = customFieldValues[field.id];
          if (val === undefined || val === null || val === '') {
            setError(`Le champ « ${field.label} » est obligatoire.`);
            setSubmitting(false);
            return;
          }
        }
      }

      const preferences = buildRsvpPreferencesPayload({
        allergies,
        specialMeal,
        notes: additionalNotes,
        rsvpFields,
        fieldValues: customFieldValues,
      });

      await api.post(`/rsvp/${guestId}`, {
        rsvp: rsvpStatus,
        preferences,
      });

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la soumission de votre réponse.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to get background style
  const getBackgroundStyle = (type: string, color: string, url: string, pattern: string) => {
    if (type === 'color') return { backgroundColor: color };
    if (type === 'image' && url) return { backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    if (type === 'pattern') {
      if (pattern === 'paper') {
        return {
          backgroundColor: color || '#faf8f5',
          backgroundImage: 'radial-gradient(rgba(0,0,0,0.03) 1px, transparent 0), radial-gradient(rgba(0,0,0,0.02) 1px, transparent 0)',
          backgroundSize: '8px 8px',
          backgroundPosition: '0 0, 4px 4px',
        };
      }
      if (pattern === 'watercolor') {
        return {
          background: `radial-gradient(circle at 10% 10%, rgba(243, 224, 217, 0.6) 0%, transparent 60%), radial-gradient(circle at 90% 90%, rgba(225, 212, 198, 0.6) 0%, transparent 60%), radial-gradient(circle at 50% 50%, ${color || '#fdfbf7'} 0%, 100%)`,
        };
      }
      if (pattern === 'boho') {
        return { backgroundColor: color || '#faf6f0' };
      }
      if (pattern === 'linen') {
        return {
          backgroundColor: color || '#f4f1ea',
          backgroundImage: `
            linear-gradient(90deg, rgba(180,170,150,0.08) 1px, transparent 1px),
            linear-gradient(rgba(180,170,150,0.08) 1px, transparent 1px)
          `,
          backgroundSize: '4px 4px',
        };
      }
      if (pattern === 'marble') {
        return {
          backgroundColor: color || '#f5f5f5',
          backgroundImage: `
            radial-gradient(circle at 30% 20%, rgba(197,160,89,0.04) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(197,160,89,0.04) 0%, transparent 40%),
            linear-gradient(135deg, rgba(0,0,0,0.01) 0%, rgba(0,0,0,0.01) 10%, transparent 10%, transparent 50%, rgba(0,0,0,0.01) 50%, rgba(0,0,0,0.01) 60%, transparent 60%, transparent 100%)
          `,
          backgroundSize: '100% 100%, 100% 100%, 40px 40px',
        };
      }
      if (pattern === 'gold-dust') {
        return {
          backgroundColor: color || '#1e1b18',
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(197,160,89,0.2) 1px, transparent 1px),
            radial-gradient(circle at 75% 40%, rgba(197,160,89,0.2) 2px, transparent 2px),
            radial-gradient(circle at 50% 80%, rgba(197,160,89,0.15) 1.5px, transparent 1.5px),
            radial-gradient(circle at 10% 75%, rgba(197,160,89,0.12) 2.5px, transparent 2.5px),
            radial-gradient(circle at 90% 15%, rgba(197,160,89,0.2) 1px, transparent 1px)
          `,
          backgroundSize: '120px 120px, 150px 150px, 100px 100px, 180px 180px, 140px 140px',
        };
      }
      if (pattern === 'parchment') {
        return {
          background: `radial-gradient(circle, ${color || '#f1e6d2'} 0%, #e4d3b2 100%)`,
          boxShadow: 'inset 0 0 40px rgba(139,90,43,0.15)',
        };
      }
      if (pattern === 'velvet') {
        return {
          background: `radial-gradient(circle at 50% 30%, ${color || '#4a0e17'} 0%, #1a0307 100%)`,
        };
      }
    }
    return { backgroundColor: '#ffffff' };
  };

  if (loading) {
    return (
      <div className="min-h-screen em-guest-page flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          {/* Hero skeleton */}
          <div className="space-y-3 text-center">
            <Skeleton className="h-8 w-3/4 mx-auto rounded-lg" />
            <Skeleton className="h-4 w-1/2 mx-auto rounded-full" />
          </div>
          {/* QR Code skeleton */}
          <div className="flex flex-col items-center gap-4 py-6 bg-surface rounded-[var(--radius-card)] border border-border shadow-[var(--shadow-soft)]">
            <Skeleton className="w-48 h-48 rounded-2xl" />
            <Skeleton className="h-3 w-24 rounded-full" />
          </div>
          {/* Details skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-4 w-5/6 rounded-lg" />
            <Skeleton className="h-4 w-4/6 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !guest) {
    return (
      <div className="min-h-screen em-guest-page flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-surface p-8 rounded-[var(--radius-card)] border border-border shadow-[var(--shadow-soft)] text-center space-y-4">
          <div className="bg-rose-50 text-rose-600 p-4 rounded-[var(--radius-card)] w-16 h-16 flex items-center justify-center mx-auto border border-rose-100">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-semibold text-foreground tracking-tight">Erreur d'Invitation</h2>
          <p className="text-muted leading-relaxed text-sm">
            {error || 'Lien d\'invitation invalide.'}
          </p>
          <p className="text-xs text-muted">Veuillez contacter l'organisateur de l'événement.</p>
        </div>
      </div>
    );
  }

    if (submitted && rsvpStatus === 'DECLINED') {
      return (
        <GuestPortalShell
          title={guest.event.title}
          eyebrow="Réponse enregistrée"
          guestId={guestId}
          organizationName={guest.organizationName}
          headerRight={
            <ShareButton
              title={`${guest.event.title} · Invitation`}
              text={`Invitation ${site.platformName} pour ${guest.firstName}.`}
              url={guestRsvpUrl(guestId)}
              className="h-8 w-8 !bg-surface border-border"
            />
          }
          contentClassName="space-y-5"
        >
          <GuestPortalCard className="text-center space-y-4 py-10">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-surface-muted border border-border text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              Réponse enregistrée
            </span>
            <h2 className="text-xl font-display font-semibold text-foreground tracking-tight">
              {guest.firstName}, nous avons bien noté votre absence.
            </h2>
            <p className="text-sm text-muted leading-relaxed max-w-sm mx-auto">
              Merci d&apos;avoir pris le temps de répondre. Vous pourrez modifier votre choix
              tant que l&apos;organisateur n&apos;a pas verrouillé les RSVP.
            </p>
            {!rsvpLocked && (
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition shadow-sm"
              >
                Modifier ma réponse
              </button>
            )}
          </GuestPortalCard>
        </GuestPortalShell>
      );
    }

    // Portail invité confirmé — layout plateforme (simple / moderne)
    if (submitted && rsvpStatus === 'ACCEPTED') {
      const guestTabs = [
        { id: 'badge', label: 'Badge', icon: <Award className="w-4 h-4" /> },
        { id: 'table', label: 'Ma table', icon: <LayoutGrid className="w-4 h-4" /> },
        { id: 'route', label: 'Itinéraire', icon: <Navigation className="w-4 h-4" /> },
        { id: 'guestbook', label: "Livre d'or", icon: <Heart className="w-4 h-4" /> },
        { id: 'feed', label: 'Actualités', icon: <MessageCircle className="w-4 h-4" /> },
      ];

      return (
        <GuestPortalShell
          title={guest.event.title}
          eyebrow="Invitation confirmée"
          guestId={guestId}
          organizationName={guest.organizationName}
          swipeTabIds={[...guestTabIds]}
          activeTabId={activeGuestTab}
          onTabChange={goGuestTab}
          headerRight={
            <ShareButton
              title={`${guest.event.title} · Invitation`}
              text={`Invitation ${site.platformName} pour ${guest.firstName}.`}
              url={guestRsvpUrl(guestId)}
              className="h-8 w-8 !bg-surface border-border"
            />
          }
          tabs={
            <GuestPortalTabBar
              tabs={guestTabs}
              activeId={activeGuestTab}
              onChange={goGuestTab}
            />
          }
          contentClassName="space-y-5"
        >
            {/* 1. BADGE & INFOS TAB */}
            {activeGuestTab === 'badge' && (
              <div className="space-y-5 animate-fade-in">
                <div className="em-guest-hero">
                  <div className="em-guest-hero__banner">
                    <div className="relative z-[1] space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/15 border border-white/25 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                          Présence confirmée
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/75 truncate max-w-[50%]">
                          {guest.organizationName || site.platformName}
                        </span>
                      </div>
                      <div className="text-center sm:text-left space-y-1.5">
                        <h2 className="text-2xl sm:text-[1.75rem] font-display font-semibold leading-tight tracking-tight text-white">
                          Bonjour {guest.firstName}
                        </h2>
                        <p className="text-sm text-white/85 leading-relaxed max-w-md mx-auto sm:mx-0">
                          Votre pass d&apos;entrée pour{' '}
                          <span className="font-semibold text-white">{guest.event.title}</span>.
                          Présentez le badge QR à l&apos;accueil.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto sm:mx-0">
                        <div className="rounded-xl bg-white/12 border border-white/15 px-3 py-2.5 text-center sm:text-left">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-white/70">Date</p>
                          <p className="text-sm font-semibold text-white mt-0.5">
                            {new Date(guest.event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white/12 border border-white/15 px-3 py-2.5 text-center sm:text-left">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-white/70">Heure</p>
                          <p className="text-sm font-semibold text-white mt-0.5">
                            {new Date(guest.event.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-6 sm:px-8 flex flex-col items-center gap-4 bg-gradient-to-b from-surface to-surface-muted/40">
                    <button
                      type="button"
                      onClick={() => setShowFullScreenQr(true)}
                      className="p-4 bg-white rounded-[1.25rem] border border-border shadow-[0_12px_40px_rgba(15,23,42,0.08)] hover:scale-105 active:scale-95 transition-all group relative cursor-pointer"
                      title="Toucher pour agrandir en plein écran"
                    >
                      <img
                        src={getGuestQrImageUrl(guest.id, 200)}
                        alt="QR Code Pass"
                        className="w-44 h-44 sm:w-48 sm:h-48"
                      />
                      <span className="absolute inset-0 rounded-[1.25rem] bg-black/5 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="bg-slate-900/80 text-white text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-xs">
                          <Maximize2 className="w-3 h-3" />
                          Plein écran
                        </span>
                      </span>
                    </button>
                    <div className="text-center space-y-3">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Badge d&apos;entrée</p>
                        <p className="text-[11px] font-mono text-muted tracking-widest">
                          {guest.id.split('-')[0]?.toUpperCase()}
                        </p>
                      </div>
                      <Link
                        href={`/rsvp/${guestId}/print`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-border bg-surface text-xs font-semibold text-foreground hover:bg-surface-muted transition"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Imprimer l&apos;invitation
                      </Link>
                    </div>
                  </div>
                </div>

                {!rsvpLocked && (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => setSubmitted(false)}
                      className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-border bg-surface text-foreground text-xs font-semibold hover:bg-surface-muted transition shadow-sm"
                    >
                      Modifier mes informations RSVP
                    </button>
                  </div>
                )}

                <GuestPortalCard className="space-y-4 !p-0 overflow-hidden">
                  <div className="px-5 pt-5 pb-3 border-b border-border/70 bg-gradient-to-r from-primary/5 to-transparent">
                    <p className="em-guest-section-label">Détails</p>
                    <h3 className="font-display font-semibold text-foreground text-base mt-1">
                      {guest.event.title}
                    </h3>
                  </div>
                  <div className="px-5 pb-5 space-y-4">
                    {guest.event.description?.trim() ? (
                      <p className="text-muted text-xs leading-relaxed whitespace-pre-line border-l-2 border-primary/30 pl-3">
                        {guest.event.description}
                      </p>
                    ) : null}

                    <div className="space-y-3 text-xs text-muted">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-semibold block text-foreground">Date & heure</span>
                          {new Date(guest.event.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-semibold block text-foreground">Lieu</span>
                          {guest.event.location}
                        </div>
                      </div>
                    </div>
                  </div>
                </GuestPortalCard>

                {guest.event.location && (
                  <GuestPortalCard className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                        <Navigation className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">Guide jusqu&apos;au lieu</p>
                        <p className="text-xs text-muted mt-0.5 leading-relaxed">
                          Carte interactive : lancez l&apos;itinéraire depuis votre position.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => goGuestTab('route')}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition shadow-sm"
                    >
                      Ouvrir la carte
                    </button>
                  </GuestPortalCard>
                )}

                <GuestGuidelinesView
                  guidelines={guest.event.guestGuidelines}
                  className="pt-1"
                />

                {!rsvpLocked && (
                <button
                  onClick={() => setSubmitted(false)}
                  className="w-full py-2.5 border border-border bg-surface hover:bg-surface-muted text-muted font-semibold rounded-xl text-xs transition"
                >
                  Modifier ma réponse
                </button>
                )}
              </div>
            )}

            {activeGuestTab === 'route' && (
              guest.event.location ? (
                <GuestVenueGuide
                  location={guest.event.location}
                  latitude={guest.event.latitude}
                  longitude={guest.event.longitude}
                  eventTitle={guest.event.title}
                />
              ) : (
                <GuestPortalCard className="text-center py-10 space-y-2">
                  <MapPin className="w-6 h-6 text-muted mx-auto" />
                  <p className="text-sm font-semibold text-foreground">Lieu non renseigné</p>
                  <p className="text-xs text-muted">L’organisateur n’a pas encore indiqué l’adresse de réception.</p>
                </GuestPortalCard>
              )
            )}

            {/* 2. MA TABLE TAB */}
            {activeGuestTab === 'table' && (
              <div className="space-y-4 animate-fade-in">
                <div className="px-1">
                  <p className="em-guest-section-label">Placement</p>
                  <h2 className="text-lg font-display font-semibold leading-snug tracking-tight text-foreground mt-0.5">
                    Votre table
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    Vue 3D de la salle, plan 2D et détails de votre siège.
                  </p>
                </div>
                  <GuestTablePlanView
                    guestId={guestId}
                    placementAccessible={guest.placementAccessible}
                    seatingInvitationPdfUrl={guest.seatingInvitationPdfUrl}
                    tableDetails={guest.tableDetails ? {
                      ...guest.tableDetails,
                      chairType: guest.tableDetails.chairType as ChairType | undefined,
                    } : null}
                    tablePlanOverview={guest.tablePlanOverview?.map((t) => ({
                      ...t,
                      chairType: t.chairType as ChairType | undefined,
                    })) ?? null}
                    planFixtures={guest.planFixtures ?? null}
                    roomOutline={guest.roomOutline ? {
                      ...guest.roomOutline,
                      shape: guest.roomOutline.shape as RoomOutlineShape,
                    } : null}
                    roomThemeId={guest.roomThemeId ?? null}
                    floorType={guest.floorType ?? null}
                    floorImageUrl={guest.floorImageUrl ?? null}
                    depthAmount={guest.depthAmount ?? null}
                    depthView={guest.depthView ?? null}
                    roomLayoutPreview={
                      guest.roomLayoutPreview && typeof guest.roomLayoutPreview === 'object'
                        ? (guest.roomLayoutPreview as RoomLayoutBlueprint)
                        : null
                    }
                    sourceRoomType={guest.sourceRoomType ?? null}
                    previewLightingPreset={
                      (guest.previewLightingPreset as Exclude<LightingPreset, 'auto'> | null) ?? null
                    }
                    guestFirstName={guest.firstName}
                    guestLastName={guest.lastName}
                    immersive
                  />
              </div>
            )}

            {/* 3. LIVRE D'OR TAB */}
            {activeGuestTab === 'guestbook' && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1 px-1">
                  <p className="em-guest-section-label">Messages</p>
                  <h3 className="font-display font-semibold text-foreground text-base">Livre d&apos;or</h3>
                  <p className="text-muted text-xs leading-relaxed">
                    Laissez un mot ou des photos pour les organisateurs.
                  </p>
                </div>

                {guestbookSuccess && (
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-3 rounded-[var(--radius-card)] text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Message et photos envoyés avec succès.
                  </div>
                )}

                <form onSubmit={handleSubmitGuestbook} className="space-y-4">
                  <div>
                    <textarea
                      value={guestbookMessage}
                      onChange={(e) => setGuestbookMessage(e.target.value)}
                      placeholder="Écrivez votre message de félicitations ou d'amitié ici..."
                      rows={4}
                      className="w-full px-4 py-3 bg-surface border border-border shadow-[var(--shadow-soft)] rounded-[var(--radius-card)] text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none text-foreground placeholder:text-muted"
                    />
                  </div>

                  {/* Previews of uploaded guestbook photos */}
                  {guestbookPhotos.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block">
                        Photos sélectionnées ({guestbookPhotos.length})
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {guestbookPhotos.map((photo, idx) => (
                          <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-surface-muted flex items-center justify-center">
                            <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveGuestbookPhoto(idx)}
                              className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition shadow-sm"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isGuestbookUploading && (
                    <div className="flex items-center justify-center gap-2 py-3 bg-surface-muted border border-dashed border-border rounded-[var(--radius-card)]">
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      <span className="text-xs font-semibold text-muted">Encodage des photos...</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-muted hover:bg-surface-muted text-foreground/80 font-semibold rounded-xl text-xs cursor-pointer transition">
                      <Image className="w-4 h-4 text-primary" />
                      Ajouter des photos
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleGuestbookMultiplePhotosUpload}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={submittingGuestbook || isGuestbookUploading || (!guestbookMessage.trim() && guestbookPhotos.length === 0)}
                      className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white font-semibold rounded-xl text-xs transition shadow-md shadow-primary/20"
                    >
                      {submittingGuestbook ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Envoi...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Envoyer
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Liste des messages du Livre d'or */}
                <div className="border-t border-border pt-6 space-y-4">
                  <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-primary" />
                    Messages des invités ({guestbookShares.length})
                  </h4>

                  {loadingGuestbook && guestbookShares.length === 0 ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                      <p className="text-[10px] text-muted">Chargement des messages...</p>
                    </div>
                  ) : guestbookShares.length === 0 ? (
                    <div className="text-center py-8 bg-surface-muted/40 rounded-[var(--radius-card)] border border-border p-4">
                      <p className="text-muted text-xs">Soyez le premier à laisser un message !</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                      {guestbookShares.map((share) => {
                        const photosList = share.photos && Array.isArray(share.photos) 
                          ? share.photos 
                          : (share.photo ? [share.photo] : []);
                        const guestSlug = sanitizeFilenamePart(
                          share.guest ? `${share.guest.firstName}-${share.guest.lastName}` : 'invite'
                        );

                        return (
                          <div key={share.id} className="bg-surface border border-border shadow-[var(--shadow-soft)] rounded-[var(--radius-card)] p-3 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground text-[11px]">
                                {share.guest ? `${share.guest.firstName} ${share.guest.lastName}` : 'Invité'}
                              </span>
                              <span className="text-[9px] text-muted">
                                {new Date(share.createdAt).toLocaleDateString('fr-FR', {
                                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                            </div>

                            {share.message && (
                              <p className="text-foreground/80 text-xs leading-relaxed whitespace-pre-line">
                                {share.message}
                              </p>
                            )}

                            {photosList.length > 0 && (
                              <div className={`grid gap-1 rounded-xl overflow-hidden ${
 photosList.length === 1 ? 'grid-cols-1' : photosList.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
 }`}>
                                {photosList.map((photo: string, pIdx: number) => (
                                  <div key={pIdx} className="relative aspect-square overflow-hidden bg-surface group">
                                    <img 
                                      src={photo} 
                                      alt="Guestbook" 
                                      onClick={() => openGuestImageModal(photosList, pIdx, `livre-dor-${guestSlug}`)}
                                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => handleDownloadMedia(
                                        e,
                                        photo,
                                        `livre-dor-${guestSlug}-${pIdx + 1}${getMediaExtension(photo, 'IMAGE')}`
                                      )}
                                      className="absolute top-1.5 right-1.5 p-1.5 bg-black/60 hover:bg-black text-white rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10 touch-manipulation"
                                      title="Télécharger"
                                    >
                                      <Download className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* 4. FIL DE L'ÉVÉNEMENT TAB */}
            {activeGuestTab === 'feed' && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-1">
                  <h3 className="font-semibold text-foreground text-sm">Actualités</h3>
                  <p className="text-muted text-xs">
                    Publications de l&apos;organisateur : photos, annonces. Aimez et commentez. Le livre d&apos;or sert à vos messages et photos personnels.
                  </p>
                </div>

                {loadingFeed ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-xs font-medium text-muted">Chargement du fil d'actualité...</p>
                  </div>
                ) : feedPosts.length === 0 ? (
                  <div className="text-center py-16 space-y-3 max-w-xs mx-auto">
                    <div className="inline-flex items-center justify-center bg-primary/10 p-5 rounded-[var(--radius-card)] text-primary">
                      <MessageCircle className="w-8 h-8" />
                    </div>
                    <h4 className="font-semibold text-foreground text-sm">Aucune publication</h4>
                    <p className="text-muted text-xs">
                      Les publications de l&apos;organisateur apparaîtront ici. Vous pourrez aimer et commenter.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {feedPosts.map(post => {
                      const mediaList = post.mediaUrls && Array.isArray(post.mediaUrls) 
                        ? post.mediaUrls 
                        : (post.mediaUrl ? [{ url: post.mediaUrl, type: post.mediaType || 'IMAGE' }] : []);

                      return (
                        <div key={post.id} className="bg-surface border border-border shadow-[var(--shadow-soft)] rounded-[var(--radius-card)] p-4 space-y-4">
                          {/* Post Header */}
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-semibold text-primary text-xs">
                              O
                            </div>
                            <div>
                              <span className="font-semibold text-foreground text-xs block leading-tight">Organisateur</span>
                              <span className="text-[9px] text-muted font-medium">
                                {new Date(post.createdAt).toLocaleDateString('fr-FR', {
                                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Post Content */}
                          {post.content && (
                            <p className="text-foreground text-xs leading-relaxed whitespace-pre-line">
                              {post.content}
                            </p>
                          )}

                          {/* Post Media Grid */}
                          {mediaList.length > 0 && (
                            <div className={`grid gap-1.5 rounded-[var(--radius-card)] overflow-hidden border border-border bg-black ${
 mediaList.length === 1 ? 'grid-cols-1' : mediaList.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
 }`}>
                              {mediaList.map((media: any, idx: number) => (
                                <div key={idx} className="relative aspect-video max-h-64 flex items-center justify-center overflow-hidden group">
                                  {media.type === 'VIDEO' ? (
                                    <video src={media.url} controls className="w-full h-full object-contain" />
                                  ) : (
                                    <img 
                                      src={media.url} 
                                      alt={`Media ${idx + 1}`} 
                                      onClick={() => {
                                        const imagesOnly = mediaList.filter((m: any) => m.type === 'IMAGE').map((m: any) => m.url);
                                        const imgIdx = imagesOnly.indexOf(media.url);
                                        openGuestImageModal(
                                          imagesOnly,
                                          imgIdx >= 0 ? imgIdx : 0,
                                          `feed-${sanitizeFilenamePart(post.id)}`
                                        );
                                      }}
                                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                                    />
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => handleDownloadMedia(
                                      e,
                                      media.url,
                                      `feed-${sanitizeFilenamePart(post.id)}-${idx + 1}${getMediaExtension(media.url, media.type)}`
                                    )}
                                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black text-white rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10 touch-manipulation"
                                    title="Télécharger"
                                  >
                                    <Download className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Like Bar */}
                          <div className="flex items-center gap-4 pt-1">
                            <button
                              onClick={() => handleToggleLike(post.id)}
                              className={`flex items-center gap-1.5 text-xs font-semibold transition px-3 py-1.5 rounded-full ${
 post.likes && Array.isArray(post.likes) && post.likes.includes(`guest_${guest?.id}`)
 ? 'text-pink-500 bg-pink-500/10'
 : 'text-muted hover:text-foreground hover:bg-surface-muted'
 }`}
                            >
                              <ThumbsUp className="w-4 h-4" />
                              <span>
                                {post.likes && Array.isArray(post.likes) ? post.likes.length : 0} J'aime
                              </span>
                            </button>
                          </div>

                          {/* Comments Section */}
                          <div className="border-t border-border pt-3.5 space-y-4">
                            <h4 className="font-semibold text-muted text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                              <MessageCircle className="w-3.5 h-3.5 text-muted" />
                              Commentaires ({post.comments.length})
                            </h4>

                            {post.comments.length > 0 && (
                              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                                {post.comments.map((comment: any) => (
                                  <div key={comment.id} className="bg-surface border border-border shadow-[var(--shadow-soft)] p-3 rounded-[var(--radius-card)] text-[11px] space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-primary">{comment.authorName}</span>
                                      <span className="text-[8px] text-muted font-medium">
                                        {new Date(comment.createdAt).toLocaleDateString('fr-FR', {
                                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                        })}
                                      </span>
                                    </div>
                                    <p className="text-foreground/80 leading-relaxed whitespace-pre-line">{comment.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Add Comment Form */}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Écrire un commentaire..."
                                value={guestCommentContents[post.id] || ''}
                                onChange={(e) => setGuestCommentContents({ ...guestCommentContents, [post.id]: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCreateGuestComment(post.id);
                                }}
                                className="flex-1 px-3.5 py-2 bg-surface border border-border shadow-[var(--shadow-soft)] rounded-xl text-[11px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-foreground placeholder:text-muted"
                              />
                              <button
                                onClick={() => handleCreateGuestComment(post.id)}
                                disabled={guestCommentSubmitting[post.id] || !guestCommentContents[post.id]?.trim()}
                                className="p-2.5 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white rounded-xl transition shadow-sm"
                              >
                                {guestCommentSubmitting[post.id] ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Send className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

        {/* Expanded Image Modal with Carousel */}
        {expandedImages.length > 0 && (
          <div 
            className="fixed inset-0 bg-black/95 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            onClick={() => setExpandedImages([])}
          >
            <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-[var(--radius-card)] flex items-center justify-center">
              <img 
                src={expandedImages[expandedImageIndex]} 
                alt="Expanded" 
                className="max-h-[85vh] max-w-full object-contain" 
                onClick={(e) => e.stopPropagation()}
              />
              
              {/* Download Button */}
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
                className="absolute top-4 left-4 p-2 bg-black/60 hover:bg-black text-white rounded-full transition z-10"
                title="Télécharger"
              >
                <Download className="w-5 h-5" />
              </button>

              {/* Close Button */}
              <button
                onClick={() => setExpandedImages([])}
                className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black text-white rounded-full transition z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Carousel Navigation */}
              {expandedImages.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedImageIndex((prev) => (prev - 1 + expandedImages.length) % expandedImages.length);
                    }}
                    className="absolute left-4 p-3 bg-black/50 hover:bg-black text-white rounded-full transition"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedImageIndex((prev) => (prev + 1) % expandedImages.length);
                    }}
                    className="absolute right-4 p-3 bg-black/50 hover:bg-black text-white rounded-full transition"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  <div className="absolute bottom-4 bg-black/60 px-3 py-1 rounded-full text-white text-xs font-semibold">
                    {expandedImageIndex + 1} / {expandedImages.length}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Bouton sticky Pass Express en bas d'écran */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-sm px-4">
          <button
            type="button"
            onClick={() => setShowFullScreenQr(true)}
            className="w-full py-3 px-4 rounded-2xl bg-slate-900 text-white shadow-2xl flex items-center justify-between border border-white/15 active:scale-95 transition-all hover:bg-slate-800 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-xs">
                <QrCode className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold leading-tight">Mon Pass d&apos;entrée QR</p>
                <p className="text-[11px] text-white/70">
                  {guest.tableDetails?.tableName
                    ? `${guest.tableDetails.tableName}${guest.tableDetails.seatIndex != null ? ` • Place ${guest.tableDetails.seatIndex + 1}` : ''}`
                    : 'Toucher pour afficher le pass'}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-lg text-white">
              Plein écran
            </span>
          </button>
        </div>

        {/* Modal QR Code Plein Écran & Contraste Élevé pour le scan d'accueil */}
        {showFullScreenQr && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in"
            onClick={() => setShowFullScreenQr(false)}
          >
            <button
              type="button"
              onClick={() => setShowFullScreenQr(false)}
              className="absolute top-5 right-5 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-6 h-6" />
            </button>

            <div
              className="bg-white rounded-3xl p-6 sm:p-8 text-center max-w-sm w-full shadow-2xl space-y-4 animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-1">
                <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  Pass Invité Jour J
                </span>
                <h3 className="text-xl font-bold text-slate-900">
                  {guest.firstName} {guest.lastName}
                </h3>
              </div>

              {guest.tableDetails?.tableName && (
                <div className="py-2.5 px-4 rounded-xl bg-slate-50 border border-slate-200 text-left">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Placement assigné</p>
                  <p className="text-base font-extrabold text-slate-900">
                    {guest.tableDetails.tableName}
                    {guest.tableDetails.seatIndex != null ? ` • Siège n° ${guest.tableDetails.seatIndex + 1}` : ''}
                  </p>
                </div>
              )}

              <div className="p-4 bg-white border-2 border-slate-900 rounded-2xl inline-block shadow-inner">
                <img
                  src={getGuestQrImageUrl(guest.id, 320)}
                  alt="Pass QR"
                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
                />
              </div>

              <p className="text-xs text-slate-500 leading-snug">
                Présentez ce QR Code directement à l&apos;équipe d&apos;accueil à l&apos;entrée de la salle.
              </p>

              <button
                type="button"
                onClick={() => setShowFullScreenQr(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
        </GuestPortalShell>
    );
  }

  const formatText = (text: string) => {
    if (!text) return '';
    let formatted = text
      .replace(/\{\{firstName\}\}/g, guest.firstName)
      .replace(/\{\{lastName\}\}/g, guest.lastName);
    
    if (guest.event) {
      formatted = formatted
        .replace(/\{\{title\}\}/g, guest.event.title)
        .replace(/\{\{description\}\}/g, guest.event.description || '')
        .replace(/\{\{location\}\}/g, guest.event.location)
        .replace(/\{\{date\}\}/g, new Date(guest.event.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
    }
    return formatted;
  };

  const template = guest.event.invitations?.[0]?.template;
  const global = template?.content?.global || {};
  const themedInvitation = applyOrgInvitationThemeIfNeeded(
    global,
    (template?.content?.elements || []) as Array<{ id: string; type: string; rsvpPlacement?: string; color?: string; fontSize?: string; text?: string; [key: string]: unknown }>,
    guest.branding,
  );
  const bgType = global.bgType || 'color';
  const bgColor = themedInvitation.background || global.bgColor || '#ffffff';
  const bgImageUrl = global.bgImageUrl || '';
  const bgPattern = global.bgPattern || 'none';
  const frameType = global.frameType || 'none';
  const floralColor = global.floralColor || guest.branding?.accent || '#b91c1c';
  const floralType = global.floralType || 'roses';
  const floralDensity = global.floralDensity !== undefined ? global.floralDensity : 40;
  const canvasStyle = getCanvasStyle(global);
  const templateElements = ensureMandatoryRsvpFieldsOnElements(themedInvitation.elements);
  const inlineTemplateElements = templateElements.filter(
    (el) => el.type !== 'rsvp-block' || el.rsvpPlacement !== 'outside',
  );
  const outsideRsvpElements = templateElements.filter(
    (el) => el.type === 'rsvp-block' && el.rsvpPlacement === 'outside',
  );

  const updateCustomField = (fieldId: string, value: string | number | boolean) => {
    setCustomFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const renderRsvpFieldInput = (field: RsvpField) => {
    const options = parseFieldOptions(field.options);
    const inputClass = 'w-full px-3.5 py-2 border border-border rounded-xl text-sm text-foreground focus:outline-primary bg-surface';
    const value = customFieldValues[field.id];

    if (field.type === 'textarea') {
      return (
        <textarea
          value={value || ''}
          onChange={(e) => updateCustomField(field.id, e.target.value)}
          required={field.required}
          rows={3}
          placeholder={field.placeholder || 'Votre réponse...'}
          className={`${inputClass} resize-none`}
        />
      );
    }

    if (field.type === 'select') {
      return (
        <select
          value={value || ''}
          onChange={(e) => updateCustomField(field.id, e.target.value)}
          required={field.required}
          className={inputClass}
        >
          <option value="">Sélectionnez une option...</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (field.type === 'radio') {
      return (
        <div className="space-y-2">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name={`rsvp-field-${field.id}`}
                checked={value === opt}
                onChange={() => updateCustomField(field.id, opt)}
                required={field.required}
                className="text-primary focus:ring-primary"
              />
              <span className="text-xs text-muted font-semibold">{opt}</span>
            </label>
          ))}
        </div>
      );
    }

    if (field.type === 'checkbox') {
      return (
        <label className="flex items-center gap-2 cursor-pointer select-none py-1">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => updateCustomField(field.id, e.target.checked)}
            required={field.required}
            className="rounded text-primary focus:ring-primary"
          />
          <span className="text-xs text-muted font-semibold">{field.label}</span>
        </label>
      );
    }

    if (field.type === 'yes_no') {
      return (
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Oui', val: true },
            { label: 'Non', val: false },
          ].map(({ label, val }) => (
            <button
              key={label}
              type="button"
              onClick={() => updateCustomField(field.id, val)}
              className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
 value === val
 ? 'border-primary bg-primary/10 text-primary'
 : 'border-border text-muted hover:bg-surface-muted'
 }`}
            >
              {label}
            </button>
          ))}
        </div>
      );
    }

    if (field.type === 'rating') {
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => updateCustomField(field.id, rating)}
              className={`w-9 h-9 rounded-lg text-sm font-bold border transition ${
 Number(value) === rating
 ? 'border-amber-500 bg-amber-50 text-amber-700'
 : 'border-border text-muted hover:bg-surface-muted'
 }`}
            >
              {rating}
            </button>
          ))}
        </div>
      );
    }

    const inputType =
      field.type === 'number' ? 'number'
      : field.type === 'email' ? 'email'
      : field.type === 'phone' ? 'tel'
      : field.type === 'date' ? 'date'
      : 'text';

    return (
      <input
        type={inputType}
        value={value ?? ''}
        onChange={(e) => updateCustomField(
          field.id,
          field.type === 'number' ? Number(e.target.value) : e.target.value
        )}
        required={field.required}
        placeholder={field.placeholder || 'Votre réponse...'}
        className={inputClass}
        min={field.type === 'number' ? 0 : undefined}
      />
    );
  };

  const renderRsvpLockedBanner = () =>
    rsvpLocked ? (
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 flex items-start gap-3 text-sm text-amber-900 dark:text-amber-200">
        <Clock className="w-5 h-5 flex-shrink-0 text-amber-600" />
        <div>
          <p className="font-bold">Réponse verrouillée</p>
          <p className="text-xs mt-0.5 opacity-90">
            La date de célébration est passée. Votre réponse RSVP ne peut plus être modifiée.
          </p>
        </div>
      </div>
    ) : null;

  const renderRsvpFormControls = (el: any, variant: 'inline' | 'outside' = 'inline') => {
    const isOutside = variant === 'outside';
    return (
      <div
        className={
          isOutside
            ? 'bg-surface border border-border rounded-[var(--radius-card)] p-6 sm:p-8 space-y-6 text-center shadow-[var(--shadow-soft)] relative w-full'
            : 'bg-surface border border-border rounded-[var(--radius-card)] p-6 space-y-5 text-center shadow-[var(--shadow-soft)]'
        }
      >
        {isOutside && (
          <div className="absolute top-0 inset-x-0 h-px bg-border" />
        )}
        <div className={isOutside ? 'relative z-10' : undefined}>
        {renderRsvpLockedBanner()}
        <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-button)] bg-surface-muted border border-border text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
          Confirmez votre présence
        </span>
        <div className={`font-semibold text-foreground ${isOutside ? 'text-base sm:text-lg' : 'text-sm'}`}>{formatText(el.text)}</div>
        
        {/* Yes/No Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            disabled={rsvpLocked}
            onClick={() => !rsvpLocked && setRsvpStatus('ACCEPTED')}
            className={`py-3.5 px-4 border rounded-[var(--radius-button)] flex flex-col items-center justify-center gap-1.5 transition ${rsvpStatus === 'ACCEPTED' ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-border hover:bg-surface-muted text-muted'}`}
          >
            <CheckCircle2 className={`w-6 h-6 ${rsvpStatus === 'ACCEPTED' ? 'text-emerald-600' : 'text-foreground/80'}`} />
            <span className="text-xs font-semibold">Oui, je serai présent</span>
          </button>

          <button
            type="button"
            disabled={rsvpLocked}
            onClick={() => !rsvpLocked && setRsvpStatus('DECLINED')}
            className={`py-3.5 px-4 border rounded-[var(--radius-button)] flex flex-col items-center justify-center gap-1.5 transition ${rsvpStatus === 'DECLINED' ? 'border-rose-600 bg-rose-50 text-rose-800' : 'border-border hover:bg-surface-muted text-muted'}`}
          >
            <XCircle className={`w-6 h-6 ${rsvpStatus === 'DECLINED' ? 'text-rose-600' : 'text-foreground/80'}`} />
            <span className="text-xs font-semibold">Non, je ne pourrai pas</span>
          </button>
        </div>

        {/* If attending, show custom and standard fields */}
        {rsvpStatus === 'ACCEPTED' && (
          <div className="space-y-4 border-t border-border/60 pt-4 text-left">
            {/* Custom Fields */}
            {ensureMandatoryRsvpFields(el.rsvpFields || []).map((field: RsvpField) => (
              <div key={field.id} className="space-y-1.5">
                {field.type !== 'checkbox' && (
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider">
                    {field.label} {field.required && <span className="text-rose-500">*</span>}
                  </label>
                )}
                {field.helpText && (
                  <p className="text-[10px] text-muted">{field.helpText}</p>
                )}
                {renderRsvpFieldInput(field)}
              </div>
            ))}

            {/* Standard Fields */}
            <div className="space-y-4 border-t border-border pt-4">
              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-1">Message à l'organisateur</label>
                <textarea
                  value={additionalNotes}
                  onChange={e => setAdditionalNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-xl text-sm text-foreground focus:outline-primary bg-surface"
                  placeholder="Ex: Je serai accompagné(e) de..."
                  rows={2}
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || rsvpLocked}
          className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-[var(--radius-button)] transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Envoi de la réponse...
            </>
          ) : (
            'Envoyer ma Réponse'
          )}
        </button>
        </div>
      </div>
    );
  };

  const InvitationWrapper = template ? 'form' : 'div';
  const invitationWrapperProps = template
    ? {
        onSubmit: handleSubmitRsvp,
        className: 'w-full flex flex-col items-center gap-6',
        style: { maxWidth: canvasStyle.maxWidth },
      }
    : {
        className: 'w-full flex flex-col items-center gap-6',
        style: { maxWidth: canvasStyle.maxWidth },
      };

  return (
    <GuestPortalShell
      title={guest.event.title}
      eyebrow="Invitation"
      guestId={guestId}
      organizationName={guest.organizationName}
      headerRight={
        <ShareButton
          title={`${guest.event.title} · Invitation`}
          text={`Invitation ${site.platformName} pour ${guest.firstName}.`}
          url={guestRsvpUrl(guestId)}
          className="h-8 w-8 !bg-surface border-border"
        />
      }
      contentClassName="flex flex-col items-center gap-5 max-w-none"
    >
      {/* Load Google Fonts stylesheet */}
      <link 
        href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Dancing+Script:wght@500;700&family=Great+Vibes&family=Montserrat:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Pinyon+Script&family=Monsieur+La+Doulaise&family=Italiana&family=Bodoni+Moda:ital,wght@0,400;0,700;1,400&family=Allura&family=Parisienne&family=Prata&family=Sacramento&family=Marcellus&display=swap" 
        rel="stylesheet" 
      />

      <InvitationWrapper {...invitationWrapperProps}>
      <div
        style={{
          ...(template ? getBackgroundStyle(bgType, bgColor, bgImageUrl, bgPattern) : { backgroundColor: '#ffffff' }),
          maxWidth: canvasStyle.maxWidth,
          minHeight: canvasStyle.minHeight,
        }}
        className={`w-full border border-border shadow-[var(--shadow-soft)] relative z-10 overflow-hidden flex flex-col transition-all duration-300 ${
          template && frameType === 'arch' ? 'rounded-t-[240px] border border-amber-200/60' : 'rounded-[var(--radius-card)]'
        }`}
      >
        {/* Top visual envelope flap (only shown if not using custom template) */}
        {!template && <div className="h-3 bg-gradient-to-r from-primary to-primary/80" />}

        {/* Double Border Frame */}
        {template && frameType === 'double-border' && (
          <>
            <div className="absolute inset-3 border border-amber-500/20 rounded-2xl pointer-events-none" />
            <div className="absolute inset-4 border border-amber-500/10 rounded-2xl pointer-events-none" />
          </>
        )}

        {/* Gold Border Frame */}
        {template && frameType === 'gold-border' && (
          <div className="absolute inset-3 border border-amber-500/30 rounded-2xl pointer-events-none shadow-[0_0_15px_rgba(197,160,89,0.05)]" />
        )}

        {/* Floral Wreath Frame */}
        {template && frameType === 'floral-wreath' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
            <svg className="w-80 h-80 text-amber-600" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.5">
              <circle cx="50" cy="50" r="35" strokeDasharray="2 2" />
              {[...Array(16)].map((_, i) => {
                const angle = (i * 22.5 * Math.PI) / 180;
                const x = 50 + 35 * Math.cos(angle);
                const y = 50 + 35 * Math.sin(angle);
                return (
                  <g key={i} transform={`translate(${x}, ${y}) rotate(${i * 22.5 + 90})`}>
                    <path d="M0,0 C-3,-6 0,-10 3,-6 C6,-3 3,0 0,0" fill="currentColor" fillOpacity="0.3" />
                    <path d="M0,0 C3,-6 0,-10 -3,-6 C-6,-3 -3,0 0,0" fill="currentColor" fillOpacity="0.3" />
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* Floral Arch Frame */}
        {template && frameType === 'floral-arch' && (
          <div className="absolute inset-0 pointer-events-none z-0">
            <svg className="w-full h-full" viewBox="0 0 400 600" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id={`floral-arch-grad-${floralColor.replace('#', '')}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={lightenColor(floralColor, 40)} />
                  <stop offset="60%" stopColor={floralColor} />
                  <stop offset="100%" stopColor={darkenColor(floralColor, 40)} />
                </radialGradient>
              </defs>

              {/* Main Arch branches */}
              <path 
                d="M15,500 Q15,80 200,30 T385,500" 
                stroke={floralType === 'gold-leaves' ? '#d4af37' : '#3f492a'} 
                strokeWidth="3" 
                fill="none" 
                opacity="0.4"
              />
              <path 
                d="M30,500 Q30,100 200,50 T370,500" 
                stroke={floralType === 'gold-leaves' ? '#b59410' : '#2d361e'} 
                strokeWidth="2" 
                fill="none" 
                opacity="0.3"
              />

              {/* Generate dense flowers and leaves along the arch */}
              {[...Array(floralDensity)].map((_, i) => {
                const t = i / (floralDensity - 1);
                // Parabolic arch formula:
                // x goes from 15 to 385
                const x = 15 + t * 370;
                // y is a parabola: high in the middle (y=30), low at the ends (y=480)
                const y = 30 + 4 * (480 - 30) * Math.pow(t - 0.5, 2);

                // Deterministic pseudo-random offsets for organic look
                const seed1 = Math.sin(i * 123.45);
                const seed2 = Math.cos(i * 678.90);
                const offsetX = seed1 * 15;
                const offsetY = seed2 * 15;
                const scale = 0.7 + Math.abs(seed1) * 0.6; // Scale between 0.7 and 1.3
                const rotation = seed2 * 180; // Random rotation

                const px = x + offsetX;
                const py = y + offsetY;

                // Skip some flowers near the bottom to make it cascade naturally (thinner at the bottom)
                const isNearBottom = t < 0.1 || t > 0.9;
                const skipFlower = isNearBottom && (i % 3 === 0);

                return (
                  <g key={i} transform={`translate(${px}, ${py}) scale(${scale}) rotate(${rotation})`}>
                    {/* Leaves (always render leaves behind flowers) */}
                    {floralType !== 'gold-leaves' && (
                      <>
                        {/* Leaf 1 */}
                        <path 
                          d="M0,0 C-10,-15 -25,-10 -20,5 C-15,10 -5,5 0,0" 
                          fill={floralType === 'eucalyptus' ? '#7d8c5c' : '#4d7c0f'} 
                          opacity="0.85" 
                        />
                        {/* Leaf 2 */}
                        <path 
                          d="M0,0 C10,-15 25,-10 20,5 C15,10 5,5 0,0" 
                          fill={floralType === 'eucalyptus' ? '#92a173' : '#3f6212'} 
                          opacity="0.85" 
                        />
                      </>
                    )}

                    {/* Specific Flower Types */}
                    {!skipFlower && (
                      <>
                        {floralType === 'roses' && (
                          <>
                            {/* Red Rose Petals */}
                            <circle cx="0" cy="0" r="10" fill={`url(#floral-arch-grad-${floralColor.replace('#', '')})`} />
                            <path d="M-6,-4 C-10,-10 -2,-12 -4,-6" fill={darkenColor(floralColor, 15)} opacity="0.9" />
                            <path d="M6,-4 C10,-10 2,-12 4,-6" fill={darkenColor(floralColor, 15)} opacity="0.9" />
                            <path d="M-6,4 C-10,10 -2,12 -4,6" fill={darkenColor(floralColor, 10)} opacity="0.9" />
                            <path d="M6,4 C10,10 2,12 4,6" fill={darkenColor(floralColor, 10)} opacity="0.9" />
                            {/* Rose Center */}
                            <circle cx="0" cy="0" r="4" fill={darkenColor(floralColor, 30)} />
                            <circle cx="0" cy="0" r="2" fill="#fef08a" opacity="0.8" />
                          </>
                        )}

                        {floralType === 'cherry-blossom' && (
                          <>
                            {/* 5 Blossoms petals */}
                            {[...Array(5)].map((_, j) => {
                              const angle = (j * 72 * Math.PI) / 180;
                              const rx = 8 * Math.cos(angle);
                              const ry = 8 * Math.sin(angle);
                              return (
                                <path 
                                  key={j}
                                  d={`M0,0 C${rx * 1.5},${ry * 0.5} ${rx * 1.5},${ry * 1.5} 0,0`} 
                                  fill={floralColor} 
                                  stroke={darkenColor(floralColor, 20)}
                                  strokeWidth="0.5"
                                />
                              );
                            })}
                            <circle cx="0" cy="0" r="3" fill="#fef08a" />
                            <circle cx="0" cy="0" r="1" fill="#ca8a04" />
                          </>
                        )}

                        {floralType === 'gold-leaves' && (
                          <>
                            {/* Gold Leaf 1 */}
                            <path 
                              d="M0,0 C-8,-12 -18,-8 -15,4 C-12,8 -4,4 0,0" 
                              fill={floralColor} 
                              stroke={darkenColor(floralColor, 20)}
                              strokeWidth="0.5"
                            />
                            {/* Gold Leaf 2 */}
                            <path 
                              d="M0,0 C8,-12 18,-8 15,4 C12,8 4,4 0,0" 
                              fill={lightenColor(floralColor, 20)} 
                              stroke={darkenColor(floralColor, 10)}
                              strokeWidth="0.5"
                            />
                            {/* Gold Berries */}
                            <circle cx="-2" cy="-6" r="2" fill="#ffffff" stroke={floralColor} strokeWidth="0.5" />
                            <circle cx="2" cy="-6" r="1.5" fill="#fef3c7" stroke={floralColor} strokeWidth="0.5" />
                          </>
                        )}

                        {floralType === 'sunflowers' && (
                          <>
                            {/* Sunflower Petals */}
                            {[...Array(12)].map((_, j) => {
                              const rot = j * 30;
                              return (
                                <ellipse 
                                  key={j}
                                  cx="0"
                                  cy="-8"
                                  rx="3"
                                  ry="7"
                                  fill={floralColor}
                                  transform={`rotate(${rot})`}
                                />
                              );
                            })}
                            {/* Center seed head */}
                            <circle cx="0" cy="0" r="5" fill="#451a03" />
                            <circle cx="0" cy="0" r="4" fill="#1c1917" stroke="#78350f" strokeWidth="0.5" />
                          </>
                        )}

                        {floralType === 'eucalyptus' && (
                          <>
                            {/* Eucalyptus round leaves */}
                            <circle cx="-5" cy="-5" r="8" fill={floralColor} opacity="0.9" />
                            <circle cx="5" cy="5" r="7" fill={lightenColor(floralColor, 15)} opacity="0.9" />
                            <circle cx="-2" cy="6" r="6" fill={darkenColor(floralColor, 15)} opacity="0.8" />
                            {/* White berries */}
                            <circle cx="4" cy="-4" r="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
                            <circle cx="7" cy="-2" r="1.5" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.5" />
                          </>
                        )}
                      </>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* Boho Dried Frame */}
        {template && frameType === 'boho-dried' && (
          <>
            <div className="absolute top-0 left-0 w-32 h-32 pointer-events-none opacity-25 text-amber-800">
              <svg className="w-full h-full" viewBox="0 0 100 100" fill="currentColor">
                <path d="M0,0 C20,10 40,30 50,50 C40,45 25,35 0,30 Z" />
                <path d="M0,0 C10,20 30,40 50,50 C45,40 35,25 30,0 Z" />
                <path d="M0,0 C15,15 35,35 50,50 Z" stroke="currentColor" strokeWidth="1" />
              </svg>
            </div>
            <div className="absolute bottom-0 right-0 w-32 h-32 pointer-events-none opacity-25 text-amber-800 transform rotate-180">
              <svg className="w-full h-full" viewBox="0 0 100 100" fill="currentColor">
                <path d="M0,0 C20,10 40,30 50,50 C40,45 25,35 0,30 Z" />
                <path d="M0,0 C10,20 30,40 50,50 C45,40 35,25 30,0 Z" />
                <path d="M0,0 C15,15 35,35 50,50 Z" stroke="currentColor" strokeWidth="1" />
              </svg>
            </div>
          </>
        )}

        {/* Gold Leaves Circle Frame */}
        {template && frameType === 'gold-leaves-circle' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg className="w-80 h-80 text-amber-500" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="0.5" />
              {[...Array(20)].map((_, i) => {
                const angle = (i * 18 * Math.PI) / 180;
                const x = 50 + 38 * Math.cos(angle);
                const y = 50 + 38 * Math.sin(angle);
                return (
                  <g key={i} transform={`translate(${x}, ${y}) rotate(${i * 18 + 45})`}>
                    <path d="M0,0 C2,-5 6,-7 8,-2 C6,3 2,3 0,0" fill="currentColor" fillOpacity="0.6" />
                    <circle cx="-2" cy="-2" r="1" fill="#fef3c7" stroke="currentColor" strokeWidth="0.1" />
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* Minimal Leaves Frame */}
        {template && frameType === 'minimal-leaves' && (
          <>
            <div className="absolute top-4 right-4 w-24 h-24 pointer-events-none opacity-30 text-emerald-800">
              <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M10,90 Q50,50 90,10" />
                <path d="M50,50 Q60,30 75,25 Q65,45 50,50" fill="currentColor" fillOpacity="0.2" />
                <path d="M30,70 Q40,50 55,45 Q45,65 30,70" fill="currentColor" fillOpacity="0.2" />
                <path d="M70,30 Q80,10 95,5 Q85,25 70,30" fill="currentColor" fillOpacity="0.2" />
              </svg>
            </div>
            <div className="absolute bottom-4 left-4 w-24 h-24 pointer-events-none opacity-30 text-emerald-800 transform rotate-180">
              <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M10,90 Q50,50 90,10" />
                <path d="M50,50 Q60,30 75,25 Q65,45 50,50" fill="currentColor" fillOpacity="0.2" />
                <path d="M30,70 Q40,50 55,45 Q45,65 30,70" fill="currentColor" fillOpacity="0.2" />
                <path d="M70,30 Q80,10 95,5 Q85,25 70,30" fill="currentColor" fillOpacity="0.2" />
              </svg>
            </div>
          </>
        )}

        {/* Boho Botanical Corners */}
        {template && bgPattern === 'boho' && (
          <>
            {/* Top-Left Branch */}
            <svg className="absolute top-2 left-2 w-20 h-24 text-amber-800/15 pointer-events-none" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10,10 C30,15 60,35 70,70" />
              <path d="M25,14 C22,22 18,28 12,30 C18,26 24,22 28,15" fill="currentColor" fillOpacity="0.1" />
              <path d="M40,22 C38,32 32,40 24,44 C32,38 38,30 42,24" fill="currentColor" fillOpacity="0.1" />
              <path d="M55,35 C52,45 45,52 36,56 C45,50 52,42 56,36" fill="currentColor" fillOpacity="0.1" />
              <path d="M65,52 C62,62 55,68 46,72 C55,66 62,58 66,53" fill="currentColor" fillOpacity="0.1" />
            </svg>
            {/* Bottom-Right Branch */}
            <svg className="absolute bottom-2 right-2 w-20 h-24 text-amber-800/15 pointer-events-none transform rotate-180" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10,10 C30,15 60,35 70,70" />
              <path d="M25,14 C22,22 18,28 12,30 C18,26 24,22 28,15" fill="currentColor" fillOpacity="0.1" />
              <path d="M40,22 C38,32 32,40 24,44 C32,38 38,30 42,24" fill="currentColor" fillOpacity="0.1" />
              <path d="M55,35 C52,45 45,52 36,56 C45,50 52,42 56,36" fill="currentColor" fillOpacity="0.1" />
              <path d="M65,52 C62,62 55,68 46,72 C55,66 62,58 66,53" fill="currentColor" fillOpacity="0.1" />
            </svg>
          </>
        )}

        {/* Event Card Content */}
        <div className="p-8 space-y-8 flex-1 relative z-10">
          {/* Header */}
          {template ? (
            <div
              className={
                global.layoutMode === 'free'
                  ? 'relative pt-2 min-h-[240px] w-full'
                  : 'flex flex-wrap gap-y-4 -mx-2 pt-2'
              }
            >
              {inlineTemplateElements.map((el: any, index: number) => {
                const isFree = global.layoutMode === 'free' || el.positionMode === 'absolute';
                const widthClass = isFree
                  ? ''
                  : el.width === 'half'
                    ? 'w-1/2 px-2'
                    : el.width === 'third'
                      ? 'w-1/3 px-2'
                      : 'w-full px-2';
                
                return (
                  <div
                    key={el.id}
                    className={widthClass}
                    style={
                      isFree
                        ? {
                            position: 'absolute',
                            left: `${el.xPct ?? 8}%`,
                            top: `${el.yPct ?? 8}%`,
                            width: `${el.wPct ?? 84}%`,
                            zIndex: el.zIndex ?? index + 1,
                          }
                        : undefined
                    }
                  >
                    {el.type === 'text' && (
                      <div 
                        style={{ 
                          color: el.color, 
                          fontSize: el.fontSize, 
                          textAlign: el.align,
                          fontFamily: el.fontFamily || 'Cormorant Garamond',
                          letterSpacing: el.letterSpacing || 'normal',
                          fontWeight: el.bold ? 'bold' : 'normal',
                          fontStyle: el.italic ? 'italic' : 'normal'
                        }}
                        className="leading-relaxed break-words"
                      >
                        {formatText(el.text)}
                      </div>
                    )}
                    {el.type === 'button' && (
                      <div className={`flex justify-${el.align === 'left' ? 'start' : el.align === 'right' ? 'end' : 'center'}`}>
                        {el.buttonLink ? (
                          el.buttonLink === '{{rsvpLink}}' || el.buttonLink === '#rsvp' || el.buttonLink === '#rsvp-section' ? (
                            <button 
                              type="button"
                              onClick={() => {
                                document.getElementById('rsvp-section')?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              style={{ 
                                backgroundColor: el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist' ? 'transparent' : el.color || '#059669', 
                                color: el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist' ? el.color || '#059669' : '#ffffff', 
                                borderColor: el.buttonStyle === 'outline' || el.buttonStyle === 'double-border' || el.buttonStyle === 'minimalist' ? el.color || '#059669' : 'transparent',
                                fontSize: el.fontSize,
                                fontFamily: el.fontFamily || 'Cormorant Garamond',
                                letterSpacing: el.letterSpacing || 'normal',
                                fontWeight: el.bold ? 'bold' : 'normal',
                                fontStyle: el.italic ? 'italic' : 'normal'
                              }}
                              className={`font-bold text-center inline-block transition-all cursor-pointer ${
 el.buttonStyle === 'outline' ? 'px-6 py-2.5 rounded-xl border-2 shadow-sm' :
 el.buttonStyle === 'pill' ? 'px-6 py-2.5 rounded-full shadow-md' :
 el.buttonStyle === 'gold-glow' ? 'px-6 py-2.5 rounded-xl shadow-[0_0_15px_rgba(197,160,89,0.4)]' :
 el.buttonStyle === 'double-border' ? 'px-6 py-2 rounded-xl border-4 border-double' :
 el.buttonStyle === 'minimalist' ? 'px-2 py-1 border-b-2 rounded-none shadow-none' :
 'px-5 py-2.5 rounded-xl shadow-md shadow-primary/10'
 }`}
                            >
                              {formatText(el.text)}
                            </button>
                          ) : (
                            <a 
                              href={formatText(el.buttonLink)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ 
                                backgroundColor: el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist' ? 'transparent' : el.color || '#059669', 
                                color: el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist' ? el.color || '#059669' : '#ffffff', 
                                borderColor: el.buttonStyle === 'outline' || el.buttonStyle === 'double-border' || el.buttonStyle === 'minimalist' ? el.color || '#059669' : 'transparent',
                                fontSize: el.fontSize,
                                fontFamily: el.fontFamily || 'Cormorant Garamond',
                                letterSpacing: el.letterSpacing || 'normal',
                                fontWeight: el.bold ? 'bold' : 'normal',
                                fontStyle: el.italic ? 'italic' : 'normal',
                                display: 'inline-block'
                              }}
                              className={`font-bold text-center transition-all cursor-pointer ${
 el.buttonStyle === 'outline' ? 'px-6 py-2.5 rounded-xl border-2 shadow-sm' :
 el.buttonStyle === 'pill' ? 'px-6 py-2.5 rounded-full shadow-md' :
 el.buttonStyle === 'gold-glow' ? 'px-6 py-2.5 rounded-xl shadow-[0_0_15px_rgba(197,160,89,0.4)]' :
 el.buttonStyle === 'double-border' ? 'px-6 py-2 rounded-xl border-4 border-double' :
 el.buttonStyle === 'minimalist' ? 'px-2 py-1 border-b-2 rounded-none shadow-none' :
 'px-5 py-2.5 rounded-xl shadow-md shadow-primary/10'
 }`}
                            >
                              {formatText(el.text)}
                            </a>
                          )
                        ) : (
                          <div 
                            style={{ 
                              backgroundColor: el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist' ? 'transparent' : el.color || '#059669', 
                              color: el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist' ? el.color || '#059669' : '#ffffff', 
                              borderColor: el.buttonStyle === 'outline' || el.buttonStyle === 'double-border' || el.buttonStyle === 'minimalist' ? el.color || '#059669' : 'transparent',
                              fontSize: el.fontSize,
                              fontFamily: el.fontFamily || 'Cormorant Garamond',
                              letterSpacing: el.letterSpacing || 'normal',
                              fontWeight: el.bold ? 'bold' : 'normal',
                              fontStyle: el.italic ? 'italic' : 'normal'
                            }}
                            className={`font-bold text-center inline-block transition-all ${
 el.buttonStyle === 'outline' ? 'px-6 py-2.5 rounded-xl border-2 shadow-sm' :
 el.buttonStyle === 'pill' ? 'px-6 py-2.5 rounded-full shadow-md' :
 el.buttonStyle === 'gold-glow' ? 'px-6 py-2.5 rounded-xl shadow-[0_0_15px_rgba(197,160,89,0.4)]' :
 el.buttonStyle === 'double-border' ? 'px-6 py-2 rounded-xl border-4 border-double' :
 el.buttonStyle === 'minimalist' ? 'px-2 py-1 border-b-2 rounded-none shadow-none' :
 'px-5 py-2.5 rounded-xl shadow-md shadow-primary/10'
 }`}
                          >
                            {formatText(el.text)}
                          </div>
                        )}
                      </div>
                    )}
                    {el.type === 'image' && (
                      <div className={`flex justify-${el.align === 'left' ? 'start' : el.align === 'right' ? 'end' : 'center'}`}>
                        {el.imageUrl ? (
                          <img 
                            src={el.imageUrl} 
                            alt="Invitation" 
                            style={{ width: el.imageWidth || '100%', height: el.imageHeight || 'auto', objectFit: el.imageObjectFit || 'cover' }}
                            className={`border border-border shadow-sm ${
 el.imageStyle === 'circle' ? 'rounded-full border-2 border-amber-200 aspect-square' :
 el.imageStyle === 'arch' ? 'rounded-t-[120px] border-2 border-amber-100' :
 el.imageStyle === 'oval' ? 'rounded-[50%] border-2 border-amber-100 aspect-[3/4]' :
 el.imageStyle === 'gold-frame' ? 'rounded-2xl border-4 border-amber-400/80 p-1 bg-surface shadow-lg' :
 el.imageStyle === 'vintage' ? 'rounded-none border-8 border-amber-950/10 shadow-xl sepia contrast-[1.1]' :
 el.imageStyle === 'shadow-luxury' ? 'rounded-3xl border border-border shadow-[0_15px_30px_rgba(197,160,89,0.12)]' :
 'rounded-2xl'
 }`}
                          />
                        ) : (
                          <div className="bg-surface-muted border border-border rounded-xl p-6 text-center text-xs text-muted font-semibold w-full">
                            {el.text || "Image d'illustration"}
                          </div>
                        )}
                      </div>
                    )}
                    {el.type === 'divider' && (
                      <div className={`flex items-center justify-center gap-3 py-2 text-${el.align}`}>
                        {el.dividerStyle === 'solid' && (
                          <div className="w-full border-t" style={{ borderColor: el.color }} />
                        )}
                        {el.dividerStyle === 'dashed' && (
                          <div className="w-full border-t border-dashed" style={{ borderColor: el.color }} />
                        )}
                        {el.dividerStyle === 'ornament-flower' && (
                          <>
                            <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                            <span style={{ color: el.color }} className="text-sm select-none">❀</span>
                            <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                          </>
                        )}
                        {el.dividerStyle === 'ornament-diamond' && (
                          <>
                            <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                            <span style={{ color: el.color }} className="text-xs tracking-widest select-none">✦ ❖ ✦</span>
                            <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                          </>
                        )}
                        {el.dividerStyle === 'ornament-star' && (
                          <>
                            <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                            <span style={{ color: el.color }} className="text-sm select-none">✦</span>
                            <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                          </>
                        )}
                        {el.dividerStyle === 'ornament-leaves' && (
                          <>
                            <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                            <span style={{ color: el.color }} className="text-sm select-none">🌿 ❀ 🌿</span>
                            <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                          </>
                        )}
                        {el.dividerStyle === 'ornament-lace' && (
                          <>
                            <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                            <span style={{ color: el.color }} className="text-xs tracking-widest select-none">⚜ ⚜ ⚜</span>
                            <div className="flex-1 border-t" style={{ borderColor: el.color }} />
                          </>
                        )}
                      </div>
                    )}
                    {el.type === 'curve' && (
                      <div className={`flex justify-${el.align === 'left' ? 'start' : el.align === 'right' ? 'end' : 'center'} py-2`}>
                        <svg className="w-full max-w-[300px]" height="30" viewBox="0 0 300 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path 
                            d={
                              el.curveStyle === 'arc' ? "M10,25 Q 150,2, 290,25" :
                              el.curveStyle === 'flourish-1' ? "M30,15 C70,5 110,25 150,15 C190,5 230,25 270,15 M30,15 C20,15 15,10 20,5 C25,0 35,10 30,15 M270,15 C280,15 285,10 280,5 C275,0 265,10 270,15" :
                              el.curveStyle === 'flourish-2' ? "M10,15 L110,15 C120,15 125,5 135,5 C145,5 145,25 150,25 C155,25 155,5 165,5 C175,5 180,15 190,15 L290,15" :
                              el.curveStyle === 'spiral' ? "M150,15 C120,15 100,25 80,25 C60,25 50,15 60,10 C70,5 80,20 70,22 C65,23 60,15 65,13 M150,15 C180,15 200,25 220,25 C240,25 250,15 240,10 C230,5 220,20 230,22 C235,23 240,15 235,13" :
                              el.curveStyle === 'infinity' ? "M110,15 C110,25 130,25 150,15 C170,5 190,5 190,15 C190,25 170,25 150,15 C130,5 110,5 110,15 Z" :
                              "M0 15 Q 75 0, 150 15 T 300 15"
                            } 
                            stroke={el.color || '#cbd5e1'} 
                            strokeWidth={el.strokeWidth || '3px'} 
                            fill="none" 
                          />
                        </svg>
                      </div>
                    )}
                    {el.type === 'triangle' && (
                      <div className={`flex justify-${el.align === 'left' ? 'start' : el.align === 'right' ? 'end' : 'center'} py-2`}>
                        <svg 
                          width={el.shapeSize || '60px'} 
                          height={el.shapeSize || '60px'} 
                          viewBox="0 0 100 100" 
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <polygon points="50,15 90,85 10,85" fill={el.color || '#cbd5e1'} />
                        </svg>
                      </div>
                    )}
                    {el.type === 'rsvp-block' && (
                      <div id="rsvp-section">
                        {renderRsvpFormControls(el)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-8">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-button)] bg-surface-muted border border-border text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
                  Invitation privée
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight leading-tight">
                  {guest.event.title}
                </h1>
                <p className="text-sm font-medium text-muted">
                  Adressée à <span className="text-foreground font-semibold">{guest.firstName} {guest.lastName}</span>
                </p>
              </div>

              {/* Event Details Box */}
              <div className="bg-surface-muted border border-border rounded-[var(--radius-card)] p-5 space-y-4 text-sm">
                {guest.event.description && (
                  <p className="text-muted italic leading-relaxed text-center border-b border-border pb-3.5">
                    "{guest.event.description}"
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary p-2 rounded-[var(--radius-button)]"><Calendar className="w-5 h-5" /></div>
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-bold text-muted uppercase tracking-widest">Date</div>
                      <div className="font-semibold text-foreground text-xs">
                        {new Date(guest.event.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary p-2 rounded-[var(--radius-button)]"><MapPin className="w-5 h-5" /></div>
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-bold text-muted uppercase tracking-widest">Lieu</div>
                      <div className="font-semibold text-foreground text-xs truncate max-w-[150px]">{guest.event.location}</div>
                    </div>
                  </div>
                </div>
              </div>

              <GuestGuidelinesView
                guidelines={guest.event.guestGuidelines}
                variant="light"
                className="text-left"
              />

              {/* Default RSVP Form */}
              <form onSubmit={handleSubmitRsvp} className="space-y-6">
                {renderRsvpLockedBanner()}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider text-center mb-1">
                    Serez-vous parmi nous ?
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      disabled={rsvpLocked}
                      onClick={() => !rsvpLocked && setRsvpStatus('ACCEPTED')}
                      className={cn(
                        "py-5 px-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all duration-300 border-2",
                        rsvpStatus === 'ACCEPTED' 
                          ? "border-emerald-500 bg-emerald-50/50 shadow-sm ring-4 ring-emerald-500/10" 
                          : "border-border/50 bg-surface hover:bg-surface-muted hover:border-border"
                      )}
                    >
                      <CheckCircle2 className={cn("w-8 h-8", rsvpStatus === 'ACCEPTED' ? "text-emerald-500" : "text-muted")} />
                      <span className={cn("text-sm font-semibold", rsvpStatus === 'ACCEPTED' ? "text-emerald-700" : "text-foreground")}>
                        Oui, je serai présent
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={rsvpLocked}
                      onClick={() => !rsvpLocked && setRsvpStatus('DECLINED')}
                      className={cn(
                        "py-5 px-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all duration-300 border-2",
                        rsvpStatus === 'DECLINED' 
                          ? "border-rose-500 bg-rose-50/50 shadow-sm ring-4 ring-rose-500/10" 
                          : "border-border/50 bg-surface hover:bg-surface-muted hover:border-border"
                      )}
                    >
                      <XCircle className={cn("w-8 h-8", rsvpStatus === 'DECLINED' ? "text-rose-500" : "text-muted")} />
                      <span className={cn("text-sm font-semibold", rsvpStatus === 'DECLINED' ? "text-rose-700" : "text-foreground")}>
                        Non, je décline
                      </span>
                    </button>
                  </div>
                </div>

                {/* Meal Preferences Panel - Only show if attending */}
                {rsvpStatus === 'ACCEPTED' && (
                  <div className="p-5 border border-border rounded-[var(--radius-card)] bg-surface space-y-4 text-sm">
                    <div className="flex items-center gap-2 font-bold text-foreground border-b border-border pb-3">
                      <Utensils className="w-5 h-5 text-primary" />
                      <h4>Informations obligatoires</h4>
                    </div>

                    <div className="space-y-3">
                      {parseEventRsvpForm(guest.event.rsvpForm).map((field) => (
                        <div key={field.id} className="space-y-1.5">
                          {field.type !== 'checkbox' && (
                            <label className="block text-xs font-bold text-muted uppercase tracking-wider">
                              {field.label} <span className="text-rose-500">*</span>
                            </label>
                          )}
                          {field.helpText && (
                            <p className="text-[10px] text-muted">{field.helpText}</p>
                          )}
                          {renderRsvpFieldInput(field)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional notes */}
                <div>
                  <label className="block text-xs font-bold text-muted uppercase mb-1">
                    Remarques / Message à l'organisateur
                  </label>
                  <textarea
                    value={additionalNotes}
                    onChange={e => setAdditionalNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-[var(--radius-button)] text-sm text-foreground focus:outline-primary"
                    placeholder="Ex: Je serai accompagné(e) de..."
                    rows={2}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || rsvpLocked}
                  className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-[var(--radius-button)] transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Envoi de la réponse...
                    </>
                  ) : (
                    'Envoyer ma Réponse'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {template &&
        outsideRsvpElements.map((el: any) => (
          <div key={el.id} id="rsvp-section" className="w-full">
            {renderRsvpFormControls(el, 'outside')}
          </div>
        ))}

      </InvitationWrapper>

      {/* Event Location & Directions Card */}
      {guest && guest.event?.location && (
        <div className="w-full max-w-lg bg-surface rounded-[var(--radius-card)] border border-border shadow-[var(--shadow-soft)] p-5 space-y-4 text-center relative">
          <div className="flex flex-col items-center gap-2">
            <div className="bg-primary/10 text-primary p-2.5 rounded-[var(--radius-button)] border border-primary/15">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted">Lieu de réception</h3>
            <p className="text-sm text-foreground font-semibold max-w-md mx-auto leading-relaxed">
              {guest.event.location}
            </p>
          </div>

          {guest.placementAccessible ? (
            <>
              {/* Interactive Map Embed */}
              <div className="w-full overflow-hidden rounded-[var(--radius-card)] border border-border h-[250px] relative bg-surface-muted">
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={
                    guest.event.latitude && guest.event.longitude
                      ? `https://maps.google.com/maps?q=${guest.event.latitude},${guest.event.longitude}&z=16&output=embed`
                      : `https://maps.google.com/maps?q=${encodeURIComponent(guest.event.location)}&z=15&output=embed`
                  }
                  className="absolute inset-0"
                ></iframe>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <a 
                  href={
                    guest.event.latitude && guest.event.longitude
                      ? `https://www.google.com/maps/search/?api=1&query=${guest.event.latitude},${guest.event.longitude}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(guest.event.location)}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-surface hover:bg-surface-muted text-foreground font-semibold rounded-[var(--radius-button)] text-xs border border-border transition"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  Ouvrir dans Google Maps
                </a>
                {guest.event.latitude && guest.event.longitude && (
                  <a 
                    href={`https://www.waze.com/ul?ll=${guest.event.latitude},${guest.event.longitude}&navigate=yes`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-[var(--radius-button)] text-xs transition"
                  >
                    Naviguer avec Waze
                  </a>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted leading-relaxed max-w-sm mx-auto">
              L&apos;itinéraire (carte et GPS) s&apos;ouvre dans l&apos;onglet Itinéraire dès votre confirmation de présence.
              L&apos;adresse ci-dessus reste visible pour vous orienter.
            </p>
          )}
        </div>
      )}
    </GuestPortalShell>
  );
}
