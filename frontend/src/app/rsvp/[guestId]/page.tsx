'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { downloadMedia, getMediaExtension, sanitizeFilenamePart } from '@/lib/downloadMedia';
import GuestPortalShell, { GuestPortalTabBar, GuestPortalCard, GuestEventHero } from '@/components/GuestPortalShell';
import Link from 'next/link';
import GuestGuidelinesView from '@/components/GuestGuidelinesView';
import type { ChairType, RoomLayoutBlueprint, RoomOutlineShape } from '@/lib/roomLayoutUtils';
import type { LightingPreset } from '@/lib/roomRenderQuality';
import {
  MapPin, CheckCircle2,
  Loader2, Image, Send, Heart, LayoutGrid, MessageCircle, MessageSquare,
  ChevronLeft, ChevronRight, X, ThumbsUp, Download, Navigation,
  QrCode, Maximize2, Printer, UserCog, UserPen, Pencil,
  Ticket, Copy, Check, Users, Link2Off, HeartHandshake, RefreshCw, Repeat, CalendarHeart,
} from 'lucide-react';
import GuestDonationForm from '@/components/rsvp/GuestDonationForm';
import {
  type RsvpField,
  buildRsvpPreferencesPayload,
  ensureMandatoryRsvpFields,
  restoreFieldValuesFromPreferences,
} from '@/lib/rsvpFormFields';
import ShareButton from '@/components/ShareButton';
import { guestRsvpUrl } from '@/lib/share';
import { getGuestQrImageUrl } from '@/lib/guestQr';
import { cn } from '@/lib/cn';
import { Skeleton } from '@/components/ui/Skeleton';
import { collectInvitationFontFamilies, useInvitationFonts } from '@/lib/headStylesheet';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';
import type { GuestRsvpData } from '@/app/rsvp/guestRsvpTypes';

const GuestTablePlanView = dynamic(() => import('@/app/rsvp/GuestTablePlanView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-16" role="status" aria-busy="true">
      <Loader2 className="w-6 h-6 text-primary animate-spin" aria-hidden />
      <span className="sr-only">Chargement du plan de table…</span>
    </div>
  ),
});

const GuestPendingInvitationView = dynamic(() => import('@/app/rsvp/GuestPendingInvitationView'), {
  loading: () => (
    <div className="min-h-screen em-guest-page flex items-center justify-center p-6" role="status" aria-busy="true">
      <Loader2 className="w-6 h-6 text-primary animate-spin" aria-hidden />
      <span className="sr-only">Chargement de l’invitation…</span>
    </div>
  ),
});

const GuestVenueGuide = dynamic(() => import('@/components/GuestVenueGuide'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-16" role="status" aria-busy="true">
      <Loader2 className="w-6 h-6 text-primary animate-spin" aria-hidden />
      <span className="sr-only">Chargement de l’itinéraire…</span>
    </div>
  ),
});

