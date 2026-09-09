'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { downloadMedia, getMediaExtension, sanitizeFilenamePart } from '@/lib/downloadMedia';
import GuestPortalShell, { GuestPortalTabBar, GuestPortalCard, GuestHowTo } from '@/components/GuestPortalShell';
import Link from 'next/link';
import GuestGuidelinesView from '@/components/GuestGuidelinesView';
import type { ChairType, RoomLayoutBlueprint, RoomOutlineShape } from '@/lib/roomLayoutUtils';
import type { LightingPreset } from '@/lib/roomRenderQuality';
import { 
  Calendar, MapPin, CheckCircle2, AlertCircle,
  Loader2, Award, Image, Send, Heart, LayoutGrid, MessageCircle,
  ChevronLeft, ChevronRight, X, ThumbsUp, Download, Navigation,
  QrCode, Maximize2, Printer, User, UserCog, Pencil, Utensils, Sparkles,
  Ticket,
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
      console.error('Error fetching RSVP details:', err);
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
    if (!guestId) return;
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

      const res = await api.post(`/rsvp/${guestId}`, {
        firstName: guestFirstName.trim(),
        lastName: guestLastName.trim(),
        phone: guestPhone.trim() || null,
        rsvp: rsvpStatus,
        preferences: preferencesPayload,
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
                firstName: guestFirstName.trim(),
                lastName: guestLastName.trim(),
                phone: guestPhone.trim() || null,
                preferences: preferencesPayload,
              }
            : null,
        );
      }

      setIdentitySaveSuccess(true);
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
          <div className="bg-danger/10 text-danger p-4 rounded-[var(--radius-card)] w-16 h-16 flex items-center justify-center mx-auto border border-danger/25">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Invitation introuvable</h1>
          <p className="text-muted leading-relaxed text-sm">
            {error || 'Ce lien d’invitation est invalide ou a expiré.'}
          </p>
          <p className="text-xs text-muted">
            Demandez un nouveau lien à l’organisateur, ou ouvrez celui reçu par WhatsApp ou e-mail.
          </p>
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
          headerRight={
            <ShareButton
              title={`${guest.event.title} · Invitation`}
              text={`Invitation ${site.platformName} pour ${guest.firstName}.`}
              url={guestRsvpUrl(guestId)}
              className="!bg-surface border-border"
            />
          }
          contentClassName="space-y-5"
        >
          <GuestPortalCard className="text-center space-y-4 py-10">
            <h2 className="text-xl font-display font-semibold text-foreground tracking-tight">
              {guest.firstName}, nous avons bien noté votre absence.
            </h2>
            <p className="text-sm text-muted leading-relaxed max-w-sm mx-auto">
              Merci d&apos;avoir répondu. Tant que l&apos;organisateur n&apos;a pas verrouillé les réponses,
              vous pouvez encore changer d&apos;avis.
            </p>
            {!rsvpLocked && (
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="inline-flex items-center justify-center min-h-11 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
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
        { id: 'badge', label: 'Pass QR', shortLabel: 'QR', icon: <Award className="w-4 h-4" /> },
        { id: 'table', label: 'Ma table', shortLabel: 'Table', icon: <LayoutGrid className="w-4 h-4" /> },
        { id: 'route', label: 'Lieu', shortLabel: 'Lieu', icon: <Navigation className="w-4 h-4" /> },
        ...(hasDonations ? [{ id: 'donations', label: 'Faire un don', shortLabel: 'Don', icon: <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" /> }] : []),
        { id: 'guestbook', label: "Livre d'or", shortLabel: 'Livre', icon: <Heart className="w-4 h-4" /> },
        { id: 'feed', label: 'Actualités', shortLabel: 'Actu', icon: <MessageCircle className="w-4 h-4" /> },
      ];

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
          headerRight={
            <ShareButton
              title={`${guest.event.title} · Invitation`}
              text={`Invitation ${site.platformName} pour ${guest.firstName}.`}
              url={guestRsvpUrl(guestId)}
              className="!bg-surface border-border"
            />
          }
          tabs={
            <GuestPortalTabBar
              tabs={guestTabs}
              activeId={activeGuestTab}
              onChange={goGuestTab}
            />
          }
          contentClassName="space-y-5 pb-[calc(10.75rem+env(safe-area-inset-bottom))]"
        >
            <GuestHowTo
              steps={[
                'Montrez le pass QR à l’accueil',
                'Ouvrez Table pour votre place exacte',
                'Ouvrez Lieu pour l’itinéraire',
                ...(hasDonations ? ['Ouvrez Don pour soutenir la cause solidaire'] : []),
              ]}
            />
            {/* 1. BADGE & INFOS TAB */}
            <div id="guest-panel-badge" role="tabpanel" aria-labelledby="guest-tab-badge" hidden={activeGuestTab !== 'badge'}>
            {activeGuestTab === 'badge' && (
              <div className="space-y-6 animate-fade-in">
                <div className="em-guest-hero">
                  <div className="em-guest-hero__banner !py-4 !px-5">
                    <div className="relative z-[1] flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <h2 className="text-xl sm:text-2xl font-display font-semibold leading-tight tracking-tight text-white truncate">
                          Bonjour {guest.firstName} {guest.lastName}
                        </h2>
                        <p className="text-sm text-white/85 truncate">{guest.event.title}</p>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/15 border border-white/25 text-xs font-semibold text-white shrink-0">
                        Confirmé
                      </span>
                    </div>
                  </div>

                  <div className="px-5 py-7 sm:px-8 flex flex-col items-center gap-5 bg-surface">
                    <button
                      type="button"
                      onClick={() => setShowFullScreenQr(true)}
                      className="p-3 sm:p-4 bg-white rounded-2xl border border-border shadow-[0_16px_48px_rgba(15,23,42,0.1)] hover:scale-[1.02] active:scale-[0.98] transition-transform group relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      title="Agrandir le pass QR"
                    >
                      <img
                        src={getGuestQrImageUrl(guest.id, 280)}
                        alt={`Pass QR de ${guest.firstName} ${guest.lastName}`}
                        className="w-52 h-52 sm:w-60 sm:h-60"
                      />
                      <span className="absolute inset-0 rounded-2xl bg-black/5 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                          <Maximize2 className="w-3.5 h-3.5" aria-hidden />
                          Agrandir pour le scan
                        </span>
                      </span>
                    </button>

                    <div className="text-center space-y-3 w-full max-w-xs">
                      <p className="text-sm text-muted leading-snug">
                        Présentez ce QR à l&apos;accueil
                      </p>
                      <p className="text-xs text-muted tracking-widest">
                        {guest.id.split('-')[0]?.toUpperCase()}
                      </p>
                      <div className="flex items-center justify-center gap-4 text-xs text-muted pt-1">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-primary" aria-hidden />
                          {new Date(guest.event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                        <span className="text-border" aria-hidden>·</span>
                        <span>
                          {new Date(guest.event.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowFullScreenQr(true)}
                          className="flex-1 inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                        >
                          <Maximize2 className="w-4 h-4" aria-hidden />
                          Pass plein écran
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIdentitySaveError('');
                            setIdentitySaveSuccess(false);
                            setIsEditIdentityOpen(true);
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl border border-border bg-surface text-sm font-semibold text-foreground hover:bg-surface-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                        >
                          <UserCog className="w-4 h-4 text-primary" aria-hidden />
                          Modifier mes infos
                        </button>
                        <Link
                          href={`/rsvp/${guestId}/print`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl border border-border bg-surface text-sm font-semibold text-foreground hover:bg-surface-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                        >
                          <Printer className="w-4 h-4" aria-hidden />
                          Imprimer
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bandeau d'invitation partagée ou personnalisation */}
                <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      {guest.firstName?.toLowerCase().startsWith('invité')
                        ? 'Billet ou invitation partagée ?'
                        : 'Personnaliser ce billet'}
                    </p>
                    <p className="text-xs text-foreground/85 leading-relaxed">
                      {guest.firstName?.toLowerCase().startsWith('invité')
                        ? 'Ce lien vous a été transmis ? Vous pouvez inscrire votre propre nom et vos coordonnées sur ce badge.'
                        : 'Vous pouvez modifier le nom, numéro de téléphone et préférences alimentaires figurant sur votre pass à tout moment.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIdentitySaveError('');
                      setIdentitySaveSuccess(false);
                      setIsEditIdentityOpen(true);
                    }}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover shadow-xs active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Changer mes coordonnées
                  </button>
                </div>

                {/* Carte de placement assigné (très visible pour les billets payés et invités placés) */}
                {(guest.ticketPlacement?.isAssigned || guest.tableDetails?.tableName) && (
                  <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5 space-y-3.5 text-left shadow-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
                        <LayoutGrid className="w-3.5 h-3.5 text-primary" />
                        <span>Votre place réservée</span>
                      </span>
                      {guest.ticketPlacement?.zoneName && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface border border-border">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>{guest.ticketPlacement.zoneName}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-[11px] uppercase font-bold text-muted tracking-wider">Table assignée</p>
                        <p className="text-lg sm:text-xl font-display font-bold text-foreground truncate">
                          {guest.ticketPlacement?.tableName || guest.tableDetails?.tableName || 'Table assignée'}
                        </p>
                      </div>

                      {(guest.ticketPlacement?.seatNumber != null || guest.tableDetails?.seatIndex != null) && (
                        <div className="rounded-xl px-4 py-2 border border-primary/30 bg-surface text-center shrink-0 shadow-xs">
                          <p className="text-[10px] uppercase font-bold text-muted tracking-wider">Siège</p>
                          <p className="text-lg sm:text-xl font-black text-primary tabular-nums">
                            n° {guest.ticketPlacement?.seatNumber ?? ((guest.tableDetails?.seatIndex ?? 0) + 1)}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-1 flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => goGuestTab('table')}
                        className="flex-1 inline-flex items-center justify-center gap-2 min-h-11 py-2 px-3.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover transition shadow-sm"
                      >
                        <LayoutGrid className="w-4 h-4" />
                        <span>Voir ma place sur le plan (2D / 3D)</span>
                      </button>
                      {guest.seatingInvitationPdfUrl && (
                        <a
                          href={guest.seatingInvitationPdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 min-h-11 py-2 px-3 rounded-xl border border-border bg-surface text-xs font-semibold text-foreground hover:bg-surface-muted transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Si l'invité a acheté un billet mais sans placement de table encore attribué */}
                {guest.ticketPlacement?.hasTicket && !guest.ticketPlacement?.isAssigned && !guest.tableDetails?.tableName && (
                  <div className="rounded-2xl border border-border bg-surface-muted/40 p-4 space-y-2 text-left">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-border text-xs font-bold text-foreground">
                        <Ticket className="w-3.5 h-3.5 text-primary" />
                        <span>Billet confirmé</span>
                      </span>
                      {guest.ticketPlacement?.zoneName && (
                        <span className="text-xs font-semibold text-primary">
                          Zone {guest.ticketPlacement.zoneName}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Votre billet est validé. Votre table et votre numéro de place précis vous seront indiqués par l&apos;équipe d&apos;accueil à votre entrée dans la salle.
                    </p>
                  </div>
                )}

                {/* Bandeau de campagne solidaire si les dons sont activés */}
                {hasDonations && guest.donations && (
                  <div className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4 sm:p-5 space-y-3 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/25 text-rose-700 dark:text-rose-300 text-xs font-bold">
                        <Heart className="w-3 h-3 fill-rose-500/30" />
                        Campagne de dons solidaires
                      </span>
                      {guest.donations.progressPercent != null && (
                        <span className="text-xs font-bold text-rose-700 dark:text-rose-300 tabular-nums">
                          {guest.donations.progressPercent}% collectés
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-foreground">
                        {guest.donations.cause || 'Soutenez la cause solidaire de l’événement'}
                      </h4>
                      <p className="text-xs text-muted leading-relaxed">
                        Vous pouvez faire un don solidaire à montant libre directement via Mobile Money ou Carte bancaire.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => goGuestTab('donations')}
                      className="w-full inline-flex items-center justify-center gap-2 min-h-11 py-2.5 px-4 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition shadow-sm dark:bg-rose-600 dark:hover:bg-rose-700"
                    >
                      <Heart className="w-3.5 h-3.5 fill-white" />
                      <span>Faire un don solidaire</span>
                    </button>
                  </div>
                )}

                <section className="space-y-4 px-0.5">
                  <div>
                    <h3 className="font-display font-semibold text-foreground text-base tracking-tight">
                      {guest.event.title}
                    </h3>
                    {guest.event.description?.trim() ? (
                      <p className="mt-2 text-muted text-sm leading-relaxed whitespace-pre-line">
                        {guest.event.description}
                      </p>
                    ) : null}
                        </div>

                  <ul className="space-y-3 text-sm text-muted">
                    <li className="flex items-start gap-3">
                      <Calendar className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden />
                      <span>
                        <span className="font-semibold text-foreground block">Date & heure</span>
                        {new Date(guest.event.date).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden />
                      <span>
                        <span className="font-semibold text-foreground block">Lieu</span>
                          {guest.event.location}
                      </span>
                    </li>
                  </ul>

                  {guest.event.location ? (
                    <button
                      type="button"
                      onClick={() => goGuestTab('route')}
                      className="w-full inline-flex items-center justify-center gap-2 min-h-11 py-2.5 rounded-xl border border-border bg-surface text-sm font-semibold text-foreground hover:bg-surface-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    >
                      <Navigation className="w-4 h-4 text-primary" aria-hidden />
                      Guide jusqu&apos;au lieu
                    </button>
                  ) : null}
                </section>

                <GuestGuidelinesView
                  guidelines={guest.event.guestGuidelines}
                  className="pt-1"
                />

                {!rsvpLocked && (
                  <div className="space-y-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIdentitySaveError('');
                        setIdentitySaveSuccess(false);
                        setIsEditIdentityOpen(true);
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 min-h-11 py-2.5 rounded-xl border border-primary/30 bg-primary/5 text-sm font-semibold text-primary hover:bg-primary/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    >
                      <UserCog className="w-4 h-4" />
                      Modifier mes coordonnées et préférences
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubmitted(false)}
                      className="w-full min-h-11 py-2.5 border border-border bg-surface hover:bg-surface-muted text-muted font-semibold rounded-xl text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    >
                      Modifier ma réponse (présence / absence)
                    </button>
                  </div>
                )}
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
                <div className="px-1 space-y-2">
                  <h2 className="text-lg font-display font-semibold leading-snug tracking-tight text-foreground">
                    Votre table
                  </h2>
                  <GuestHowTo
                    steps={[
                      'Votre table est marquée sur le plan',
                      'Basculez 2D ou 3D selon votre préférence',
                      'Touchez une table pour voir les détails',
                    ]}
                  />
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
                <div className="space-y-1 px-1">
                  <h3 className="font-display font-semibold text-foreground text-base">Livre d&apos;or</h3>
                  <p className="text-muted text-xs leading-relaxed">
                    Adressez un mot ou des photos aux organisateurs. Visible par les autres invités.
                  </p>
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

                <form onSubmit={handleSubmitGuestbook} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="guestbook-message" className="block text-xs font-semibold text-foreground">
                      Votre message
                    </label>
                    <textarea
                      id="guestbook-message"
                      value={guestbookMessage}
                      onChange={(e) => setGuestbookMessage(e.target.value)}
                      placeholder="Ex. : Merci pour cette belle invitation…"
                      rows={4}
                      className="w-full min-h-[6.5rem] px-4 py-3 bg-surface border border-border shadow-[var(--shadow-soft)] rounded-[var(--radius-card)] text-base sm:text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none text-foreground placeholder:text-muted"
                    />
                  </div>

                  {/* Previews of uploaded guestbook photos */}
                  {guestbookPhotos.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-muted uppercase tracking-wider block">
                        Photos sélectionnées ({guestbookPhotos.length})
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

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <label className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3 py-2 bg-surface-muted hover:bg-surface-muted text-foreground/80 font-semibold rounded-xl text-xs cursor-pointer transition touch-manipulation">
                      <Image className="w-4 h-4 text-primary" aria-hidden />
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
                      className="inline-flex items-center justify-center gap-1.5 min-h-11 px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground font-semibold rounded-xl text-xs transition shadow-md shadow-primary/20 touch-manipulation"
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
                      <p className="text-xs text-muted">Chargement des messages…</p>
                    </div>
                  ) : guestbookShares.length === 0 ? (
                    <div className="text-center py-8 bg-surface-muted/40 rounded-[var(--radius-card)] border border-border p-4 space-y-1">
                      <p className="text-sm font-semibold text-foreground">Aucun message pour l’instant</p>
                      <p className="text-muted text-xs">Écrivez le premier mot ci-dessus pour ouvrir le livre d&apos;or.</p>
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
                <div className="space-y-1">
                  <h3 className="font-semibold text-foreground text-sm">Actualités</h3>
                  <p className="text-muted text-xs leading-relaxed">
                    Annonces et photos de l&apos;organisateur. Pour un message personnel, utilisez le livre d&apos;or.
                  </p>
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
                    <div className="inline-flex items-center justify-center bg-primary/10 p-5 rounded-[var(--radius-card)] text-primary">
                      <MessageCircle className="w-8 h-8" />
                    </div>
                    <h4 className="font-semibold text-foreground text-sm">Pas encore de publication</h4>
                    <p className="text-muted text-xs">
                      Les annonces de l&apos;organisateur apparaîtront ici dès qu&apos;elles seront publiées.
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
                          <div className="border-t border-border pt-3.5 space-y-4">
                            <h4 className="font-semibold text-muted text-xs uppercase tracking-wider flex items-center gap-1.5">
                              <MessageCircle className="w-3.5 h-3.5 text-muted" />
                              Commentaires ({post.comments.length})
                            </h4>

                            {post.comments.length > 0 && (
                              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                                {post.comments.map((comment: any) => (
                                  <div key={comment.id} className="bg-surface border border-border shadow-[var(--shadow-soft)] p-3 rounded-[var(--radius-card)] text-[11px] space-y-1">
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
                                  placeholder="Ex. : Super photo !"
                                value={guestCommentContents[post.id] || ''}
                                onChange={(e) => setGuestCommentContents({ ...guestCommentContents, [post.id]: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCreateGuestComment(post.id);
                                }}
                                  className="w-full min-h-11 px-3.5 py-2.5 bg-surface border border-border shadow-[var(--shadow-soft)] rounded-xl text-base sm:text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-foreground placeholder:text-muted"
                              />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCreateGuestComment(post.id)}
                                disabled={guestCommentSubmitting[post.id] || !guestCommentContents[post.id]?.trim()}
                                className="p-2.5 min-h-11 min-w-11 inline-flex items-center justify-center bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground rounded-xl transition shadow-sm"
                                aria-label="Publier le commentaire"
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

        {/* Bouton sticky Pass Express — au-dessus de la barre d’onglets + safe-area */}
        <div className="fixed left-1/2 -translate-x-1/2 z-30 w-full max-w-sm px-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] pointer-events-none">
          <button
            type="button"
            onClick={() => setShowFullScreenQr(true)}
            className="pointer-events-auto w-full min-h-14 py-3 px-4 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-between gap-3 border border-primary/40 active:scale-[0.98] transition-all hover:bg-primary-hover cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 shrink-0 rounded-xl bg-white/15 text-white flex items-center justify-center font-bold text-xs ring-1 ring-white/25">
                <QrCode className="w-4 h-4" aria-hidden />
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-bold leading-tight truncate">Mon Pass d&apos;entrée QR</p>
                <p className="text-xs text-white/80 truncate">
                  {guest.ticketPlacement?.tableName || guest.tableDetails?.tableName
                    ? `${guest.ticketPlacement?.tableName || guest.tableDetails?.tableName}${
                        (guest.ticketPlacement?.seatNumber != null || guest.tableDetails?.seatIndex != null)
                          ? ` • Place ${guest.ticketPlacement?.seatNumber ?? ((guest.tableDetails?.seatIndex ?? 0) + 1)}`
                          : ''
                      }`
                    : 'Ouvrir le pass pour l’accueil'}
                </p>
              </div>
            </div>
            <span className="hidden min-[380px]:inline text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-lg text-white shrink-0">
              Ouvrir
            </span>
            <Maximize2 className="w-4 h-4 shrink-0 opacity-90 min-[380px]:hidden" aria-hidden />
          </button>
        </div>

        {/* Modal QR Code Plein Écran & Contraste Élevé pour le scan d'accueil */}
        {showFullScreenQr && (
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
              className="bg-surface rounded-3xl p-6 sm:p-8 text-center max-w-sm w-full shadow-2xl space-y-4 animate-scale-up border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-1">
                <h3 id="guest-pass-qr-title" className="text-xl font-bold text-foreground">
                  {guest.firstName} {guest.lastName}
                </h3>
              </div>

              {(guest.ticketPlacement?.isAssigned || guest.tableDetails?.tableName) && (
                <div className="py-2.5 px-4 rounded-xl bg-surface-muted border border-border text-left">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase font-bold text-muted tracking-wider">Placement assigné</p>
                    {guest.ticketPlacement?.zoneName && (
                      <span className="text-xs font-semibold text-primary">
                        Zone {guest.ticketPlacement.zoneName}
                      </span>
                    )}
                  </div>
                  <p className="text-base font-extrabold text-foreground">
                    {guest.ticketPlacement?.tableName || guest.tableDetails?.tableName}
                    {(guest.ticketPlacement?.seatNumber != null || guest.tableDetails?.seatIndex != null)
                      ? ` • Siège n° ${guest.ticketPlacement?.seatNumber ?? ((guest.tableDetails?.seatIndex ?? 0) + 1)}`
                      : ''}
                  </p>
                </div>
              )}

              {/* Fond blanc volontaire : contraste maximal pour le scan d'accueil */}
              <div className="p-4 bg-white border-2 border-foreground rounded-2xl inline-block shadow-inner">
                <img
                  src={getGuestQrImageUrl(guest.id, 320)}
                  alt={`Pass QR de ${guest.firstName} ${guest.lastName}`}
                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
                />
              </div>

              <p className="text-xs text-muted leading-snug">
                Présentez ce QR Code directement à l&apos;équipe d&apos;accueil à l&apos;entrée de la salle.
              </p>

              <button
                type="button"
                onClick={closeFullScreenQr}
                className="w-full min-h-11 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover transition"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {/* Modal Modification des coordonnées de l'invité */}
        {isEditIdentityOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-identity-title"
          >
            <div
              ref={editModalPanelRef}
              className="bg-surface border border-border rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <UserCog className="w-5 h-5" aria-hidden />
                  </div>
                  <div>
                    <h3 id="edit-identity-title" className="text-base font-bold text-foreground">
                      Modifier mes coordonnées
                    </h3>
                    <p className="text-xs text-muted">
                      Ce nom figurera sur votre pass QR, votre siège et à l&apos;accueil.
                    </p>
                  </div>
                </div>
                <button
                  ref={editModalCloseRef}
                  type="button"
                  disabled={savingIdentity}
                  onClick={() => setIsEditIdentityOpen(false)}
                  className="min-h-11 min-w-11 inline-flex items-center justify-center p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface-muted transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 text-xs font-semibold flex items-center gap-2" role="status">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Vos informations ont été enregistrées avec succès.
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
                      className="w-full min-h-11 px-3 py-2 border border-border rounded-xl text-sm bg-surface text-foreground focus:outline-primary"
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
                      className="w-full min-h-11 px-3 py-2 border border-border rounded-xl text-sm bg-surface text-foreground focus:outline-primary"
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
                    className="w-full min-h-11 px-3 py-2 border border-border rounded-xl text-sm bg-surface text-foreground focus:outline-primary"
                    placeholder="Ex : +243 812 345 678"
                  />
                  <p className="text-[11px] text-muted">
                    Utilisé pour vous transmettre votre badge et les notifications de placement.
                  </p>
                </div>

                {/* Préférences & Remarques */}
                <div className="pt-2 border-t border-border space-y-3">
                  <p className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5 text-primary" />
                    Préférences & remarques
                  </p>

                  <div className="space-y-1">
                    <label htmlFor="modal-allergies" className="block text-xs font-semibold text-foreground">
                      Allergies ou régimes particuliers
                    </label>
                    <input
                      id="modal-allergies"
                      type="text"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      disabled={savingIdentity}
                      className="w-full min-h-11 px-3 py-2 border border-border rounded-xl text-sm bg-surface text-foreground focus:outline-primary"
                      placeholder="Ex : Sans arachides, sans gluten..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="modal-notes" className="block text-xs font-semibold text-foreground">
                      Message / Remarques pour l&apos;organisateur
                    </label>
                    <textarea
                      id="modal-notes"
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      disabled={savingIdentity}
                      className="w-full min-h-20 px-3 py-2 border border-border rounded-xl text-sm bg-surface text-foreground focus:outline-primary"
                      placeholder="Une précision sur votre venue, accompagnement..."
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    disabled={savingIdentity}
                    onClick={() => setIsEditIdentityOpen(false)}
                    className="w-full sm:w-auto min-h-11 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={savingIdentity}
                    className="w-full sm:w-auto min-h-11 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover shadow-sm transition flex items-center justify-center gap-2"
                  >
                    {savingIdentity ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enregistrement…
                      </>
                    ) : (
                      'Enregistrer mes coordonnées'
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