export default function RsvpPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const guestId = params.guestId as string;
  const initialTabParam = searchParams?.get('tab');
  const { site } = usePlatformSite();

  const [guest, setGuest] = useState<GuestRsvpData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [rsvpStatus, setRsvpStatus] = useState<'ACCEPTED' | 'DECLINED'>('ACCEPTED');
  
  // Preferences form
  const [allergies, setAllergies] = useState('');
  const [specialMeal, setSpecialMeal] = useState('none');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Guest Dashboard states
  const [activeGuestTab, setActiveGuestTab] = useState<'badge' | 'table' | 'route' | 'donations' | 'guestbook' | 'feed'>(() => {
    if (initialTabParam === 'table' || initialTabParam === 'route' || initialTabParam === 'donations' || initialTabParam === 'guestbook' || initialTabParam === 'feed') {
      return initialTabParam;
    }
    return 'badge';
  });
  const [guestbookMessage, setGuestbookMessage] = useState('');
  const [guestbookPhoto, setGuestbookPhoto] = useState<string | null>(null);
  const [guestbookPhotos, setGuestbookPhotos] = useState<string[]>([]);
  const [isGuestbookUploading, setIsGuestbookUploading] = useState(false);
  const [submittingGuestbook, setSubmittingGuestbook] = useState(false);
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [guestCommentContents, setGuestCommentContents] = useState<Record<string, string>>({});
  const [guestCommentSubmitting, setGuestCommentSubmitting] = useState<Record<string, boolean>>({});
  const [expandedImages, setExpandedImages] = useState<string[]>([]);
  const [expandedImageIndex, setExpandedImageIndex] = useState<number>(0);
  const [expandedImagePrefix, setExpandedImagePrefix] = useState('media');
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);
  const lightboxPanelRef = useRef<HTMLDivElement>(null);
  const qrCloseRef = useRef<HTMLButtonElement>(null);
  const qrPanelRef = useRef<HTMLDivElement>(null);
  const [guestbookSuccess, setGuestbookSuccess] = useState(false);
  const [guestbookError, setGuestbookError] = useState('');
  const [feedActionError, setFeedActionError] = useState('');
  const [guestbookShares, setGuestbookShares] = useState<any[]>([]);
  const [loadingGuestbook, setLoadingGuestbook] = useState(false);
  const [rsvpLocked, setRsvpLocked] = useState(false);
  const [showFullScreenQr, setShowFullScreenQr] = useState(false);

  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestLastName, setGuestLastName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [targetEditGuestId, setTargetEditGuestId] = useState<string>(guestId);
  const [selectedQrGuestId, setSelectedQrGuestId] = useState<string>(guestId);
  const [copiedPassId, setCopiedPassId] = useState<string | null>(null);
  const [isEditIdentityOpen, setIsEditIdentityOpen] = useState(false);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [identitySaveSuccess, setIdentitySaveSuccess] = useState(false);
  const [identitySaveError, setIdentitySaveError] = useState('');
  const editModalCloseRef = useRef<HTMLButtonElement>(null);
  const editModalPanelRef = useRef<HTMLDivElement>(null);

  useDialogFocusTrap({
    open: isEditIdentityOpen,
    containerRef: editModalPanelRef,
    onClose: () => {
      if (!savingIdentity) setIsEditIdentityOpen(false);
    },
    initialFocusRef: editModalCloseRef,
  });

  const needsInvitationFonts = Boolean(guest) && !submitted;
  const invitationFontFamilies = useMemo(
    () =>
      collectInvitationFontFamilies(
        guest?.event?.invitations?.[0]?.template?.content?.elements as
          | Array<{ fontFamily?: string }>
          | undefined,
      ),
    [guest?.event?.invitations],
  );
  useInvitationFonts(invitationFontFamilies, needsInvitationFonts);

  const hasDonations = Boolean(guest?.donations?.enabled);

  const guestTabIds = useMemo(() => {
    return [
      'badge',
      'table',
      'route',
      ...(hasDonations ? ['donations' as const] : []),
      'guestbook',
      'feed',
    ] as const;
  }, [hasDonations]);

  const goGuestTab = useCallback((id: string) => {
    const raw = id.trim().toLowerCase();
    if (raw === 'badge' || raw === 'table' || raw === 'route' || raw === 'donations' || raw === 'guestbook' || raw === 'feed') {
      setActiveGuestTab(raw as typeof activeGuestTab);
    window.history.replaceState(
      null,
      '',
        `${window.location.pathname}${window.location.search}#${raw}`,
      );
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, []);

  useEffect(() => {
    const raw = window.location.hash.replace('#', '');
    if (raw === 'badge' || raw === 'table' || raw === 'route' || raw === 'donations' || raw === 'guestbook' || raw === 'feed') {
      setActiveGuestTab(raw as typeof activeGuestTab);
    }
  }, []);

  const loadRsvpDetails = useCallback(async () => {
      if (!guestId) return;
      try {
        const data = await api.get(`/rsvp/${guestId}`);
        setGuest(data);
      setGuestFirstName(data.firstName || '');
      setGuestLastName(data.lastName || '');
      setGuestPhone(data.phone || data.preferences?.phone || '');
        setRsvpLocked(Boolean(data.rsvpLocked));
      const isTicketOrPublic = Boolean(
        data.ticketOrderId || data.category === 'Billet' || data.event?.isPublic,
      );
      if ((data.rsvp && data.rsvp !== 'PENDING') || isTicketOrPublic) {
        setRsvpStatus(data.rsvp === 'DECLINED' ? 'DECLINED' : 'ACCEPTED');
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
        console.error('Error fetching réponse à l’invitation details:', err);
        setError('Le lien d\'invitation est invalide ou a expiré.');
      } finally {
        setLoading(false);
      }
  }, [guestId]);

  useEffect(() => {
    loadRsvpDetails();
  }, [loadRsvpDetails]);

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
    setGuestbookError('');
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
      setGuestbookError(
        'Impossible d’envoyer votre message pour le moment. Vérifiez votre connexion, puis réessayez.',
      );
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
    setFeedActionError('');
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
      setFeedActionError(
        'Impossible d’ajouter le commentaire. Vérifiez votre connexion, puis réessayez.',
      );
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

  const closeGuestImageModal = useCallback(() => {
    setExpandedImages([]);
  }, []);

  const closeFullScreenQr = useCallback(() => {
    setShowFullScreenQr(false);
  }, []);

  const lightboxOpen = expandedImages.length > 0;
  useDialogFocusTrap({
    open: lightboxOpen,
    containerRef: lightboxPanelRef,
    onClose: closeGuestImageModal,
    initialFocusRef: lightboxCloseRef,
  });
  useDialogFocusTrap({
    open: showFullScreenQr && !lightboxOpen,
    containerRef: qrPanelRef,
    onClose: closeFullScreenQr,
    initialFocusRef: qrCloseRef,
  });

  useEffect(() => {
    if (!lightboxOpen || expandedImages.length < 2) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setExpandedImageIndex((prev) => (prev - 1 + expandedImages.length) % expandedImages.length);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setExpandedImageIndex((prev) => (prev + 1) % expandedImages.length);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen, expandedImages.length]);

  const handleUpdateGuestInfo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const effectiveGuestId = targetEditGuestId || guestId;
    if (!effectiveGuestId) return;
    if (!guestFirstName.trim()) {
      setIdentitySaveError('Le prénom est requis.');
      return;
    }
    setSavingIdentity(true);
    setIdentitySaveError('');
    try {
      const templateContent = guest?.event?.invitations?.[0]?.template?.content;
      const elements = templateContent?.elements || [];
      const rsvpFields = ensureMandatoryRsvpFields(
        (elements || [])
          .filter((el: { type?: string }) => el.type === 'rsvp-block')
          .flatMap((el: { rsvpFields?: RsvpField[] }) => el.rsvpFields || []),
      );

      const preferencesPayload = buildRsvpPreferencesPayload({
        allergies,
        specialMeal,
        notes: additionalNotes,
        rsvpFields,
        fieldValues: customFieldValues,
        phone: guestPhone.trim() || undefined,
      });

      const res = await api.post(`/rsvp/${effectiveGuestId}`, {
        firstName: guestFirstName.trim(),
        lastName: guestLastName.trim(),
        phone: guestPhone.trim() || null,
        rsvp: rsvpStatus,
        preferences: preferencesPayload,
      });

      if (effectiveGuestId === guestId) {
        if (res?.guest) {
          setGuest((prev) => (prev ? { ...prev, ...res.guest } : prev));
          setGuestFirstName(res.guest.firstName || guestFirstName.trim());
          setGuestLastName(res.guest.lastName || guestLastName.trim());
          setGuestPhone(res.guest.phone || guestPhone.trim());
        } else {
          setGuest((prev) =>
            prev
              ? {
                  ...prev,
                  firstName: guestFirstName.trim(),
                  lastName: guestLastName.trim(),
                  phone: guestPhone.trim() || null,
                  preferences: preferencesPayload,
                }
              : null,
          );
        }
      }

      setIdentitySaveSuccess(true);
      await loadRsvpDetails();
      setTimeout(() => {
        setIdentitySaveSuccess(false);
        setIsEditIdentityOpen(false);
      }, 1000);
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour des coordonnées:', err);
      setIdentitySaveError(err?.message || 'Erreur lors de la mise à jour des coordonnées.');
    } finally {
      setSavingIdentity(false);
    }
  };

  const handleSubmitRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rsvpLocked) {
      setSubmitError('La date de l\'événement est passée. Vous ne pouvez plus modifier votre présence.');
      return;
    }
    setSubmitError('');
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
            setSubmitError(`Le champ « ${field.label} » est obligatoire. Complétez-le, puis renvoyez votre réponse.`);
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
        phone: guestPhone.trim() || undefined,
      });

      const res = await api.post(`/rsvp/${guestId}`, {
        rsvp: rsvpStatus,
        preferences,
        firstName: guestFirstName.trim() || undefined,
        lastName: guestLastName.trim() || undefined,
        phone: guestPhone.trim() || undefined,
      });

      if (res?.guest) {
        setGuest((prev) => (prev ? { ...prev, ...res.guest } : prev));
        setGuestFirstName(res.guest.firstName || guestFirstName.trim());
        setGuestLastName(res.guest.lastName || guestLastName.trim());
        setGuestPhone(res.guest.phone || guestPhone.trim());
      } else {
        setGuest((prev) =>
          prev
            ? {
                ...prev,
                firstName: guestFirstName.trim() || prev.firstName,
                lastName: guestLastName.trim() || prev.lastName,
                phone: guestPhone.trim() || prev.phone,
                rsvp: rsvpStatus,
                preferences,
              }
            : null,
        );
      }

      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message || 'Impossible d’envoyer la réponse. Vérifiez votre connexion, puis réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  const shareButton = guest ? (
    <ShareButton
      title={`${guest.event.title} · Invitation`}
      text={`Invitation ${site.platformName} pour ${guest.firstName}.`}
      url={guestRsvpUrl(guestId)}
      className="!rounded-full !shadow-none !text-foreground"
    />
  ) : null;

  const openIdentityEditor = () => {
    setIdentitySaveError('');
    setIdentitySaveSuccess(false);
    setIsEditIdentityOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen em-guest-page flex flex-col items-center p-4 pt-20" role="status" aria-busy="true">
        <span className="sr-only">Chargement de votre invitation…</span>
        <div className="w-full max-w-xl space-y-4">
          <div className="rounded-3xl bg-[#064e3b] p-5 space-y-4">
            <Skeleton className="h-6 w-28 rounded-full !bg-white/15" />
            <Skeleton className="h-8 w-3/4 rounded-lg !bg-white/15" />
            <Skeleton className="h-4 w-2/3 rounded-full !bg-white/10" />
            <Skeleton className="h-4 w-1/2 rounded-full !bg-white/10" />
          </div>
          <div className="flex flex-col items-center gap-4 py-6 bg-surface rounded-[1.125rem] border border-border">
            <Skeleton className="w-48 h-48 rounded-2xl" />
            <Skeleton className="h-3 w-32 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !guest) {
    return (
      <div className="min-h-screen em-guest-page flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-surface p-7 rounded-3xl border border-border text-center space-y-5" role="alert">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-muted">
            <Link2Off className="h-7 w-7" aria-hidden />
          </span>
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-semibold text-foreground">Ce lien ne s’ouvre pas</h1>
            <p className="text-sm text-muted leading-relaxed">
              {error ? 'Il est incomplet ou a expiré.' : 'Invitation introuvable.'} Demandez un nouveau lien à l’organisateur.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 min-h-12 rounded-2xl bg-primary-solid text-primary-foreground text-sm font-semibold hover:bg-primary-solid-hover transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <RefreshCw className="w-4 h-4" aria-hidden />
              Réessayer
            </button>
            <Link
              href="/guide/invite"
              className="inline-flex items-center justify-center min-h-11 rounded-2xl text-sm font-semibold text-primary hover:bg-primary/5 transition"
            >
              Besoin d’aide ?
            </Link>
          </div>
        </div>
      </div>
    );
  }

    if (submitted && rsvpStatus === 'DECLINED') {
      return (
        <GuestPortalShell
          title={guest.event.title}
          guestId={guestId}
          organizationName={guest.organizationName}
          headerRight={shareButton}
          contentClassName="space-y-4"
        >
          <GuestPortalCard className="text-center space-y-5 !py-8">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HeartHandshake className="h-7 w-7" aria-hidden />
            </span>
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-semibold text-foreground">
                C’est noté, {guest.firstName}
              </h2>
              <p className="text-sm text-muted max-w-xs mx-auto leading-relaxed">
                Vous nous manquerez à « {guest.event.title} ».
              </p>
            </div>
            {!rsvpLocked && (
              <button
                type="button"
                onClick={() => {
                  setRsvpStatus('ACCEPTED');
                  setSubmitted(false);
                }}
                className="inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-2xl border border-border bg-surface text-sm font-semibold text-foreground hover:bg-surface-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <Repeat className="w-4 h-4 text-primary" aria-hidden />
                Finalement, je viens
              </button>
            )}
          </GuestPortalCard>

          {/* Formulaire de don pour soutenir l'événement même en cas d'absence */}
          {hasDonations && guest.donations && (
            <GuestDonationForm
              guestId={guestId}
              guestName={`${guest.firstName} ${guest.lastName}`}
              guestEmail={guest.email}
              guestPhone={guest.phone}
              donations={guest.donations}
              onDonationSuccess={() => {
                loadRsvpDetails();
              }}
            />
          )}
        </GuestPortalShell>
      );
    }

    // Portail invité confirmé — layout plateforme (simple / moderne)
    if (submitted && rsvpStatus === 'ACCEPTED') {
      const guestTabs = [
        { id: 'badge', label: 'Mon pass', shortLabel: 'Pass', icon: <QrCode className="w-5 h-5" /> },
        { id: 'table', label: 'Ma table', shortLabel: 'Table', icon: <LayoutGrid className="w-5 h-5" /> },
        { id: 'route', label: 'Lieu', shortLabel: 'Lieu', icon: <Navigation className="w-5 h-5" /> },
        ...(hasDonations ? [{ id: 'donations', label: 'Faire un don', shortLabel: 'Don', icon: <Heart className="w-5 h-5" /> }] : []),
        { id: 'guestbook', label: "Livre d'or", shortLabel: 'Livre', icon: <MessageSquare className="w-5 h-5" /> },
        { id: 'feed', label: 'Actualités', shortLabel: 'Actu', icon: <MessageCircle className="w-5 h-5" /> },
      ];

      const tableName = guest.ticketPlacement?.tableName || guest.tableDetails?.tableName || null;
      const seatNumber =
        guest.ticketPlacement?.seatNumber ??
        (guest.tableDetails?.seatIndex != null ? guest.tableDetails.seatIndex + 1 : null);
      const neighborCount = guest.tableDetails?.neighbors?.length ?? 0;
      const passCode = guest.id.split('-')[0]?.toUpperCase();

      return (
        <>
        <GuestPortalShell
          title={guest.event.title}
          guestId={guestId}
          organizationName={guest.organizationName}
          inert={lightboxOpen || showFullScreenQr || isEditIdentityOpen}
          swipeTabIds={[...guestTabIds]}
          activeTabId={activeGuestTab}
          onTabChange={goGuestTab}
          headerRight={shareButton}
          tabs={
            <GuestPortalTabBar
              tabs={guestTabs}
              activeId={activeGuestTab}
              onChange={goGuestTab}
            />
          }
          contentClassName="space-y-5"
        >
            {/* 1. PASS & INFOS */}
            <div id="guest-panel-badge" role="tabpanel" aria-labelledby="guest-tab-badge" hidden={activeGuestTab !== 'badge'}>
            {activeGuestTab === 'badge' && (
              <div className="space-y-4 animate-fade-in">
                <GuestEventHero
                  greeting={`Mbote, ${guest.firstName}`}
                  title={guest.event.title}
                  date={guest.event.date}
                  location={guest.event.location}
                  badge={
                    <span className="em-guest-chip em-guest-chip--glass">
                      <Check className="w-3.5 h-3.5" aria-hidden />
                      Présence confirmée
                    </span>
                  }
                />

                {/* Pass QR : l'essentiel du jour J */}
                <GuestPortalCard className="flex flex-col items-center gap-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedQrGuestId(guest.id);
                      setShowFullScreenQr(true);
                    }}
                    className="p-3 bg-white rounded-2xl border border-border hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    aria-label="Agrandir mon pass QR"
                  >
                    <img
                      src={getGuestQrImageUrl(guest.id, 280)}
                      alt={`Pass QR de ${guest.firstName} ${guest.lastName}`}
                      className="w-48 h-48 sm:w-56 sm:h-56"
                    />
                  </button>
                  <div className="space-y-0.5">
                    <p className="font-display text-lg font-semibold text-foreground">
                      {guest.firstName} {guest.lastName}
                    </p>
                    <p className="text-sm text-muted">
                      À montrer à l&apos;accueil
                      {passCode ? <span className="font-mono tracking-wider"> · {passCode}</span> : null}
                    </p>
                  </div>
                  <div className="grid w-full grid-cols-3 gap-2">
                    {[
                      {
                        key: 'zoom',
                        label: 'Agrandir',
                        icon: <Maximize2 className="w-5 h-5" aria-hidden />,
                        onClick: () => {
                          setSelectedQrGuestId(guest.id);
                          setShowFullScreenQr(true);
                        },
                      },
                      {
                        key: 'infos',
                        label: 'Mes infos',
                        icon: <UserPen className="w-5 h-5" aria-hidden />,
                        onClick: openIdentityEditor,
                      },
                    ].map((action) => (
                      <button
                        key={action.key}
                        type="button"
                        onClick={action.onClick}
                        className="flex flex-col items-center justify-center gap-1.5 min-h-[4.25rem] rounded-2xl bg-surface-muted text-xs font-semibold text-foreground hover:bg-primary/10 active:scale-[0.97] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      >
                        <span className="text-primary">{action.icon}</span>
                        {action.label}
                      </button>
                    ))}
                    <Link
                      href={`/rsvp/${guestId}/print`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center gap-1.5 min-h-[4.25rem] rounded-2xl bg-surface-muted text-xs font-semibold text-foreground hover:bg-primary/10 active:scale-[0.97] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    >
                      <Printer className="w-5 h-5 text-primary" aria-hidden />
                      Imprimer
                    </Link>
                  </div>
                </GuestPortalCard>

                {/* Billet transmis sans nom : inviter à le personnaliser */}
                {guest.firstName?.toLowerCase().startsWith('invité') && (
                  <button
                    type="button"
                    onClick={openIdentityEditor}
                    className="w-full flex items-center gap-3 rounded-[1.125rem] border border-primary/25 bg-primary/5 p-3.5 text-left hover:bg-primary/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <span className="em-guest-icon"><Pencil className="w-[18px] h-[18px]" aria-hidden /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-foreground">Ce billet vous a été transmis ?</span>
                      <span className="block text-xs text-muted">Mettez-y votre nom.</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted shrink-0" aria-hidden />
                  </button>
                )}

                {/* Place assignée */}
                {(guest.ticketPlacement?.isAssigned || tableName) && (
                  <GuestPortalCard padding="sm" className="space-y-3.5">
                    <div className="flex items-center gap-3">
                      <span className="em-guest-icon"><LayoutGrid className="w-5 h-5" aria-hidden /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted">
                          Votre table{guest.ticketPlacement?.zoneName ? ` · ${guest.ticketPlacement.zoneName}` : ''}
                        </p>
                        <p className="font-display text-xl font-semibold text-foreground truncate">
                          {tableName || 'Table assignée'}
                        </p>
                      </div>
                      {seatNumber != null && (
                        <div className="rounded-2xl bg-primary/10 px-3.5 py-2 text-center shrink-0">
                          <p className="text-[11px] font-semibold text-primary">Siège</p>
                          <p className="font-display text-xl font-semibold text-foreground tabular-nums leading-none">{seatNumber}</p>
                        </div>
                      )}
                    </div>
                    {neighborCount > 0 && (
                      <p className="text-xs text-muted flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-primary" aria-hidden />
                        {neighborCount} convive{neighborCount > 1 ? 's' : ''} à votre table
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => goGuestTab('table')}
                        className="flex-1 inline-flex items-center justify-center gap-2 min-h-11 px-3.5 rounded-2xl bg-primary-solid text-primary-foreground text-sm font-semibold hover:bg-primary-solid-hover transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      >
                        Voir sur le plan
                      </button>
                      {guest.seatingInvitationPdfUrl && (
                        <a
                          href={guest.seatingInvitationPdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-2xl border border-border bg-surface text-sm font-semibold text-foreground hover:bg-surface-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                        >
                          <Download className="w-4 h-4" aria-hidden />
                          PDF
                        </a>
                      )}
                    </div>
                  </GuestPortalCard>
                )}

                {/* Billet sans placement encore attribué */}
                {guest.ticketPlacement?.hasTicket && !guest.ticketPlacement?.isAssigned && !tableName && (
                  <div className="flex items-center gap-3 rounded-[1.125rem] border border-border bg-surface p-3.5">
                    <span className="em-guest-icon"><Ticket className="w-5 h-5" aria-hidden /></span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        Billet confirmé{guest.ticketPlacement?.zoneName ? ` · ${guest.ticketPlacement.zoneName}` : ''}
                      </p>
                      <p className="text-xs text-muted">Votre place vous sera indiquée à l&apos;accueil.</p>
                    </div>
                  </div>
                )}

                {/* Plusieurs billets dans la même commande */}
                {guest.orderPasses && guest.orderPasses.passes.length > 1 && (
                  <section className="space-y-2.5">
                    <div className="flex items-baseline justify-between px-1">
                      <h3 className="font-display text-base font-semibold text-foreground">Vos billets</h3>
                      <span className="text-xs font-semibold text-muted">{guest.orderPasses.totalCount} places</span>
                    </div>
                    <div className="em-guest-list">
                      {guest.orderPasses.passes.map((pass) => {
                        const isCurrent = pass.guestId === guestId;
                        const passDisplayName = `${pass.firstName} ${pass.lastName}`.trim() || `Invité ${pass.ticketNumber}`;
                        const seatLabel = [
                          pass.tableName,
                          pass.seatNumber != null ? `siège ${pass.seatNumber}` : null,
                        ].filter(Boolean).join(' · ');
                        const iconBtn =
                          'inline-flex items-center justify-center h-11 w-11 shrink-0 rounded-full border border-border bg-surface text-muted hover:text-foreground hover:bg-surface-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 touch-manipulation';

                        return (
                          <div key={pass.guestId} className={cn('p-3 space-y-2.5', isCurrent && 'bg-primary/[0.04]')}>
                            <div className="flex items-center gap-3">
                              <span className="em-guest-icon font-display text-sm font-semibold">{pass.ticketNumber}</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground truncate">{passDisplayName}</p>
                                <p className="text-xs text-muted truncate">
                                  {isCurrent ? 'Pass affiché' : 'Accompagnateur'}
                                  {seatLabel ? ` · ${seatLabel}` : ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {!isCurrent ? (
                                <Link
                                  href={`/rsvp/${pass.guestId}`}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-11 px-3 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/15 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 touch-manipulation"
                                >
                                  <QrCode className="w-4 h-4" aria-hidden />
                                  Afficher ce pass
                                </Link>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedQrGuestId(pass.guestId);
                                    setShowFullScreenQr(true);
                                  }}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-11 px-3 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/15 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 touch-manipulation"
                                >
                                  <Maximize2 className="w-4 h-4" aria-hidden />
                                  Plein écran
                                </button>
                              )}
                              <a
                                href={`https://wa.me/?text=${encodeURIComponent(
                                  `Bonjour ! Voici ton pass d'accès personnel pour « ${guest.event.title} » (Table : ${pass.tableName || 'à l’accueil'}, Siège : ${pass.seatNumber ? `n°${pass.seatNumber}` : '—'}) :\n${pass.rsvpUrl}`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Envoyer par WhatsApp"
                                aria-label={`Envoyer le pass de ${pass.firstName} par WhatsApp`}
                                className={cn(iconBtn, '!text-primary')}
                              >
                                <MessageCircle className="w-4 h-4" aria-hidden />
                              </a>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(pass.rsvpUrl);
                                    setCopiedPassId(pass.guestId);
                                    setTimeout(() => setCopiedPassId(null), 2500);
                                  } catch {}
                                }}
                                title="Copier le lien du pass"
                                aria-label={`Copier le lien du pass de ${pass.firstName}`}
                                className={iconBtn}
                              >
                                {copiedPassId === pass.guestId ? (
                                  <Check className="w-4 h-4 text-primary" aria-hidden />
                                ) : (
                                  <Copy className="w-4 h-4" aria-hidden />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetEditGuestId(pass.guestId);
                                  setGuestFirstName(pass.firstName);
                                  setGuestLastName(pass.lastName);
                                  setGuestPhone(pass.phone || '');
                                  openIdentityEditor();
                                }}
                                title="Changer le nom sur ce billet"
                                aria-label={`Changer le nom sur le billet de ${pass.firstName} ${pass.lastName}`}
                                className={iconBtn}
                              >
                                <Pencil className="w-4 h-4" aria-hidden />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Campagne solidaire */}
                {hasDonations && guest.donations && (
                  <button
                    type="button"
                    onClick={() => goGuestTab('donations')}
                    className="w-full rounded-[1.125rem] border border-rose-500/20 bg-rose-500/[0.06] p-4 text-left space-y-3 hover:bg-rose-500/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
                  >
                    <span className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-300">
                        <Heart className="w-5 h-5" aria-hidden />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-foreground truncate">
                          {guest.donations.cause || 'Soutenir cet événement'}
                        </span>
                        <span className="block text-xs text-muted">Mobile Money ou carte</span>
                      </span>
                      <span className="text-sm font-semibold text-rose-700 dark:text-rose-300 shrink-0">Donner</span>
                    </span>
                    {guest.donations.progressPercent != null && (
                      <span className="block space-y-1">
                        <span className="block h-2 rounded-full bg-rose-500/15 overflow-hidden">
                          <span
                            className="block h-2 rounded-full bg-rose-500"
                            style={{ width: `${Math.min(100, Math.max(0, guest.donations.progressPercent))}%` }}
                          />
                        </span>
                        <span className="block text-xs text-muted tabular-nums">{guest.donations.progressPercent}% collectés</span>
                      </span>
                    )}
                  </button>
                )}

                {guest.event.description?.trim() ? (
                  <GuestPortalCard padding="sm" className="space-y-1.5">
                    <h3 className="font-display text-base font-semibold text-foreground">Le mot de l&apos;organisateur</h3>
                    <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{guest.event.description}</p>
                  </GuestPortalCard>
                ) : null}

                <GuestGuidelinesView guidelines={guest.event.guestGuidelines} />

                {/* Raccourcis, façon réglages d'app */}
                <nav aria-label="Raccourcis" className="em-guest-list">
                  {guest.event.location ? (
                    <button type="button" onClick={() => goGuestTab('route')} className="em-guest-list-row">
                      <span className="em-guest-icon"><Navigation className="w-[18px] h-[18px]" aria-hidden /></span>
                      <span className="flex-1 text-sm font-semibold">Itinéraire jusqu&apos;au lieu</span>
                      <ChevronRight className="w-4 h-4 text-muted" aria-hidden />
                    </button>
                  ) : null}
                  {!rsvpLocked && (
                    <button type="button" onClick={openIdentityEditor} className="em-guest-list-row">
                      <span className="em-guest-icon"><UserCog className="w-[18px] h-[18px]" aria-hidden /></span>
                      <span className="flex-1 text-sm font-semibold">Mes infos et préférences</span>
                      <ChevronRight className="w-4 h-4 text-muted" aria-hidden />
                    </button>
                  )}
                  {!rsvpLocked && (
                    <button type="button" onClick={() => setSubmitted(false)} className="em-guest-list-row">
                      <span className="em-guest-icon"><Repeat className="w-[18px] h-[18px]" aria-hidden /></span>
                      <span className="flex-1 text-sm font-semibold">Changer ma réponse</span>
                      <ChevronRight className="w-4 h-4 text-muted" aria-hidden />
                    </button>
                  )}
                  <Link href={`/rsvp/${guestId}/home`} className="em-guest-list-row">
                    <span className="em-guest-icon"><CalendarHeart className="w-[18px] h-[18px]" aria-hidden /></span>
                    <span className="flex-1 text-sm font-semibold">Toutes mes invitations</span>
                    <ChevronRight className="w-4 h-4 text-muted" aria-hidden />
                  </Link>
                </nav>
              </div>
            )}
            </div>

            <div id="guest-panel-route" role="tabpanel" aria-labelledby="guest-tab-route" hidden={activeGuestTab !== 'route'}>
            {activeGuestTab === 'route' && (
              <div>
              {guest.event.location ? (
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
            )}
              </div>
            )}
            </div>

            {/* 2. MA TABLE TAB */}
            <div id="guest-panel-table" role="tabpanel" aria-labelledby="guest-tab-table" hidden={activeGuestTab !== 'table'}>
            {activeGuestTab === 'table' && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="px-1 font-display text-xl font-semibold text-foreground">Ma table</h2>
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
                    pricingZones={guest.pricingZones ?? null}
                    guestFirstName={guest.firstName}
                    guestLastName={guest.lastName}
                    ticketPlacement={guest.ticketPlacement ?? null}
                    immersive
                  />
              </div>
            )}
            </div>

            {/* 3. DONS SOLIDAIRES TAB */}
            {hasDonations && guest.donations && (
              <div id="guest-panel-donations" role="tabpanel" aria-labelledby="guest-tab-donations" hidden={activeGuestTab !== 'donations'}>
                {activeGuestTab === 'donations' && (
                  <div className="space-y-4 animate-fade-in">
                    <GuestDonationForm
                      guestId={guestId}
                      guestName={`${guest.firstName} ${guest.lastName}`}
                      guestEmail={guest.email}
                      guestPhone={guest.phone}
                      donations={guest.donations}
                      onDonationSuccess={() => {
                        loadRsvpDetails();
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* 4. LIVRE D'OR TAB */}
            <div id="guest-panel-guestbook" role="tabpanel" aria-labelledby="guest-tab-guestbook" hidden={activeGuestTab !== 'guestbook'}>
            {activeGuestTab === 'guestbook' && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-0.5 px-1">
                  <h2 className="font-display text-xl font-semibold text-foreground">Livre d&apos;or</h2>
                  <p className="text-muted text-sm">Un mot ou des photos pour l&apos;organisateur.</p>
                </div>

                {guestbookSuccess && (
                  <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-3 rounded-[var(--radius-card)] text-xs font-semibold flex items-center gap-2" role="status">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Votre message a été ajouté au livre d&apos;or.
                  </div>
                )}

                {guestbookError && (
                  <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-[var(--radius-card)] text-xs font-semibold" role="alert">
                    {guestbookError}
                  </div>
                )}

                <form onSubmit={handleSubmitGuestbook} className="space-y-3 rounded-[1.125rem] border border-border bg-surface p-4">
                  <div className="space-y-1.5">
                    <label htmlFor="guestbook-message" className="sr-only">
                      Votre message
                    </label>
                    <textarea
                      id="guestbook-message"
                      value={guestbookMessage}
                      onChange={(e) => setGuestbookMessage(e.target.value)}
                      placeholder="Ex. : Merci pour cette belle invitation…"
                      rows={4}
                      className="w-full min-h-[6.5rem] px-4 py-3 bg-surface-muted border border-transparent rounded-xl text-base sm:text-sm focus:outline-none focus:border-primary focus:bg-surface transition-colors resize-none text-foreground placeholder:text-muted"
                    />
                  </div>

                  {/* Previews of uploaded guestbook photos */}
                  {guestbookPhotos.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-muted block">
                        {guestbookPhotos.length} photo{guestbookPhotos.length > 1 ? 's' : ''}
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {guestbookPhotos.map((photo, idx) => (
                          <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-surface-muted flex items-center justify-center">
                            <img
                              src={photo}
                              alt={`Aperçu photo ${idx + 1} du livre d'or`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveGuestbookPhoto(idx)}
                              className="absolute top-1 right-1 p-1.5 min-h-11 min-w-11 inline-flex items-center justify-center bg-danger hover:bg-danger/90 text-primary-foreground rounded-full transition shadow-sm"
                              aria-label={`Retirer la photo ${idx + 1}`}
                            >
                              <X className="w-3 h-3" aria-hidden />
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

                  <div className="flex items-center justify-between gap-3">
                    <label className="inline-flex items-center justify-center gap-1.5 min-h-11 px-4 py-2 bg-surface-muted hover:bg-primary/10 text-foreground font-semibold rounded-full text-sm cursor-pointer transition touch-manipulation focus-within:ring-2 focus-within:ring-primary/40">
                      <Image className="w-4 h-4 text-primary" aria-hidden />
                      Photos
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
                      className="inline-flex items-center justify-center gap-1.5 min-h-11 px-5 py-2.5 bg-primary-solid hover:bg-primary-solid-hover disabled:opacity-50 text-primary-foreground font-semibold rounded-full text-sm transition touch-manipulation"
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
                <div className="pt-2 space-y-3">
                  <h3 className="px-1 font-display text-base font-semibold text-foreground">
                    Messages{guestbookShares.length ? ` · ${guestbookShares.length}` : ''}
                  </h3>

                  {loadingGuestbook && guestbookShares.length === 0 ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                      <p className="text-xs text-muted">Chargement des messages…</p>
                    </div>
                  ) : guestbookShares.length === 0 ? (
                    <div className="text-center py-8 rounded-[1.125rem] border border-dashed border-border px-4 space-y-1">
                      <p className="text-sm font-semibold text-foreground">Pas encore de message</p>
                      <p className="text-muted text-sm">Soyez le premier à écrire.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {guestbookShares.map((share) => {
                        const photosList = share.photos && Array.isArray(share.photos) 
                          ? share.photos 
                          : (share.photo ? [share.photo] : []);
                        const guestSlug = sanitizeFilenamePart(
                          share.guest ? `${share.guest.firstName}-${share.guest.lastName}` : 'invite'
                        );

                        return (
                          <div key={share.id} className="bg-surface border border-border rounded-[1.125rem] p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-foreground text-sm truncate">
                                {share.guest ? `${share.guest.firstName} ${share.guest.lastName}` : 'Invité'}
                              </span>
                              <span className="text-xs text-muted shrink-0">
                                {new Date(share.createdAt).toLocaleDateString('fr-FR', {
                                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                            </div>

                            {share.message && (
                              <p className="text-foreground/85 text-sm leading-relaxed whitespace-pre-line">
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
                                      alt={`Photo ${pIdx + 1} du livre d'or`}
                                      onClick={() => openGuestImageModal(photosList, pIdx, `livre-dor-${guestSlug}`)}
                                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                                      loading="lazy"
                                      decoding="async"
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => handleDownloadMedia(
                                        e,
                                        photo,
                                        `livre-dor-${guestSlug}-${pIdx + 1}${getMediaExtension(photo, 'IMAGE')}`
                                      )}
                                      className="absolute top-1.5 right-1.5 min-h-11 min-w-11 inline-flex items-center justify-center bg-black/60 hover:bg-black text-white rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10 touch-manipulation"
                                      title="Télécharger"
                                      aria-label={`Télécharger la photo ${pIdx + 1} du livre d'or`}
                                    >
                                      <Download className="w-3 h-3" aria-hidden />
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
            </div>

            {/* 4. FIL DE L'ÉVÉNEMENT TAB */}
            <div id="guest-panel-feed" role="tabpanel" aria-labelledby="guest-tab-feed" hidden={activeGuestTab !== 'feed'}>
            {activeGuestTab === 'feed' && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-0.5 px-1">
                  <h2 className="font-display text-xl font-semibold text-foreground">Actualités</h2>
                  <p className="text-muted text-sm">Les annonces de l&apos;organisateur.</p>
                </div>

                {feedActionError && (
                  <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-[var(--radius-card)] text-xs font-semibold" role="alert">
                    {feedActionError}
                  </div>
                )}

                {loadingFeed ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-xs font-medium text-muted">Chargement des actualités…</p>
                  </div>
                ) : feedPosts.length === 0 ? (
                  <div className="text-center py-16 space-y-3 max-w-xs mx-auto">
                    <span className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary">
                      <MessageCircle className="w-7 h-7" aria-hidden />
                    </span>
                    <h3 className="font-display font-semibold text-foreground text-base">Rien pour l’instant</h3>
                    <p className="text-muted text-sm">Les annonces arriveront ici.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {feedPosts.map(post => {
                      const mediaList = post.mediaUrls && Array.isArray(post.mediaUrls) 
                        ? post.mediaUrls 
                        : (post.mediaUrl ? [{ url: post.mediaUrl, type: post.mediaType || 'IMAGE' }] : []);

                      return (
                        <div key={post.id} className="bg-surface border border-border rounded-[1.125rem] p-4 space-y-3.5">
                          {/* Post Header */}
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-display font-semibold text-primary text-sm">
                              {(guest.organizationName || 'O').slice(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-semibold text-foreground text-sm block leading-tight">{guest.organizationName || 'Organisateur'}</span>
                              <span className="text-xs text-muted">
                                {new Date(post.createdAt).toLocaleDateString('fr-FR', {
                                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Post Content */}
                          {post.content && (
                            <p className="text-foreground text-sm leading-relaxed whitespace-pre-line">
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
                                      alt={`Photo ${idx + 1} du fil d'actualité`}
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
                                      loading="lazy"
                                      decoding="async"
                                    />
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => handleDownloadMedia(
                                      e,
                                      media.url,
                                      `feed-${sanitizeFilenamePart(post.id)}-${idx + 1}${getMediaExtension(media.url, media.type)}`
                                    )}
                                    className="absolute top-2 right-2 min-h-11 min-w-11 inline-flex items-center justify-center bg-black/60 hover:bg-black text-white rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10 touch-manipulation"
                                    title="Télécharger"
                                    aria-label={`Télécharger le média ${idx + 1}`}
                                  >
                                    <Download className="w-3 h-3" aria-hidden />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Like Bar */}
                          <div className="flex items-center gap-4 pt-1">
                            <button
                              type="button"
                              onClick={() => handleToggleLike(post.id)}
                              aria-pressed={Boolean(post.likes && Array.isArray(post.likes) && post.likes.includes(`guest_${guest?.id}`))}
                              className={`inline-flex items-center gap-1.5 text-xs font-semibold transition min-h-11 px-3 py-1.5 rounded-full ${
 post.likes && Array.isArray(post.likes) && post.likes.includes(`guest_${guest?.id}`)
 ? 'text-primary bg-primary/10'
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
                          <div className="border-t border-border pt-3 space-y-3">
                            {post.comments.length > 0 && (
                              <p className="text-xs font-semibold text-muted">
                                {post.comments.length} commentaire{post.comments.length > 1 ? 's' : ''}
                              </p>
                            )}

                            {post.comments.length > 0 && (
                              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                                {post.comments.map((comment: any) => (
                                  <div key={comment.id} className="bg-surface-muted p-3 rounded-2xl text-sm space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-primary">{comment.authorName}</span>
                                      <span className="text-xs text-muted font-medium">
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
                            <div className="flex gap-2 items-stretch">
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <label htmlFor={`feed-comment-${post.id}`} className="sr-only">
                                  Commentaire sur cette publication
                                </label>
                              <input
                                  id={`feed-comment-${post.id}`}
                                type="text"
                                  placeholder="Écrire un commentaire…"
                                value={guestCommentContents[post.id] || ''}
                                onChange={(e) => setGuestCommentContents({ ...guestCommentContents, [post.id]: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCreateGuestComment(post.id);
                                }}
                                  className="w-full min-h-11 px-4 py-2.5 bg-surface-muted border border-transparent rounded-full text-base sm:text-sm focus:outline-none focus:border-primary focus:bg-surface transition-colors text-foreground placeholder:text-muted"
                              />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCreateGuestComment(post.id)}
                                disabled={guestCommentSubmitting[post.id] || !guestCommentContents[post.id]?.trim()}
                                className="h-11 w-11 shrink-0 inline-flex items-center justify-center bg-primary-solid hover:bg-primary-solid-hover disabled:opacity-50 text-primary-foreground rounded-full transition"
                                aria-label="Publier le commentaire"
                              >
                                {guestCommentSubmitting[post.id] ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Send className="w-4 h-4" />
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
            </div>

        </GuestPortalShell>

        {/* Expanded Image Modal with Carousel */}
        {expandedImages.length > 0 && (
          <div 
            ref={lightboxPanelRef}
            className="fixed inset-0 bg-black/95 backdrop-blur-xs flex items-center justify-center z-50 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            aria-label={
              expandedImagePrefix.startsWith('livre')
                ? `Visionneuse du livre d'or, photo ${expandedImageIndex + 1} sur ${expandedImages.length}`
                : `Visionneuse, média ${expandedImageIndex + 1} sur ${expandedImages.length}`
            }
            onClick={closeGuestImageModal}
          >
            <div
              className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-[var(--radius-card)] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={expandedImages[expandedImageIndex]} 
                alt={
                  expandedImagePrefix.startsWith('livre')
                    ? `Photo du livre d'or ${expandedImageIndex + 1} sur ${expandedImages.length}`
                    : `Média ${expandedImageIndex + 1} sur ${expandedImages.length}`
                }
                className="max-h-[85vh] max-w-full object-contain" 
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
                className="absolute top-4 left-4 p-2.5 min-h-11 min-w-11 inline-flex items-center justify-center bg-black/60 hover:bg-black text-white rounded-full transition z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                aria-label="Télécharger l'image"
                title="Télécharger"
              >
                <Download className="w-5 h-5" aria-hidden />
              </button>

              <button
                ref={lightboxCloseRef}
                type="button"
                onClick={closeGuestImageModal}
                className="absolute top-4 right-4 p-2.5 min-h-11 min-w-11 inline-flex items-center justify-center bg-black/60 hover:bg-black text-white rounded-full transition z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                aria-label="Fermer la visionneuse"
              >
                <X className="w-5 h-5" aria-hidden />
              </button>

              {expandedImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedImageIndex((prev) => (prev - 1 + expandedImages.length) % expandedImages.length);
                    }}
                    className="absolute left-4 p-3 min-h-11 min-w-11 inline-flex items-center justify-center bg-black/50 hover:bg-black text-white rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    aria-label="Photo précédente"
                  >
                    <ChevronLeft className="w-6 h-6" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedImageIndex((prev) => (prev + 1) % expandedImages.length);
                    }}
                    className="absolute right-4 p-3 min-h-11 min-w-11 inline-flex items-center justify-center bg-black/50 hover:bg-black text-white rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    aria-label="Photo suivante"
                  >
                    <ChevronRight className="w-6 h-6" aria-hidden />
                  </button>
                  <div
                    className="absolute bottom-4 bg-black/60 px-3 py-1 rounded-full text-white text-xs font-semibold"
                    aria-live="polite"
                  >
                    {expandedImageIndex + 1} / {expandedImages.length}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Pass QR toujours à portée de pouce (sauf sur le pass lui-même et le plan de table) */}
        {activeGuestTab !== 'table' && activeGuestTab !== 'badge' && (
          <button
            type="button"
            onClick={() => {
              setSelectedQrGuestId(guest.id);
              setShowFullScreenQr(true);
            }}
            className="fixed z-30 right-[max(1rem,env(safe-area-inset-right))] bottom-[calc(5.25rem+env(safe-area-inset-bottom))] inline-flex items-center gap-2 h-12 pl-3.5 pr-4 rounded-full bg-primary-solid text-primary-foreground text-sm font-semibold shadow-[0_10px_24px_-6px_rgba(4,120,87,0.55)] hover:bg-primary-solid-hover active:scale-95 transition animate-fade-in touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Ouvrir mon pass QR"
          >
            <QrCode className="w-5 h-5" aria-hidden />
            Mon pass
          </button>
        )}

        {/* Modal QR Code Plein Écran & Contraste Élevé pour le scan d'accueil */}
        {showFullScreenQr && (() => {
          const activeQrPass = (guest.orderPasses?.passes || []).find((p) => p.guestId === selectedQrGuestId) || {
            guestId: guest.id,
            ticketNumber: 1,
            firstName: guest.firstName,
            lastName: guest.lastName,
            tableName: guest.ticketPlacement?.tableName || guest.tableDetails?.tableName,
            seatNumber: guest.ticketPlacement?.seatNumber ?? ((guest.tableDetails?.seatIndex ?? 0) + 1),
            zoneName: guest.ticketPlacement?.zoneName,
          };

          return (
            <div
              ref={qrPanelRef}
              className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] animate-fade-in"
              role="dialog"
              aria-modal="true"
              tabIndex={-1}
              aria-labelledby="guest-pass-qr-title"
              onClick={closeFullScreenQr}
          >
            <button
                ref={qrCloseRef}
              type="button"
                onClick={closeFullScreenQr}
                className="absolute top-5 right-5 p-2.5 min-h-11 min-w-11 inline-flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                aria-label="Fermer le pass QR"
              >
                <X className="w-6 h-6" aria-hidden />
            </button>

            <div
                className="bg-surface rounded-3xl p-5 sm:p-7 text-center max-w-sm w-full shadow-2xl space-y-4 animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
                {/* Sélecteur de billets si commande multiple */}
                {guest.orderPasses && guest.orderPasses.passes.length > 1 && (
                  <div className="flex items-center justify-center gap-1 p-1 rounded-full bg-surface-muted" role="tablist" aria-label="Choisir le pass à scanner">
                    {guest.orderPasses.passes.map((p) => {
                      const isSel = p.guestId === activeQrPass.guestId;
                      return (
                        <button
                          key={p.guestId}
                          type="button"
                          role="tab"
                          aria-selected={isSel}
                          onClick={() => setSelectedQrGuestId(p.guestId)}
                          className={cn(
                            'flex-1 min-h-10 px-2 py-1.5 rounded-full text-xs font-semibold transition touch-manipulation truncate',
                            isSel
                              ? 'bg-primary text-primary-foreground shadow-xs'
                              : 'text-muted hover:text-foreground hover:bg-surface'
                          )}
                        >
                          {p.firstName || `Pass ${p.ticketNumber}`}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-0.5">
                  <h3 id="guest-pass-qr-title" className="font-display text-xl font-semibold text-foreground">
                    {activeQrPass.firstName} {activeQrPass.lastName}
                </h3>
                  {guest.orderPasses && guest.orderPasses.passes.length > 1 && (
                    <p className="text-xs font-semibold text-primary">
                      Billet {activeQrPass.ticketNumber} sur {guest.orderPasses.totalCount}
                    </p>
                  )}
              </div>

                {(activeQrPass.tableName || activeQrPass.zoneName) && (
                  <div className="py-2.5 px-4 rounded-2xl bg-primary/10 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-primary">Votre place</p>
                      {activeQrPass.zoneName && (
                        <span className="text-xs font-semibold text-primary">
                          Zone {activeQrPass.zoneName}
                        </span>
                      )}
                    </div>
                    <p className="text-base font-semibold text-foreground">
                      {activeQrPass.tableName || 'Table assignée'}
                      {activeQrPass.seatNumber != null ? ` • Siège n° ${activeQrPass.seatNumber}` : ''}
                  </p>
                </div>
              )}

                {/* Fond blanc volontaire : contraste maximal pour le scan d'accueil */}
                <div className="p-3 bg-white border border-border rounded-2xl inline-block">
                  <img
                    src={getGuestQrImageUrl(activeQrPass.guestId, 320)}
                    alt={`Pass QR de ${activeQrPass.firstName} ${activeQrPass.lastName}`}
                    className="w-52 h-52 sm:w-60 sm:h-60 object-contain"
                />
              </div>

                <p className="text-xs text-muted leading-snug">
                À montrer à l&apos;accueil. Montez la luminosité si besoin.
              </p>

              <button
                type="button"
                  onClick={closeFullScreenQr}
                  className="w-full min-h-12 py-2.5 rounded-2xl bg-primary-solid text-primary-foreground text-sm font-semibold hover:bg-primary-solid-hover transition"
              >
                Fermer
              </button>
            </div>
          </div>
          );
        })()}

        {/* Modal Modification des coordonnées de l'invité */}
        {isEditIdentityOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-[rgba(11,21,18,0.5)] animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-identity-title"
          >
            <div
              ref={editModalPanelRef}
              className="bg-surface rounded-t-3xl sm:rounded-3xl w-full max-w-lg px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6 shadow-2xl space-y-4 max-h-[92dvh] overflow-y-auto animate-slide-up sm:animate-scale-up"
            >
              <span aria-hidden className="mx-auto block h-1.5 w-10 rounded-full bg-border sm:hidden" />
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
        <div>
                    <h3 id="edit-identity-title" className="font-display text-xl font-semibold text-foreground">
                      {targetEditGuestId !== guestId ? 'Nom sur ce billet' : 'Mes infos'}
                    </h3>
                    <p className="text-xs text-muted">
                      {targetEditGuestId !== guestId
                        ? 'La personne qui utilisera ce pass.'
                        : 'Ce nom figure sur votre pass.'}
          </p>
        </div>
      </div>
          <button
                  ref={editModalCloseRef}
            type="button"
                  disabled={savingIdentity}
                  onClick={() => setIsEditIdentityOpen(false)}
                  className="h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-full bg-surface-muted text-foreground hover:bg-border transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
          </button>
        </div>

              {identitySaveError && (
                <div className="p-3 rounded-xl bg-danger/10 border border-danger/25 text-danger text-xs font-semibold" role="alert">
                  {identitySaveError}
              </div>
              )}

              {identitySaveSuccess && (
                <div className="p-3 rounded-xl bg-primary/10 text-primary text-sm font-semibold flex items-center gap-2" role="status">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  C’est enregistré.
          </div>
        )}

              <form onSubmit={handleUpdateGuestInfo} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="modal-first-name" className="block text-xs font-semibold text-foreground">
                      Prénom <span className="text-danger">*</span>
                    </label>
                    <input
                      id="modal-first-name"
                      type="text"
                      value={guestFirstName}
                      onChange={(e) => setGuestFirstName(e.target.value)}
                      disabled={savingIdentity}
                      className="w-full min-h-12 px-3.5 py-2 border border-transparent rounded-xl text-base sm:text-sm bg-surface-muted text-foreground focus:outline-none focus:border-primary focus:bg-surface transition"
                      placeholder="Ex : Paul"
                      required
                    />
          </div>
                  <div className="space-y-1">
                    <label htmlFor="modal-last-name" className="block text-xs font-semibold text-foreground">
                      Nom de famille
                    </label>
                    <input
                      id="modal-last-name"
                      type="text"
                      value={guestLastName}
                      onChange={(e) => setGuestLastName(e.target.value)}
                      disabled={savingIdentity}
                      className="w-full min-h-12 px-3.5 py-2 border border-transparent rounded-xl text-base sm:text-sm bg-surface-muted text-foreground focus:outline-none focus:border-primary focus:bg-surface transition"
                      placeholder="Ex : Kasongo"
                    />
        </div>
      </div>

                <div className="space-y-1">
                  <label htmlFor="modal-phone" className="block text-xs font-semibold text-foreground">
                    Numéro de téléphone / WhatsApp
                  </label>
                  <input
                    id="modal-phone"
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    disabled={savingIdentity}
                    className="w-full min-h-12 px-3.5 py-2 border border-transparent rounded-xl text-base sm:text-sm bg-surface-muted text-foreground focus:outline-none focus:border-primary focus:bg-surface transition"
                    placeholder="Ex : +243 812 345 678"
                  />
                  <p className="text-xs text-muted">Pour recevoir votre pass et votre place.</p>
              </div>

                {/* Préférences & Remarques */}
                <div className="pt-3 border-t border-border space-y-3">
                  <p className="font-display text-base font-semibold text-foreground">Préférences</p>

                  <div className="space-y-1">
                    <label htmlFor="modal-allergies" className="block text-xs font-semibold text-foreground">
                      Allergies ou régime
                  </label>
                    <input
                      id="modal-allergies"
                      type="text"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      disabled={savingIdentity}
                      className="w-full min-h-12 px-3.5 py-2 border border-transparent rounded-xl text-base sm:text-sm bg-surface-muted text-foreground focus:outline-none focus:border-primary focus:bg-surface transition"
                      placeholder="Ex : Sans arachides, sans gluten..."
                    />
                </div>

                  <div className="space-y-1">
                    <label htmlFor="modal-notes" className="block text-xs font-semibold text-foreground">
                      Un mot pour l&apos;organisateur
                  </label>
                  <textarea
                      id="modal-notes"
                    value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      disabled={savingIdentity}
                      className="w-full min-h-20 px-3.5 py-2.5 border border-transparent rounded-xl text-base sm:text-sm bg-surface-muted text-foreground focus:outline-none focus:border-primary focus:bg-surface transition"
                      placeholder="Une précision sur votre venue, accompagnement..."
                    rows={2}
                  />
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={savingIdentity}
                    onClick={() => setIsEditIdentityOpen(false)}
                    className="w-full sm:w-auto min-h-12 px-4 py-2.5 rounded-2xl text-sm font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition"
                  >
                    Annuler
                  </button>
                <button
                  type="submit"
                    disabled={savingIdentity}
                    className="w-full sm:w-auto min-h-12 px-5 py-2.5 rounded-2xl bg-primary-solid text-primary-foreground text-sm font-semibold hover:bg-primary-solid-hover transition flex items-center justify-center gap-2"
                >
                    {savingIdentity ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enregistrement…
                    </>
                  ) : (
                      'Enregistrer'
                  )}
                </button>
                </div>
              </form>
            </div>
        </div>
        )}
        </>
    );
  }

  return (
    <GuestPendingInvitationView
      guest={guest}
      guestId={guestId}
      rsvpStatus={rsvpStatus}
      setRsvpStatus={(status) => {
        setSubmitError('');
        setRsvpStatus(status);
      }}
      rsvpLocked={rsvpLocked}
      submitting={submitting}
      firstName={guestFirstName}
      setFirstName={setGuestFirstName}
      lastName={guestLastName}
      setLastName={setGuestLastName}
      phone={guestPhone}
      setPhone={setGuestPhone}
      additionalNotes={additionalNotes}
      setAdditionalNotes={setAdditionalNotes}
      customFieldValues={customFieldValues}
      setCustomFieldValues={setCustomFieldValues}
      onSubmit={handleSubmitRsvp}
      submitError={submitError}
    />
  );
}
